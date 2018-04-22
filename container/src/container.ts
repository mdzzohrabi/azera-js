import { ContainerValue, Factory, IContainer, IDefinition, Service, Injectable, IAutoTagger, IInternalDefinition, Constructor, MockMethod, Invokable, InjectableFunction, IFactory, FunctionOf, IMethod } from "./types";
import { ok } from "assert";
import { forEach, is, parseFunction } from "@azera/util";
import { getParameters } from "@azera/reflect";
import { HashMap } from "@azera/util/is";
import { hasDefinition, getDefinition, getTarget, setDefinition, DEF, extendDefinition } from "./decorators";
import { WSASERVICE_NOT_FOUND } from "constants";

const FACTORY_REGEX = /.*Factory$/;

// export class ServiceError extends Error {
//     constructor() {
//         super();
//     }
// }

export class ServiceNotFoundError extends Error {
    constructor(name: string, stack = []) {
        super(`Service ${name} not found${ stack.length > 0 ? ', Stack: ' + stack.join(' -> ') : '' }.`);
    }
}

interface IInvokeOptions {
    context?: any;
    override?: IDefinition;
}

export class Container implements IContainer {

    static isInheritedServiceDecorator(target: Function): boolean {
        return target[DEF] && !target.hasOwnProperty(DEF);
        // return ( getDefinition(target) as IInternalDefinition ).$target !== target;
    }

    static checkInheritance(target: Function) {
        if ( Container.isInheritedServiceDecorator(target) ) {
            let def = <IInternalDefinition>getDefinition(target);
            def.$target = target;
            def.inherited = false;
            def.name = target.name;
            def.service = target;
            def.parameters = getDependencies(target).deps;
            setDefinition(target, def);
        }
    }

    // Cache for invoked services
    private instances: HashMap<any> = {};
    private params: HashMap<any> = {};
    private services: HashMap<IDefinition> = {};
    private autoTags: IAutoTagger[] = [];
    private factories = new WeakMap <any, Factory>();

    constructor(services?: HashMap<Service> , parameters?: HashMap<any> , autoTags?: IAutoTagger[]) {
        if ( autoTags ) this.autoTags = autoTags;
        if ( services ) this.set(services);
        if ( parameters ) this.params = parameters;

        this.set('serviceContainer', function containerFactory() {
            return this;
        });

        // Get container
        this.setFactory(Container, () => this);

    }

    /**
     * Invoke a factory
     * 
     * @param factory Factory
     * @param _stack  Stack
     * @internal
     */
    private buildFromFactory <T>(factory: Factory<T>, _stack = []): T {
        let result, override = { isFactory: false, invoke: true };
        
        if ( is.Class(factory) ) {
            let context = this._invoke(factory, _stack);
            result = this._invoke(Method(context, 'create') , _stack, { context, override });
        } else if ( is.Function(factory) ) {
            result = this._invoke(factory, _stack, { context: this, override });
        } else if ( is.Object(factory) && 'create' in factory ) {
            result = this._invoke(Method(factory, 'create') , _stack, { context: this, override });
        } else {
            throw Error(`Factory must be Function or instanceOf IFactory`);
        }

        return result;
    }

    /**
     * Creation happens here
     * 
     * @param definition    Service definition
     * @param _stack        Resolving stack
     * @param options       Options
     * @internal
     */
    private resolveDefinition(definition: IDefinition, _stack, options?: IInvokeOptions) {

        let { context, override }: IInvokeOptions = options || {};
        let service = override ? Object.assign(definition, override) : definition;
        let name = service.name;
        let result;

        // Factory
        if ( this.factories.has(service.service) ) {
            result = this.buildFromFactory( this.factories.get(service.service), _stack );
        } else {

            ok( is.Array(service.parameters || []), `Service ${name} parameters must be array, ${ service.parameters } given` );

            let resolvedParameters = ( service.parameters || [] ).map( dep => this._invoke(dep, _stack, options) );
            let target = service.service;

            // Factory
            if ( service.isFactory ) {
                result = this.buildFromFactory(target as any, _stack);
            }
            // Service
            else
            {

                if ( service.invoke || !is.Newable(target) ) {
                    return target.apply( context || target, resolvedParameters);
                }

                result = new ( target as any )( ...resolvedParameters );
                // Properties
                if ( service.properties ) {
                    forEach(service.properties, ( dep, key ) => {

                        if ( is.String(dep) || is.Function(dep) ) {
                            dep = { name: dep };
                        }

                        if ( dep.lateBinding ) {
                            let resolved;
                            Object.defineProperty(result, key, {
                                get: () => resolved || ( resolved = this._invoke(dep['name'], _stack, options) )
                            });
                        } else {
                            result[key] = this._invoke(dep.name, _stack, options);
                        }
                    });
                }
            }

        }

        // Shared services
        if ( !service.private ) {
            this.instances[ name ] = result;
        }

        return result;
    }

