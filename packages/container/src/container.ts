import { forEach, is } from "@azera/util";
import type { HashMap } from "@azera/util/is";
import { createServiceDefinition, getDependencies, isServiceDefinition, MethodInvoke, isMethodInvoke, getServiceDefinition, getTarget, hasServiceDefinition, setServiceDefinition } from "./util";
import { META_INJECT } from "./constants";
import { ServiceNotFoundError } from "./errors";
import { Constructor, ContainerInvokeOptions, ContainerValue, Factory, IArgumentConverterFunction, IAutoTagger, IContainerInvokeOptions, IFactoryCondition, IInternalDefinition, IMethod, Injectable, Invokable, MockMethod, MockMethodAsync, ServiceType } from "./types";
import { ServiceDefinition } from "./serviceDefinition";

/**
 * Dependency Injection Container
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class Container {

    /**
     * Check if decorated class was inherited from another decorated class
     * @param target Class
     */
    static isInheritedServiceDecorator(target: Function): boolean {
        return Reflect.hasMetadata(META_INJECT, target) && !Reflect.hasOwnMetadata(META_INJECT, target);
    }

    /**
     * Prepare class if inherited from service decorated class
     * @param target Class
     */
    static checkInheritance(target: Function) {
        if ( Container.isInheritedServiceDecorator(target) ) {
            let def = <IInternalDefinition>getServiceDefinition(target);
            def.$target = target;
            def.inherited = false;
            def.name = target.name;
            def.service = target;
            def.parameters = getDependencies(target).deps;
            setServiceDefinition(target, def);
        }
    }

    /** Container name (scope name) */
    public containerName?: string;

    /** Parent container (for scoped containers) */
    private parentContainer?: Container;

    /** Invoked services in-memory cache */
    private instances = new Map<any, any>();

    /** Container parameters collection */
    private params: HashMap<any> = {};
    
    /** Declared service definitions */
    private services: HashMap<ServiceDefinition> = {};

    /** Tag extractor functions */
    private autoTags: IAutoTagger[] = [];

    /** Type factories */
    private factories = new WeakMap <any, Factory[]>();

    /** Service invokation pipelines */
    private pipes = new Map<any, Function[]>();

    /** Container-specified class definitions */
    private types = new WeakMap<Function, ServiceDefinition>();

    /** Exception on async dependencies when invoke called synchrounosly */
    public strictAsync = true;

    /** Ignored invoke later deps */
    private ignoredInvokeLaterDeps: Function[] = [];

    constructor(services?: HashMap<ServiceType> , parameters?: HashMap<any> , autoTags?: IAutoTagger[]) {
        if ( autoTags ) this.autoTags = autoTags;
        if ( services ) this.set(services);
        if ( parameters ) this.params = parameters;

        // Define Container as a dependency
        this.setFactory('serviceContainer', function containerFactory(this: Container) { return this; });
        this.setAlias(Container, this);
    }

    public scope(name: string | undefined = undefined) {
        let scope = new Container();
        scope.containerName = name;
        scope.parentContainer = this;
        return scope;
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
    private buildFromFactory <T>(factory: Factory<T>, options?: IContainerInvokeOptions): { service: T, isPrivate: boolean | undefined } {
        let result: any;
        let defaultOptions: IContainerInvokeOptions = { async: false, stack: [], ...options, private: true, override: { isFactory: false, invoke: true } };
        let isPrivate: boolean | undefined = undefined;
        
        if ( is.Class(factory) ) {
            let context = this._invoke(factory, { stack: [], override: { isFactory: false } });
            result = this._invoke(MethodInvoke(context, 'create') , { ...defaultOptions, context });
        } else if ( is.Function(factory) ) {
            result = this._invoke(factory, { ...defaultOptions, context: this });
        } else if ( is.Object(factory) && 'create' in factory ) {
            result = this._invoke(MethodInvoke(factory, 'create') , { ...defaultOptions, context: this });
        } else {
            throw Error(`Factory must be Function or instanceOf IFactory`);
        }

        if ('isPrivateFactory' in factory) isPrivate = factory['isPrivateFactory'] as boolean;

        return { service: result, isPrivate };
    }

    /**
     * Resolve import
     * @param item Path or Function to import
     * @internal
     */
    private resolveImport(item: string | Function) {
        // Import Class
        if ( typeof item == 'function' )
            this.add(item);
        // Import Path
        else if ( typeof item == 'string' ) {
            let glob = require('glob');
            // JS/TS files pattern
            item = item + '!(*.d.ts).@(ts|js)'; 
            // Scan for files
            let files = (glob.sync(item) || []) as string[];
            // Import files
            files.forEach( file => {
                let module = require(file);
                forEach(module, moduleClass => {
                    if (typeof moduleClass == 'function') {
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
    private resolveImports(service: ServiceDefinition) {
        if ( !service.imports ) return;
        service.imports.forEach( this.resolveImport.bind(this) );
    }

    /**
     * Check factory conditions based on invoke options
     * @param factory Factory
     * @param options Invokce options
     * @returns 
     */
    private $checkFactoryCondition(factory: Factory, options?: IContainerInvokeOptions): boolean {
        if ('factoryCondition' in factory) {
            let { methodName, target, paramIndex } = factory['factoryCondition'] as IFactoryCondition;
            if (target && !(options?.methodTarget instanceof target) && options?.methodTarget !== target) return false;
            if (methodName && options?.methodName != methodName) return false;
            if (typeof paramIndex !== 'undefined' && options?.argumentIndex != paramIndex) return false; 
        }
        return true;
    }

    /**
     * Check if a type has any defined factories
     * @param key Type
     * @returns 
     */
    private hasFactories(key: any): boolean {
        return this.factories.has(key) || !!this.parentContainer?.hasFactories(key);
    }

    /**
     * Get defined factories for specified type
     * @param key Type
     * @returns 
     */
    private getFactories(key: any): Factory[] {
        return [...(this.factories.get(key) || []), ...(this.parentContainer?.getFactories(key) || [])];
    }

    /**
     * Check if a type has any defined pipes
     * @param type Type
     * @returns 
     */
    private hasPipes(type: any): boolean {
        return this.pipes.has(type) || !!this.parentContainer?.hasPipes(type);
    }

    /**
     * Get available pipes for specified type
     * @param key Type
     * @returns 
     */
    private getPipes(key: any): Function[] {
        return [...(this.pipes.get(key) || []), ...(this.parentContainer?.getPipes(key) || [])];
    }

    /**
     * Check if a service defined
     * @param type Type
     * @returns 
     */
    private hasService(type: any): boolean {
        return !!this.services[type] || !!this.parentContainer?.hasService(type);
    }

    /**
     * Get defined service
     * @param key Type
     * @returns 
     */
    private getService(key: any): ServiceDefinition<Function> {
        return this.services[key] ?? this.parentContainer?.getService(key);
    }
    

    /**
     * Get appropriate factory for given service definition
     * @param service Service definition
     * @returns 
     */
    private getAppropriateFactory(service: ServiceDefinition, options?: IContainerInvokeOptions) {
        let factory: Factory | undefined;
        if (this.hasFactories(service.service)) {
            let factories = this.getFactories(service.service);
            let factory = factories?.find(factory => this.$checkFactoryCondition(factory, options));
            if (factory) return factory;
        }
        else if (service.isFactory && this.$checkFactoryCondition(service.service as Factory)) return service.service as Factory;
        else if (service.factory && this.$checkFactoryCondition(service.factory)) return service.factory;
        return factory;
    }

    /**
     * Resolve (build) service definition
     * @param definition    Service definition
     * @param _stack        Resolving stack
     * @param options       Options
     * @internal
     */
    private resolveDefinition<T>(definition: ServiceDefinition<T>, options: IContainerInvokeOptions<false>): T;
    private resolveDefinition<T>(definition: ServiceDefinition<T>, options: IContainerInvokeOptions<true>): Promise<T>;
    private resolveDefinition<T>(definition: ServiceDefinition<T>, options?: IContainerInvokeOptions): T;
    private resolveDefinition(definition: ServiceDefinition, options: IContainerInvokeOptions): any
    {
        let { context, override, async, private: isPrivate }: IContainerInvokeOptions = options || { stack: [] };
        let service = override ? Object.assign({}, definition, override) : definition;
        let name = service.name;
        let result: any;
        let cacheKey = service.namedService ? name : service.service;
            isPrivate = service.private || isPrivate || false;

        if (!service.invoke && !name) throw Error(`Service has no name`);

        if (!service.$$prepared)
            this.$prepareDefinition(service);

        let factory = this.getAppropriateFactory(service, options);

        // Factory
        if ( factory ) {
            let factoryResult = this.buildFromFactory(factory, options);
            result = factoryResult.service;
            if (typeof factoryResult.isPrivate !== 'undefined') isPrivate = factoryResult.isPrivate;
        } else {

            if ( Array.isArray(service.parameters || []) === false ) throw Error(`Service ${service.name} parameters must be array, ${ service.parameters } given` );
            if ( !service.service && !service.factory ) throw Error(`No service defined for ${service.name}`);

            // Service arguments
            let parameters: any[] = ( service.parameters || [] ).map( dep => this._invoke(dep, options) as any );

            // Service properties
            let properties =  Object.keys(service.properties ?? {}).map(key => {
                let prop = service.properties[key];
                return is.String(prop) || is.Function(prop) ? { key, name: prop } : { key, ...prop };
            });

            let target = service.service;

            if (this.strictAsync && !async && parameters.find(d => d instanceof Promise) !== undefined) {
                throw Error(`Async dependencies are not allowed in synchronous invoke`);
            }

            let createService = (parameters: any[], props: typeof properties) => {
                // Function service (Factory)
                if (service.invoke) {
                    return { result: target!.apply( context || target, parameters), return: true };
                }

                let instance = new ( target as any )( ...parameters );

                // Properties
                props.forEach(prop => {
                    if (async) {
                        instance[prop.key] = prop.name;
                    }
                    else if (prop.lateBinding) {
                        let resolved: any;
                        Object.defineProperty(instance, prop.key, {
                            get: () => resolved || ( resolved = this._invoke(prop.name, options) )
                        });
                    }
                    else {
                        instance[prop.key] = this._invoke(prop.name, options);
                    }
                });
    
                // Methods
                if (service.calls) {
                    for (let method in service.calls) {
                        let args = service.calls[method];
                        instance[method].apply(instance, args.map(arg => this._invoke(arg, options)));
                    }
                }

                return { result: instance, return: false };

            };           

            // Asynchronous service invokation
            if (async) {

                let resolver = new Promise(async (resolve, reject) => {
                    try {
                        parameters = await Promise.all(parameters);

                        for (let key in parameters) {
                            if (Array.isArray(parameters[key])) {
                                parameters[key] = await Promise.all(parameters[key]);
                            }
                        }

                        for (let prop of properties) {
                            prop.name = await Promise.resolve(this._invoke(prop.name, options));
                        }

                        let { result: object } = createService(parameters, properties);

                        // Pipelines                    
                        if (service.service && this.hasPipes(service.service)) {
                            for (let pipe of (this.getPipes(service.service) ?? [])) {
                                await Promise.resolve(pipe(object, this));
                            }
                        }

                        resolve(object);
                    } catch (err) { reject(err); }
                });

                if (!isPrivate) this.instances.set(cacheKey, resolver);

                return resolver;
            }


            // Synchronous
            let { result: object, return: doReturn } = createService(parameters, properties);
            
            // Pipelines
            if (service.service && this.hasPipes(service.service)) {
                this.getPipes(service.service)?.forEach(pipe => {
                    pipe(result, this);
                });
            }

            if (doReturn) return object;

            result = object;
        }

        // Shared services
        if ( !isPrivate ) {
            this.instances.set( cacheKey, result );
        }

        return result;
    }

    /** @deprecated Use invoke instead */
    get<T extends Function>(service: T): T | undefined;
    get<T>(name: string): T | undefined;
    get(value: any)
    {
        return this._invoke(value);
    }

    /**
     * Build tagged services
     * @param tag Tag
     */
    getByTag<T>(tag: string): T[] {
        return this.findByTag(tag).map( definition => this._invoke<T>(definition.name) ).filter((service): service is T => service != undefined);
    }

    async getByTagAsync<T>(tag: string): Promise<T[]> {
        const services = await Promise.all(this.findByTag(tag).map(definition => this._invoke<T>(definition.name, { stack: [], async: true })));
        return services.filter((service): service is Awaited<T> => service != undefined);
    }

    /**
     * Get tagged services definitions
     * @param tag Tag
     */
    findByTag<T = Function>(tag: string): ServiceDefinition<T>[] {
        let services: ServiceDefinition<T>[] = [];
        forEach(this.services, (service: ServiceDefinition<any>) => {
            if ( is.Array(service.tags) && service.tags.includes(tag) )
                services.push( service );
        });

        // Merge parent container
        if (this.parentContainer) {
            let parentServices = this.parentContainer.findByTag<T>(tag);
            services = [...services, ...parentServices];
        }
        
        return services;
    }

    private $invokeLater(context: any, method?: string, async: boolean = false) {
        let container = this;
        let _context: any;
        let _deps: any[];

        if (!method) {
            let _def = this.getDefinition(context);
            _deps = _def.parameters || [];
            context = { callable: _def.service };
            method = 'callable';
        } else {
            _deps = this.getDefinition(getTarget(context)).methods[method!] || [];
        }

        _deps = _deps.filter(dep => this.ignoredInvokeLaterDeps.indexOf(dep) < 0);
        let contextName = context && context.name || context.constructor && context.constructor.name || undefined;
        let fnName = ( contextName ? contextName + '.' :'' ) + method + '$InvokeLater' + (async ? 'Async' : '');

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
                    _deps ? [
                        ..._deps.map((dep, index) => container._invoke(dep, { stack: [_context], invokeArguments: params, argumentIndex: index, methodName: method, methodTarget: _context })),
                        ...params
                    ] : params
                );
            },

            // Later invokable function async
            async [fnName + 'Async']( ...params: any[] ) {
                // Class as context
                _context = _context || ( typeof context == 'function' ? await container._invoke(context, { stack: [], async: true }) : context );

                // Execute
                return _context[ method! ].apply(
                    // This
                    _context,
                    // Parameters
                    (await Promise.all(_deps.map((dep, index) => container._invoke(dep, { stack: [_context], async: true, invokeArguments: params, argumentIndex: index, methodName: method, methodTarget: _context })))).concat(params)
                );
            }

        }[fnName + (async ? 'Async' : '')];
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
        return this.$invokeLater(context, method, false);
    }

    /**
     * Make an method injectable for later use
     * @param context Method context (Class instance)
     * @param method Method name
     */
    invokeLaterAsync <T extends object, M extends keyof T>(context: Constructor<T>, method: M): MockMethodAsync<T, M>;
    invokeLaterAsync <T extends object, M extends keyof T>(context: T, method: M): MockMethodAsync<T, M>;
    invokeLaterAsync <R>(callable: Injectable<R>): (...params: any[]) => Promise<R>;
    invokeLaterAsync(context: any, method?: string): Function
    {
        return this.$invokeLater(context, method, true);
    }

    /**
     * Execute a method from a class instance or a context async
     * @param target Class instance or object
     * @param method Method name
     */
    invokeAsync<T extends { [method: string]: any }, M extends keyof T>(target: T, method: M, ...params: any[]): Promise<ReturnType<T[M]>>;

    /**
     * Invoke a function and resolve its dependencies async
     * @param value Invokable value
     */
    invokeAsync<T>(value: Invokable<T>): Promise<T>;
    invokeAsync(value: any, method?: any, ...params: any[])
    {
        if (method) return this.invokeLaterAsync(value, method)(...params);
        return this._invoke(value, { stack: [], async: true });
    }

    
    /**
     * Execute a method from a class instance or a context
     * @param target Class instance or object
     * @param method Method name
     */
    invoke<T extends { [method: string]: any }, M extends keyof T>(target: T, method: M, ...params: any[]): ReturnType<T[M]>;

    /**
     * Invoke a function and resolve its dependencies
     * @param value Invokable value
     */
    invoke<T>(value: Invokable<T>): T;
    invoke(value: any, method?: any, ...params: any[])
    {
        // Method invoke
        if (method) return this.invokeLater(value, method)(...params);
        return this._invoke(value);
    }

    private hasInstance(key: any): boolean {
        return this.instances.has(key) || !!this.parentContainer?.hasInstance(key);
    }

    private getInstance(key: any): any {
        return this.instances.get(key) ?? this.parentContainer?.getInstance(key);
    }
    
    /**
     * 
     * @param value Invokable value
     * @param stack Injection stack
     * @param options 
     */
    private _invoke <T>(value: string): T;
    private _invoke <T>(value: Invokable<T> ): T;
    private _invoke <T>(value: Invokable<T>, options: IContainerInvokeOptions<false> ): T;
    private _invoke <T>(value: Invokable<T>, options: IContainerInvokeOptions<true> ): Promise<T>;
    private _invoke <T>(value: string, options?: IContainerInvokeOptions ): T;
    private _invoke <T>(value: Invokable<T>, options?: IContainerInvokeOptions ): T;
    private _invoke <T>(value: Invokable<T>, options?: IContainerInvokeOptions ): T
    {
        // Cached
        if ( this.hasInstance(value) ) return this.getInstance(value);

        // Check if defined in parent
        if (this.parentContainer?.hasFactories(value) || this.parentContainer?.hasService(value)) {
            return this.parentContainer?._invoke(value, options);
        }

        // Default options
        options = {
            async: false,
            stack: [],
            ...options
        };

        // Push current service to resolve stack
        options.stack.push(value);

        // Invoke options as service
        if (value == 'invokeOptions' || value == ContainerInvokeOptions) {
            return options.async ? Promise.resolve(options) : options as any;
        }

        if (typeof value == 'string') {
            let service: ServiceDefinition;
            // Tags
            if ( value.startsWith('$$') )
                return this.findByTag( value.substr(2) ).map( service => this._invoke(service.name, options) ) as any;
            // Parameter
            else if ( value[0] === '$' )
                return this.getParameter(value.substr(1));
            // Expression
            else if ( value[0] === '=' ) {
                // @ts-ignore
                let invoke = this.invoke.bind(this);
                return eval(value.substr(1));
            }
            // Defined service
            else if (service = this.getService(value))
                return this.resolveDefinition(service, options) as any;
            // Parameter
            else {
                let param = this.getParameter(value);
                if (param)
                    return param;
            }
            
            throw new ServiceNotFoundError(String(value), options.stack);
        }
        else if (typeof value == 'function' || Array.isArray(value) || isMethodInvoke(value)) {
            let serviceDefinition = this.getDefinition(value);
            options.stack.push(value);
            return this.resolveDefinition(serviceDefinition, options) as any;
        }
            
        return value as any;
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
    setFactory(type: Function | string, factory: Factory, $private?: boolean)
    {
        if (typeof type == 'string') {
            return this.set(type, { factory, private: $private });
        }

        if (typeof $private !== 'undefined') (factory as any)['isPrivateFactory'] = $private;
        this.factories.set(type, [ factory ].concat(this.factories.get(type) ?? []));
        this.instances.delete( type );
        return this;
    }

    /**
     * Set alias for a type
     * @param type Type
     * @param alias Alias value
     */
    setAlias(type: Function, alias: any) {
        this.setFactory(type, function typeAliasProviderFactory() {
            return alias;
        });
        return this;
    }

    /**
     * Add a pipeline for specific service
     * ```
     * addPipe(Logger, logger => { logger.setLevel(12); })
     * ```
     * @param type Service
     * @param pipe Pipeline callback
     */
    addPipe<T>(type: Invokable<T>, pipe: (service: T, container: Container) => void) {
        if (!this.pipes.has(type)) this.pipes.set(type, []);
        this.pipes.get(type)?.push(pipe);
        return this;
    }

    /**
     * Check if a type is overrided
     * @param type Type
     */
    hasType(type: Function): boolean {
        return this.types.has(type) || !!this.parentContainer?.hasType(type);
    }

    /**
     * Get overrided service definition
     * @param type Type
     */
    getType(type: Function): ServiceDefinition | undefined {
        return this.types.get(type) ?? this.parentContainer?.getType(type);
    }

    /**
     * Set batch services and parameters
     * @param values Services and Parameters
     */
    set(values: { [name: string]: ServiceDefinition | ContainerValue }): this;

    /**
     * Set service/parameter
     * @param name Service/Parameter name
     * @param value 
     */
    set(name: string, value: ServiceDefinition | ContainerValue): this;

    /**
     * Container-scope class definition
     * @param type Type/Class
     * @param definition Definition
     */
    set(type: Function, definition: Partial<ServiceDefinition>): this;
    set(...params: any[]) {
        // Collection of values
        if (is.HashMap<ContainerValue>(params[0])) {
            forEach(params[0], (value, name) => this.set(name, value));
            return this;
        }

        let [name, value] = params;

        // 
        if (is.Function(name))
        {
            this.definitionCache.delete(name);
            this.types.set(name, value);
            return this;
        }

        // Definition
        if (isServiceDefinition(value)) {
            this.addDefinition(Object.assign({ private: false, tags: [] }, value, { name }));
        }
        // Named Service
        else if ( is.Function(value) || is.Array(value) ) {
            let def = Object.assign({}, this.getDefinition(value));
            def.name = name;
            this.addDefinition(def);
        }
        // Parameter
        else this.setParameter(name, value);

        return this;
    }

    hasDefinition(value: any) {
        return hasServiceDefinition(value);
    }

    private definitionCache = new Map<any, ServiceDefinition>();

    /**
     * Get service built-in definition
     * 
     * @param target Class/Function
     */
    getDefinition(target: string | IMethod | Injectable): ServiceDefinition {
        if (this.definitionCache.has(target)) return this.definitionCache.get(target)!;
        let customDeps, def: ServiceDefinition;

        if ( Array.isArray( target ) ) {
            let { deps, func } = getDependencies( target );
            target = func;
            customDeps = deps;
        }

        if (typeof target == 'function') {
            def = getServiceDefinition(target) as IInternalDefinition;
            if ( this.hasType(target) ) {
                def = Object.assign({}, def, this.getType(target));
            }
            Container.checkInheritance(target);
            this.definitionCache.set(target, def);
        } else if ( typeof target == 'string' ) {
            if ( !this.hasService(target) ) {
                throw new ServiceNotFoundError(target);
            }
            def = this.getService(target);                
            this.definitionCache.set(target, def);
        } else if ( isMethodInvoke(target) ) {
            let method = target.context[ target.method ];
            def = getServiceDefinition(method, target.context);
            def.service && Container.checkInheritance( def.service );
        } else {
            throw TypeError(`getDefinition only accepts function or string.`);
        }

        if ( customDeps ) {
            def = Object.assign({}, def);
            def.service = target as any;
            def.parameters = customDeps;
        }

        return def;
    }

    /**
     * First-time service definition preparation to include auto-tags, imports and etc
     * 
     * @param definition Service definition
     * @returns 
     */
    private $prepareDefinition(definition: ServiceDefinition) {
        if (definition.$$prepared) return;
        definition.$$prepared = true;

        // Auto-tagger defined in service
        if ( Array.isArray(definition.autoTags) ) {
            for (let autoTag of definition.autoTags) {
                if (typeof autoTag == 'function') this.autoTag(autoTag);
                else this.autoTag(autoTag.class, autoTag.tags);
            }
        }

        // Arguments converters
        if ( Array.isArray(definition.paramConverters) ) {
            for (let converter of definition.paramConverters) {
                this.argumentConverter(converter.type, converter.converter, definition.service, converter.methodName, converter.paramIndex);
            }
        }

        // Imports
        this.resolveImports(definition);
    }

    /**
     * Add definition to container
     * @param definition Definition
     */
    addDefinition(definition: ServiceDefinition): this {
        // Defaults
        definition = createServiceDefinition(definition);

        if (definition.service?.name !== definition.name)
            definition.namedService = true;

        // Service decorated definition
        if ( definition.service && hasServiceDefinition( definition.service ) ) {
            definition = Object.assign( getServiceDefinition(definition.service), definition );
        }

        // Service tags (generate from auto-taggers)
        if ( Array.isArray(definition.tags) )
            this.autoTags.forEach(tagger => {
                definition.tags = (<string[]>[]).concat( definition.tags || [] , tagger(definition) || [] );
            });

        this.$prepareDefinition(definition);

        this.instances.delete(definition.namedService ? definition.name : definition.service);
        this.services[definition.name] = definition;

        return this;
    }

    /**
     * Get parameter value
     * @param name Parameter name
     */
    getParameter<T = any>(name: string, _default?: T): T extends object ? T & { [k: string]: any } : T {
        if ( !this.hasParameter(name) && !_default ) {
            throw Error(`Parameter ${name} not found`);
        }

        return this.params[name] || this.parentContainer?.$getParameter(name) || _default;
    }

    private $getParameter<T = any>(name: string): T extends object ? T & { [k: string]: any } : T {
        return this.params[name] || this.parentContainer?.$getParameter(name);
    }

    /**
     * Check parameter exists
     * @param name Parameter name
     */
    hasParameter(name: string): boolean {
        return Object.keys(this.params).includes(name) || !!this.parentContainer?.hasParameter(name);
    }

    /**
     * Check for service definition exist
     * @param name Service name
     */
    has(name: string): boolean {
        return !!this.services[name] || !!this.parentContainer?.has(name);
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
     * Ignore some types to resolve as dependencies in invokeLate
     * 
     * @param types Types
     * @returns 
     */
    ignoreInvokeLaterDep(...types: Function[]) {
        this.ignoredInvokeLaterDeps.push(...types);
        return this;
    }

    /**
     * Set argument converter for specified type
     * 
     * @param type Type
     * @param converter Conveter
     * @returns 
     */
    argumentConverter(type: Function, converter: IArgumentConverterFunction, target?: Function, targetMethod?: string, targetArgumentIndex?: number)
    {
        let container = this;
        this.setFactory(type, class argumentConverterFactory {
            create(invokeOptions: IContainerInvokeOptions) {
                let { methodName, invokeArguments, argumentIndex, methodTarget } = invokeOptions;
                if (!methodName || !invokeArguments || typeof argumentIndex == 'undefined' || !methodTarget) return;
                return converter({ method: methodName, target: methodTarget, value: invokeArguments[argumentIndex], parameterIndex: argumentIndex, parameterName: '', type, parameters: invokeArguments, container }, container);
            }

            static factoryCondition: IFactoryCondition = { target, methodName: targetMethod, paramIndex: targetArgumentIndex }
            static isPrivateFactory = true;
        }, true);

        return this;
    }

    /**
     * Get declared definitions
     * 
     * @deprecated use Container.services instead
     */
    get definitions(): Container['services'] {
        if (this.parentContainer)
            return {...this.parentContainer.definitions, ...this.services };
        return this.services;
    }
    
    /**
     * Return declared service names
     */
    get names(): string[] {
        if (this.parentContainer)
        {
            return [...Object.keys(this.services), ...this.parentContainer.names];
        }
        return Object.keys(this.services);
    }

    /**
     * Get services count
     */
    get size(): number {
        if (this.parentContainer)
        {
            return Object.keys(this.services).length + this.parentContainer.size;
        }
        return Object.keys(this.services).length;
    }
    
    [Symbol.iterator]() {
        let keys = Object.keys(this.services);
        return {
            next() {
                return {
                    done: keys.length > 0,
                    value: keys.pop()
                };
            }
        };
    }

}