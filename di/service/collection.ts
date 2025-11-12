import { getAllAttributes, getAttribute, isFunction } from "@azera/reflect";
import { Inject } from "./attributes";

export type Constructor<T = any> = new (...args: any[]) => T;
export type ServiceFactory<T = any> = (sp: ServiceProvider) => T;

export enum ServiceLifetime {
    Singleton,
    Scoped,
    Transient
}

interface ServiceDescriptor {
    lifetime: ServiceLifetime;
    implementation: Constructor | ServiceFactory;
    instance?: any;
}

export class ServiceCollection {
    private readonly services = new Map<any, ServiceDescriptor[]>();

    add<T>(token: any, implementation: Constructor<T> | ServiceFactory<T>, lifetime: ServiceLifetime): ServiceCollection {
        const list = this.services.get(token) ?? [];

        list.push({ lifetime, implementation });
        this.services.set(token, list);

        return this;
    }

    addSingleton<T>(token: Constructor<T>): ServiceCollection
    addSingleton<T>(token: any, implementation: ServiceFactory<T>): ServiceCollection
    addSingleton<T>(token: any, implementation: Constructor<T> | ServiceFactory<T>): ServiceCollection
    addSingleton<T>(token: any, implementation?: any): ServiceCollection {
        return this.add(token, implementation ?? token, ServiceLifetime.Singleton);
    }

    addScoped<T>(token: Constructor<T>): ServiceCollection
    addScoped<T>(token: any, implementation: ServiceFactory<T>): ServiceCollection
    addScoped<T>(token: any, implementation: Constructor<T> | ServiceFactory<T>): ServiceCollection
    addScoped<T>(token: any, implementation?: any): ServiceCollection {
        return this.add(token, implementation ?? token, ServiceLifetime.Scoped);
    }

    addTransient<T>(token: Constructor<T>): ServiceCollection
    addTransient<T>(token: any, implementation: ServiceFactory<T>): ServiceCollection
    addTransient<T>(token: any, implementation: Constructor<T> | ServiceFactory<T>): ServiceCollection
    addTransient<T>(token: any, implementation?: any): ServiceCollection {
        return this.add(token, implementation ?? token, ServiceLifetime.Transient);
    }

    buildServiceProvider(): ServiceProvider {
        return new ServiceProvider(new Map(this.services));
    }
}

export class ServiceProvider {
    private scopedInstances = new Map<any, any>();

    constructor(
        private readonly services: Map<any, ServiceDescriptor[]>,
        private readonly parentScope?: ServiceProvider // for child scopes
    ) { }

    /** Create a new scoped provider */
    createScope(): ServiceProvider {
        return new ServiceProvider(this.services, this);
    }

    tryGet<T>(token: any): T | undefined {
        const descriptors = this.services.get(token);
        if (!descriptors || descriptors.length === 0)
            return undefined;
        return this.get(token);
    }

    get<T>(token: Constructor<T>): T
    get<T>(token: any): T
    {
        const descriptors = this.services.get(token);

        if (!descriptors || descriptors.length === 0)
            throw new Error(`Service not registered: ${token.toString()}`);

        if (descriptors.length > 1) {
            return descriptors.map(d => this.resolveDescriptor(d)) as any;
        }

        return this.resolveDescriptor(descriptors[0]!);
    }

    getAll<T>(token: any): T[] {
        let result = this.tryGet(token);
        if (!Array.isArray(result))
            result = [result];
        return result as T[];
    }

    private resolveDescriptor<T>(descriptor: ServiceDescriptor): T {
        switch (descriptor.lifetime) {
            case ServiceLifetime.Singleton:
                if (!descriptor.instance)
                    descriptor.instance = this.createInstance(descriptor.implementation);
                return descriptor.instance;

            case ServiceLifetime.Scoped:
                // Try to get from current scope or parent scope
                if (this.scopedInstances.has(descriptor))
                    return this.scopedInstances.get(descriptor);
                const instance = this.createInstance(descriptor.implementation);
                this.scopedInstances.set(descriptor, instance);
                return instance;

            case ServiceLifetime.Transient:
                return this.createInstance(descriptor.implementation);
        }
    }

    private createInstance<T>(impl: Constructor<T> | ServiceFactory<T>): T {
        if (typeof impl === "function" && !impl.prototype?.constructor) {
            // Factory function
            return (impl as ServiceFactory<T>)(this);
        }

        const ctor = impl as Constructor<T>;
        const paramTypes: any[] = Reflect.getMetadata("design:paramtypes", ctor) || [];

        const dependencies = paramTypes.map((dep, index) => {
            if (dep === Array) {
                const inject = getAttribute(Inject, ctor, "constructor", index);
                if (!inject)
                    throw Error(
                        `Array injection requires an explicit @Inject(ServiceType) decorator, e.g. @Inject(Middleware)`
                    );
                if (!inject.value.service)
                    throw Error(`Inject service not defined for array injection`);
                return this.getAll(inject.value.service);
            }
            return this.get(dep);
        });

        const instance = new ctor(...dependencies);

        const attribtues = getAllAttributes(ctor);
        console.log(attribtues);

        // Property resolution
        Object.keys(instance as object).forEach(propName => {
            let inject = getAttribute(Inject, instance as object, propName);

            if (inject) {
                (instance as any)[propName] = this.get(inject.value.service ?? inject.type);
            }
        });

        return instance;
    }
}