    private getService <T>(name: string, stack = []): T {
        let service: IDefinition;

        if (service = this.services[name]) {
            try {
                return this.resolveDefinition( service, stack );
            } catch ( err ) {
                if ( err instanceof Error ) {
                    err.message += ', Stack: ' + stack.join(' -> ') + '.';
                    throw err;
                }
            }
        }

        throw new ServiceNotFoundError(name, stack);
    }

    private _get <T>(name: string, stack = []): T {

        stack = [].concat(stack);
        stack.push(name);

        // Cached
        if ( this.instances[name] ) return this.instances[name];

        // Tags
        if ( name.substr(0,2) == '$$' ) return this.findByTag( name.substr(2) ).map( service => this._get(service.name, stack) ) as any;
        // Parameter
        else if ( name.substr(0,1) == '$' ) return this.getParameter(name.substr(1)) as any;
        // Parameter
        else if (this.params[name]) return this.params[name];

        return this.getService <T>(name, stack);
    }

    /**
     * Get a service or parameter
     * @param {string} name
     * @returns {T}
     */
    get<T>(name: string): T {
        return this._get <T>(name);
    }

    getByTag<T>(tag: string): T[] {
        return this.findByTag(tag).map( definition => {
            return this._get(definition.name);
        });
    }

    findByTag(tag: string): IDefinition[] {
        let services = [];
        forEach(this.services, service => {
            if ( service.tags.includes(tag) )
                services.push( service );
        });
        return services;
    }

    invokeLater <T extends object, M extends keyof T>(context: T, method?: M): MockMethod<T, M>;
    invokeLater(context, method?): Function
    {
        if ( Reflect.hasMetadata("design:paramtypes", context, method) ) {
            let types: any[] = Reflect.getMetadata("design:paramtypes", context, method);
            let params = getParameters(context[method]);
            let endOfDep = false;
            let deps = types.map((type, i) => {
                if ( isInternalClass(type) ) {
                    endOfDep = true;
                    return null;
                }
                if ( endOfDep ) throw Error(`Dependencies must come first in method ${method}`);
                return type;
            }).filter( dep => !!dep );

            let resolved: any[];

            return (...params) => {
                return context[method].apply( context, ( resolved ? resolved : resolved = deps.map( dep => this._invoke(dep) ) ).concat(params) );
            };

        } else {
            throw Error(`Cannot get parameters types from method ${method}`);
        }
    }

    /**
     * Invoke a function and resolve its dependencies
     */
    invoke<T>(value: Invokable<T>): T
    {
        return this._invoke(value);
    }

    private _invoke <T>(value: Invokable<T>, stack = [], options?: IInvokeOptions ): T {

        // String
        if ( is.String(value) ) return this._get(value, stack);

        // Function or Class
        if ( is.Function(value) || isMethod(value) ) {
            let def = this.getDefinition(value);
            if ( this.instances[def.name] ) return this.instances[def.name];
            return this.resolveDefinition(def, [], options);
        }

        // Any other things
        return value as any;
    }


    setParameter(name: string, value): this {
        this.params[name] = value;
        return this;
    }

    setFactory(type: Function, factory: Factory) {
        this.factories.set(type, factory);
        delete this.instances[ getDefinition(type).name ];
        return this;
    }

    /**
     * Set services or parameters
     */
    set(values: { [name: string]: ContainerValue }): this;
    set(name: string, value: ContainerValue | IDefinition): this;
    set(...params) {

        // Collection of values
        if (is.HashMap<ContainerValue>(params[0]))
            return forEach(params[0], (value, name) => this.set(name, value));

        let [name, value] = params;

        if (isDefinition(value)) this.addDefinition(Object.assign({ private: false, tags: [] }, value, { name }));
        else if ( is.Function(value) || is.Array(value) ) {
            let { func, deps } = getDependencies( value );
            this.addDefinition({
                name,
                service: func,
                parameters: deps,
                isFactory: isFactory(func),
                private: false,
                tags: []
            });
        }
        else this.setParameter(name, value);

        return this;
    }


