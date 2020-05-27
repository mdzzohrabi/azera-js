import { Bundle } from "./Bundle";
import { Invokable } from '@azera/container/build/types';
import { Kernel } from './Kernel';
import { Logger } from './Logger';
import { Container, Inject } from '@azera/container';
import { ConfigSchema } from './ConfigSchema';
import { Command } from './bundle/cli';

export function newKernel(env?: string) {
    return new KernelBuilder(env);
}

export function newBundle(name: string) {
    return new BundleBuilder(name);
}

export class KernelBuilder extends Kernel {
    constructor(public env?: string) {        
        super(env, []);
    }

    newBundle(name: string) {
        return new BundleBuilder(name);
    }

    useCli() {
        import('./bundle/cli').then(cli => {
            this.addBundle(new cli.CliBundle);
        })
        return this;
    }

    addBundle(bundle: Bundle) {
        let { container } = this;

        this.bundles.push(bundle);

        // Set alias for bundles in container
        this.container.add(bundle.constructor); 
        this.container.setAlias(bundle.constructor, bundle);

        // Set bundles names as container parameter
        container.setParameter( 'kernel.bundles' , this.bundles.map(bundle => 
            (bundle.constructor as any).bundleName || bundle.constructor.name ));

        // Initialize bundles
        container.invoke(Logger).debug(`Initialize ${bundle.bundleName}`);
        container.invoke(bundle, 'init');

        return this;
    }
}

export class BundleBuilder extends Bundle {

    private onInits: any[] = [];
    private onRuns: any[] = [];
    private services: Function[] = [];

    constructor(name: string) {
        super();
        Object.defineProperty(this, 'bundleName', { value: name });
    }

    @Inject() async init(serviceContainer: Container) {
        for (let init of this.onInits) {
            await serviceContainer.invokeAsync(init);
        }
    }

    @Inject() async run(serviceContainer: Container) {
        for (let onRun of this.onRuns) {
            await serviceContainer.invokeAsync(onRun);
        }
    }

    command(name: string, action: Invokable<any>, description?: string) {
        this.services.push(class extends Command {
            constructor(private serviceContainer: Container) { super() }
            description: string = description ?? '';
            name: string = name;
            async run() {
                await this.serviceContainer.invokeAsync(action);
            }
        });
        return this;
    }

    configureSchema(schemaFn: (schema: ConfigSchema) => void) {
        return this.onInit([
            ConfigSchema,
            schemaFn
        ]);
    }

    onInit(initFn: Invokable<any>) {
        this.onInits.push(initFn);
        return this;
    }

    getServices() {
        return this.services;
    }

    onRun(runFn: Invokable<any>) {
        this.onRuns.push(runFn)
        return this;
    }
}