import { getParameters } from "@azera/reflect";
import { forEach, is } from "@azera/util";
import { HashMap } from "@azera/util/is";
import { ok } from "assert";
import * as glob from "glob";
import { META_INJECT, getDefinition, hasDefinition, setDefinition, getTarget } from "./decorators";
import { ServiceNotFoundError } from "./errors";
import { ContainerValue, Factory, IAutoTagger, IContainer, IDefinition, IInternalDefinition, IMethod, Injectable, Invokable, MockMethod, Service, IPropertyInjection, Constructor } from "./types";

export const FACTORY_REGEX = /.*Factory$/;
export const SERVICE_REGEX = /.*Service$/;

interface IInvokeOptions<Async=boolean> {
    context?: any;
    override?: Partial<IDefinition>;
    async?: Async;
}

/**
 * Dependency Injection Container
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class Container implements IContainer {

    /**
     * Check if decorated class was inherited from another decorated class
     * @param target Class
     */
    static isInheritedServiceDecorator(target: Function): boolean {
        return (<any>target)[META_INJECT] && !target.hasOwnProperty(META_INJECT);
    }

    /**
     * Prepare class if inherited from service decorated class
     * @param target Class
     */
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

    /**
     * Invoked services in-memory cache
     */
    private instances: HashMap<any> = {};

    /**
     * Container parameters collection
     */
    private params: HashMap<any> = {};
    
    /**
     * Declared service definitions
     */
    private services: HashMap<IDefinition> = {};

    /**
     * Tag extractor functions
     */
    private autoTags: IAutoTagger[] = [];

    /**
     * Type factories
     */
    private factories = new WeakMap <any, Factory>();

    /**
     * Container-specified class definitions
     */
    private types = new WeakMap<Function, IDefinition>();

    /**
     * Imported things
     */
    private imported: any[] = [];

    /** Exception on async dependencies when invoke called synchrounosly */
    public strictAsync = true;

    constructor(services?: HashMap<Service> , parameters?: HashMap<any> , autoTags?: IAutoTagger[]) {
        if ( autoTags ) this.autoTags = autoTags;
        if ( services ) this.set(services);
        if ( parameters ) this.params = parameters;

        this.setFactory('serviceContainer', function containerFactory(this: Container) {
            return this;
        });

        // Get container
        this.setFactory(Container, () => this);

    }

    /**
     * Get container parameters
     */
    public getParameters() {
        return this.params;
    }

    /**
     * Build service from factory
     * @param factory Factory
     * @param _stack  Stack
     * @internal
     */
    private buildFromFactory <T>(factory: Factory<T>, _stack: string[] = [], options?: IInvokeOptions): T {
        let result: any, override = { isFactory: false, invoke: true };
        let { async = false } = options || {};
        
        if ( is.Class(factory) ) {
            let context = this._invoke(factory, _stack, { override: { isFactory: false } });
            result = this._invoke(Method(context, 'create') , _stack, { context, override, async });
        } else if ( is.Function(factory) ) {
            result = this._invoke(factory, _stack, { context: this, override, async });
        } else if ( is.Object(factory) && 'create' in factory ) {
            result = this._invoke(Method(factory, 'create') , _stack, { context: this, override, async });
        } else {
            throw Error(`Factory must be Function or instanceOf IFactory`);
        }

        return result;
    }

    /**
     * Resolve import
     * @param item Path or Function to import
     * @internal
     */
    private resolveImport(item: string | Function) {
        if ( this.imported.includes(item) ) return;
        this.imported.push( item );
        if ( is.Function(item) ) this.add(item);
        else if ( is.String(item) ) {
            item = item + '!(*.d.ts).@(ts|js)'; // Ignore 
            let files = glob.sync(item) || [];
            files.forEach( file => {
                let module = require(file);
                forEach(module, moduleClass => {
                    if ( is.Function(moduleClass) ) {
                        this.add(moduleClass);
                    }
                });
            });
        }
    }

    /**
     * Resolve definition imports
     * @param service Service definition
     * @internal
     */
    private resolveImports(service: IDefinition) {
        if ( !service.imports ) return;
        service.imports.forEach( this.resolveImport.bind(this) );
    }

    /**
     * Resolve (build) service definition
     * @param definition    Service definition
     * @param _stack        Resolving stack
     * @param options       Options
     * @internal
     */
    private resolveDefinition<T>(definition: IDefinition<T>, _stack: string[], options: IInvokeOptions<false>): T
    private resolveDefinition<T>(definition: IDefinition<T>, _stack: string[], options: IInvokeOptions<true>): Promise<T>
    private resolveDefinition<T>(definition: IDefinition<T>, _stack: string[]): T
    private resolveDefinition(definition: IDefinition, _stack: string[], options?: IInvokeOptions): any
    {
        let { context, override, async }: IInvokeOptions = options || {};
        let service = override ? Object.assign({}, definition, override) : definition;
        let name = service.name;
        let result: any;

        if (!service.invoke && (name == undefined || is.Empty(name))) throw Error(`Service has no name`);

        if (!this.definitions[service.name]) {
            // Auto-tagger defined in service
            if ( is.Array(service.autoTags) ) {
                service.autoTags.forEach( item => {
                    if ( is.Function(item) ) this.autoTag( item );
                    else this.autoTag( item.class, item.tags );
                });
            }

            // Imports
            this.resolveImports(service);
        }

        // Factory
        if ( service.isFactory || service.factory || this.factories.has(service.service) ) {
            let factory = service.factory ? service.factory as Factory : service.isFactory ? service.service as Factory : this.factories.get(service.service) as Factory;
            result = this.buildFromFactory( factory, _stack, options as any );
        } else {

            ok( is.Array(service.parameters || []), `Service ${service.name} parameters must be array, ${ service.parameters } given` );
            ok( service.service || service.factory, `No service defined for ${service.name}` );

            let resolvedParameters: any[] = ( service.parameters || [] ).map( dep => this._invoke(dep, _stack, options as any) as any );
            let target = service.service;

            if (this.strictAsync && !async && resolvedParameters.find(d => d instanceof Promise) !== undefined) {
                throw Error(`Async dependencies are not allowed in synchronous invoke`);
            }

            let createService = (parameters: any[]) => {
                // Function service (Factory)
                if ( service.invoke || !is.Newable(target) ) {
                    return { result: target!.apply( context || target, parameters), return: true };
                }

                let object = new ( target as any )( ...parameters );

                // Properties
                if ( service.properties ) {
                    forEach(service.properties, ( dep, key ) => {
    
                        let prop: IPropertyInjection;
    
                        if ( is.String(dep) || is.Function(dep) ) {
                            prop = { name: dep };
                        } else {
                            prop = dep;
                        }
    
                        if ( prop.lateBinding ) {
                            let resolved: any;
                            Object.defineProperty(object, key, {
                                get: () => resolved || ( resolved = this._invoke(prop.name, _stack, options as any) )
                            });
                        } else {
                            object[key] = this._invoke(prop.name, _stack, options as any);
                        }
                    });
                }
    
                // Methods
                if (service.calls) {
                    forEach(service.calls, (args, method) => {
                        object[method].apply(object, args.map(arg => this._invoke(arg, _stack, options)));
                    });
                }

                return { result: object, return: false };

            }

            if (async && resolvedParameters.filter(param => param instanceof Promise).length > 0) {

                let resolver = new Promise(async (resolve, reject) => {
                    resolvedParameters = await Promise.all(resolvedParameters);
                    let { result: object } = createService(resolvedParameters);
                    resolve(object);
                });

                if (!service.private) this.instances[name] = resolver;

                return resolver;
            }

            let { result: object, return: doReturn } = createService(resolvedParameters);

            if (doReturn) return object;

            result = object;

        }

        // Shared services
        if ( !service.private ) {
            this.instances[ name ] = result;
        }

        return result;
    }

    private _throwError(err: Error, stack: string[] = []) {
        if ( err instanceof Error ) {
            if (!(err instanceof ServiceNotFoundError))
                err.message += ', Stack: ' + stack.join(' -> ') + '.';
            throw err;
        }
    }

    /**
     * Build service by name
     * @param name Service name
     * @param stack Injection stack ( for debugging )
     * @throws ServiceNotFoundError
     * @internal
     */
    private getService <T>(name: string, stack: string[] = [], options?: IInvokeOptions): T {
        let service: IDefinition;

        if (service = this.services[name]) {
            try {
                return this.resolveDefinition( service, stack, options as any ) as any;
            } catch ( err ) {
                this._throwError(err, stack);
                return undefined as any;
            }
        }

        throw new ServiceNotFoundError(name, stack);
    }

    /**
     * Get service/parameters
     * @param name Service or paremeter name
     * @param stack Injection stack
     * @internal
     */
    private _get <T extends Function>(name?: T, stack?: string[], options?: IInvokeOptions): T
    private _get <T>(name?: string, stack?: string[], options?: IInvokeOptions): T
    private _get (name?: string, stack: string[] = [], options?: IInvokeOptions)
    {

        if ( name == undefined ) return undefined;

        stack = ([] as string[]).concat( stack || [] );
        stack.push(name);

        // Function
        if (typeof name == 'function') return this._invoke(name, stack, options as any);

        // Cached
        if ( this.instances[name] ) return this.instances[name];

        // Tags
        if ( name.substr(0,2) == '$$' ) return this.findByTag( name.substr(2) ).map( service => this._get(service.name, stack, options) ) as any;
        // Parameter
        else if ( name.substr(0,1) == '$' ) return this.getParameter(name.substr(1)) as any;
        // Parameter
        else if (this.params[name]) return this.params[name];

        return this.getService(name, stack, options);
    }

    get<T extends Function>(service: T): T | undefined
    get<T>(name: string): T | undefined
    get(value: any)
    {
        return this._get(value);
    }

    /**
     * Build tagged services
     * @param tag Tag
     */
    getByTag<T>(tag: string): T[] {
        return this.findByTag(tag).map( definition => this._get<T>(definition.name) ).filter((service): service is T => service != undefined);
    }

    getByTagAsync<T>(tag: string): Promise<T[]> {
        return Promise.all( this.findByTag(tag).map( definition => this._get<T>(definition.name, [], { async: true }) ).filter((service): service is T => service != undefined) );
    }

    /**
     * Get tagged services definitions
     * @param tag Tag
     */
    findByTag(tag: string): IDefinition[] {
        let services: IDefinition[] = [];
        forEach(this.services, service => {
            if ( is.Array(service.tags) && service.tags.includes(tag) )
                services.push( service );
        });
        return services;
    }

    /**
     * Make an method injectable for later use
     * @param context Method context (Class instance)
     * @param method Method name
     */
    invokeLater <T extends object, M extends keyof T>(context: Constructor<T>, method: M): MockMethod<T, M>;
    invokeLater <T extends object, M extends keyof T>(context: T, method: M): MockMethod<T, M>;
    invokeLater <R>(callable: Injectable<R>): (...params: any[]) => R;
    invokeLater(context: any, method?: string): Function
    {
        let container = this;
        let _context: any;
        let _cached: any[];
        let _deps: any[];

        if (!method) {
            let _def = this.getDefinition(context);
            _deps = _def.parameters;
            context = { callable: _def.service };
            method = 'callable';
        } else {
            _deps = this.getDefinition(getTarget(context)).methods[method!];
        }

        let contextName = context && context.name || undefined;
        let fnName = ( contextName ? contextName + '.' :'' ) + method + 'InvokeLater';

        return {

            // Later invokable function
            [fnName]( ...params: any[] ) {
                // Class as context
                _context = _context || ( typeof context == 'function' ? container._invoke(context) : context );

                // Execute
                return _context[ method! ].apply(
                    // This
                    _context,
                    // Parameters
                    ( _cached ? _cached : _cached = (_deps || []).map(dep => container._invoke(dep)) ).concat(params)
                );
            }

        }[fnName];
    }

    /**
     * Make an method injectable for later use
     * @param context Method context (Class instance)
     * @param method Method name
     */
    invokeLaterAsync <T extends object, M extends keyof T>(context: Constructor<T>, method: M): MockMethod<T, M>;
    invokeLaterAsync <T extends object, M extends keyof T>(context: T, method: M): MockMethod<T, M>;
    invokeLaterAsync <R>(callable: Injectable<R>): (...params: any[]) => Promise<R>;
    invokeLaterAsync(context: any, method?: string): Function
    {
        let container = this;
        let _context: any;
        let _cached: any[];
        let _deps: any[];

        if (!method) {
            let _def = this.getDefinition(context);
            _deps = _def.parameters;
            context = { callable: _def.service };
            method = 'callable';
        } else {
            _deps = this.getDefinition(getTarget(context)).methods[method!];
        }

        let contextName = context && context.name || undefined;
        let fnName = ( contextName ? contextName + '.' :'' ) + method + 'InvokeLaterAsync';

        return {

            // Later invokable function
            async [fnName]( ...params: any[] ) {
                // Class as context
                _context = _context || ( typeof context == 'function' ? await container._invoke(context, [], { async: true }) : context );

                // Execute
                return _context[ method! ].apply(
                    // This
                    _context,
                    // Parameters
                    ( _cached ? _cached : _cached = await Promise.all((_deps || []).map(dep => container._invoke(dep, [], { async: true }))) ).concat(params)
                );
            }

        }[fnName];
    }

    /**
     * Invoke a function and resolve its dependencies
     * @param value Invokable value
     */
    invoke<T>(value: Invokable<T>): T
    {
        return this._invoke(value);
    }

    invokeAsync<T>(value: Invokable<T>): Promise<T> {
        return this._invoke(value, [], {
            async: true
        });
    }

    /**
     * 
     * @param value Invokable value
     * @param stack Injection stack
     * @param options 
     */
    private _invoke <T>(value: Invokable<T> ): T
    private _invoke <T>(value: Invokable<T>, stack: string[], options: IInvokeOptions<false> ): T
    private _invoke <T>(value: Invokable<T>, stack: string[], options: IInvokeOptions<true> ): Promise<T>
    private _invoke <T>(value: Invokable<T>, stack: string[], options?: IInvokeOptions ): T
    private _invoke <T>(value: Invokable<T>, stack?: string[], options?: IInvokeOptions ): T
    {
        options = {
            async: false,
            ...options
        };

        stack = stack || [];

        // String (named service)
        if ( is.String(value) ) return this._get(value, stack, options as any);

        let _isFunction = false, _isMethod = false, _isClass = false;

        // Function or Class
        if ( (_isClass = is.Class(value)) || (_isFunction = is.Function(value)) || (_isMethod = isMethod(value)) || is.Array(value) ) {
            let def = this.getDefinition(value);
            stack.push(`${def.name} (${ _isClass ? 'Class' : _isFunction ? 'Function' : _isMethod ? 'Method' : 'Array' })`);
            if ( !_isMethod && !is.Empty(def.name) && this.instances[def.name] ) return this.instances[def.name];
            return this.resolveDefinition(def, stack, options as any) as any;
        }

        // Any other things
        return options.async ? Promise.resolve(value) : value as any;
    }


    /**
     * Set parameter value
     * @param name Parameter name
     * @param value Value
     */
    setParameter(name: string, value: any): this {
        this.params[name] = value;
        return this;
    }

    /**
     * Set parameters value
     * @param params Parameters
     */
    setParameters(params: { [key: string]: any }) {
        this.params = { ...this.params, params };
        return this;
    }

    /**
     * Set factory for a function
     * @param type Type
     * @param factory Factory
     */
    setFactory(type: Function | string, factory: Factory)
    {
        if (is.String(type)) {
            this.set(type, {
                factory
            });
            return this;
        }
        this.factories.set(type, factory);
        delete this.instances[ getDefinition(type).name ];
        return this;
    }

    /**
     * Set alias for a type
     * @param type Type
     * @param alias Alias value
     */
    setAlias(type: Function, alias: any) {
        this.setFactory(type, function typeAlias() {
            return alias;
        });
        return this;
    }

    /**
     * Get overrided service definition
     * @param type Type
     */
    getType(type: Function): IDefinition | undefined {
        return this.types.get(type);
    }

    /**
     * Set batch services and parameters
     * @param values Services and Parameters
     */
    set(values: { [name: string]: IDefinition | ContainerValue }): this;

    /**
     * Set service/parameter
     * @param name Service/Parameter name
     * @param value 
     */
    set(name: string, value: IDefinition | ContainerValue): this;

    /**
     * Container-scope class definition
     * @param type Type/Class
     * @param definition Definition
     */
    set(type: Function, definition: Partial<IDefinition>): this;
    set(...params: any[]) {

        if (is.Function(params[0]))
        {
            this.types.set(params[0], params[1]);
            return this;
        }

        // Collection of values
        if (is.HashMap<ContainerValue>(params[0])) {
            forEach(params[0], (value, name) => this.set(name, value));
            return this;
        }

        let [name, value] = params;

        if (isDefinition(value)) {
            this.addDefinition(Object.assign({ private: false, tags: [] }, value, { name }));
        }
        else if ( is.Function(value) || is.Array(value) ) {
            let def = Object.assign({}, this.getDefinition(value));
            def.name = name;
            this.addDefinition(def);
        }
        else this.setParameter(name, value);

        return this;
    }


    /**
     * Get service built-in definition
     * @param target Class/Function
     */
    getDefinition(target: string | IMethod | Injectable): IDefinition {

        let customDeps, def: IDefinition;

        if ( is.Array( target ) ) {
            let { deps, func } = getDependencies( target );
            target = func;
            customDeps = deps;
        }

        if ( is.Function(target) ) {
            def = getDefinition(target) as IInternalDefinition;
            if ( this.types.has(target) ) {
                def = Object.assign({}, def, this.types.get(target));
            }
            Container.checkInheritance(target);
        } else if ( isMethod(target) ) {
            let method = target.context[ target.method ];
            def = getDefinition(method, target.context);
            def.service && Container.checkInheritance( def.service );
        } else if ( is.String(target) ) {
            if ( !this.services[target] ) {
                throw new ServiceNotFoundError(target);
            }
            def = this.services[target];                
        } else {
            throw TypeError(`getDefinition only accepts function or string.`);
        }

        if ( customDeps ) {
            def = Object.assign({}, def);
            def.parameters = customDeps;
        }

        return def;
    }

    /**
     * Add definition to container
     * @param definition Definition
     */
    addDefinition(definition: IDefinition): this {
        // Defaults
        definition = Definition(definition);

        // Service decorated definition
        if ( definition.service && hasDefinition( definition.service ) ) {
            definition = Object.assign( getDefinition(definition.service), definition );
        }

        // Auto-tagger defined in service
        if ( is.Array(definition.autoTags) ) {
            definition.autoTags.forEach( item => {
                if ( is.Function(item) ) this.autoTag( item );
                else this.autoTag( item.class, item.tags );
            });
        }

        // Auto tagging
        if ( (definition.tags || []).length == 0 )
            this.autoTags.forEach( tagger => {
                definition.tags = (<string[]>[]).concat( definition.tags || [] , tagger(definition) || [] );
            });


        delete this.instances[definition.name];
        this.services[definition.name] = definition;

        this.resolveImports(definition);

        return this;
    }

    /**
     * Get parameter value
     * @param name Parameter name
     */
    getParameter(name: string) {
        if ( this.hasParameter(name) ) return this.params[name];
        throw Error(`Parameter ${name} not found`);
    }

    /**
     * Check parameter exists
     * @param name Parameter name
     */
    hasParameter(name: string): boolean {
        return Object.keys(this.params).includes(name);
    }

    /**
     * Check for service definition exist
     * @param name Service name
     */
    has(name: string): boolean {
        return !!this.services[name];
    }

    /**
     * Add Auto-tagger
     * @param tagger Auto-tagger
     */
    autoTag(tagger: IAutoTagger): this;
    autoTag(base: Function, tags: string[]): this;
    autoTag(...params: any[]): this
    {
        if ( params[1] ) {
            this.autoTags.push( def => def.service && def.service.prototype instanceof params[0] ? params[1] : [] );
        } else {
            this.autoTags.push( params[0] );
        }
        return this;
    }

    /**
     * Declare class or function to container
     */
    add(...services: Function[]) {
        services.forEach( service => {
            let definition = this.getDefinition(service);
            this.set( definition.name, definition );
        });
        return this;
    }

    /**
     * Get declared definitions
     */
    get definitions() {
        return this.services;
    }
    
    /**
     * Return declared service names
     */
    get names() {
        return Object.keys(this.services);
    }

    /**
     * Get services count
     */
    get size() {
        return Object.keys(this.services).length;
    }
    
    [Symbol.iterator]() {
        let keys = Object.keys(this.services);
        return {
            next() {
                return {
                    done: keys.length > 0,
                    value: keys.pop()
                }
            }
        };
    }

}

/**
 * Get injectable dependencies
 * @param value Injectable
 */
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
        deps = (<any>value)['$inject'] || ( hasDefinition(value) && getDefinition(value).parameters ) || ( getParameters(value, false).filter(p => !p.hasDefault && p.name.length > 0).map(p => p.name) );

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

export function isFactory(value: any): value is Factory { return value instanceof Function && FACTORY_REGEX.test(value.name); }
export function isService(value: any): value is Service { return value instanceof Function && !FACTORY_REGEX.test(value.name); }
export function isDefinition(value: any): value is IDefinition {
    return is.HashMap(value) && ('service' in value || 'factory' in value);
}

export function Method (context: any, method: string) {
    return { context, method };
}

export function isMethod(value: any): value is IMethod {
    return typeof value == 'object' && 'context' in value && 'method' in value;
}

const internalClasses = [ Object, Function, Number, String, undefined ];
export function isInternalClass(value: any) {
    return internalClasses.includes(value);
}