    getDefinition(target: string | Function | IMethod): IDefinition {

        if ( is.Function(target) ) {
            let def = getDefinition(target) as IInternalDefinition;
            Container.checkInheritance(target);
            return def;

        } else if ( isMethod(target) ) {

            let method = target.context[ target.method ];
            let def = getDefinition(method, target.context);
            Container.checkInheritance( def.service );
            return def;

        } else if ( !is.String(target) ) {
            throw TypeError(`getDefinition only accepts function or string.`);
        }

        if ( !this.services[target] ) {
            throw new ServiceNotFoundError(target);
        }

        return this.services[target];
    }

    addDefinition(definition: IDefinition): this {
        // Defaults
        definition = Definition(definition);

        // Service decorated definition
        if ( hasDefinition( definition.service ) ) {
            definition = Object.assign( getDefinition(definition.service), definition );
        }

        // Auto tagging
        if ( (definition.tags || []).length == 0 )
            this.autoTags.forEach( tagger => {
                definition.tags = [].concat( definition.tags || [] , tagger(definition) || [] );
            });


        delete this.instances[definition.name];
        this.services[definition.name] = definition;
        return this;
    }

    getParameter(name: string) {
        if ( this.hasParameter(name) ) return this.params[name];
        throw Error(`Parameter ${name} not found`);
    }

    hasParameter(name: string): boolean {
        return !!this.params[name];
    }

    has(name: string): boolean {
        return !!this.services[name];
    }

    autoTag(tagger: IAutoTagger): this;
    autoTag(base: Function, tags: string[]): this;
    autoTag(...params): this
    {
        if ( params[1] ) {
            this.autoTags.push( def => def.service.prototype instanceof params[0] ? params[1] : [] );
        } else {
            this.autoTags.push( params[0] );
        }
        return this;
    }

    /**
     * Declare a class or function to container
     */
    add(...services: Function[]) {
        services.forEach( service => {
            let definition = this.getDefinition(service);
            this.set( definition.name, definition );
        });
        return this;
    }

    
    get definitions() {
        return this.services;
    }
    
    get names() {
        return Object.keys(this.services);
    }

    get size() {
        return Object.keys(this.services).length;
    }
    
    [Symbol.iterator]() {
        return Object.values(this.services);
    }

}

export function getDependencies(value: Injectable | IMethod) {
    let deps = [];
    let func: Function;

    if ( isMethod(value) ) {

        func = value.context[ value.method ];
        deps = getParameters(func);

        if ( Reflect.hasMetadata("design:paramtypes", value.context, value.method) ) {
            let types = Reflect.getMetadata("design:paramtypes", value.context, value.method) as any[];
            deps = types.map( type => {

            });
        }

    } else if (is.Function(value)) {
        func = value;
        deps = value['$inject'] || ( hasDefinition(value) && getDefinition(value).parameters ) || ( getParameters(value) );

    } else if (is.Array(value)) {
        
        func = value[value.length - 1] as Function;
        deps = value.slice(0, value.length - 1);
        ok(is.Function(func), `Last element of array must be function`);

    } else {
        throw TypeError(`value of type ${ typeof value } is not injectable`);
    }

    return { deps, func };
}


/**
 * Create new container definition
 * @returns {IDefinition}
 */
export function Definition(definition: IDefinition): IDefinition {
    ok(is.String(definition.name), `Service name must be string`);
    return definition;
}

export function isFactory(value): value is Factory { return value instanceof Function && FACTORY_REGEX.test(value.name); }
export function isService(value): value is Service { return value instanceof Function && !FACTORY_REGEX.test(value.name); }
export function isDefinition(value): value is IDefinition {
    return is.HashMap(value) && ('service' in value || 'factory' in value);
}

export function Method (context, method: string) {
    return { context, method };
}

export function isMethod(value): value is IMethod {
    return typeof value == 'object' && 'context' in value && 'method' in value;
}

const internalClasses = [ Object, Function, Number, String ];
export function isInternalClass(value) {
    return internalClasses.includes(value);
}