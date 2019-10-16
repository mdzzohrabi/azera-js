import { Container } from '@azera/container';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as path from 'path';
import { Bundle } from './Bundle';
import { CoreBundle } from './bundle/core/CoreBundle';
import { ConfigResolver } from './ConfigResolver';
import { ConfigSchema } from './ConfigSchema';
import configureContainer from './Container.Config';
import { Logger } from './Logger';
import { Profiler } from './Profiler';
import { asyncEach, getPackageDir } from './Util';
import "./JsExtensions";

/**
 * Application kernel
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class Kernel {

    /** Kernel environment */
    static DI_PARAM_ENV = 'env';

    /** Kernel boot start timestamp */
    static DI_PARAM_BOOTSTART = 'kernel.bootStart';

    /** Kernel boot end timestamp */
    static DI_PARAM_BOOTEND = 'kernel.bootEnd';

    /** Kernel run parameters */
    static DI_PARAM_PARAMETERS = 'kernel.parameters';

    /** Kernel loaded config file path */
    static DI_PARAM_CONFIG_FILE = 'kernel.configFile';

    /** Application root path */
    static DI_PARAM_ROOT = 'kernel.root';

    /** Loaded configuration */
    public config: any;

    /** Source directory name */
    public sourceDirectory: string = '/';

    /** Cache directory */
    public cacheDirectory: string = '/cache';

    constructor(
        // Kernel environment
        public env?: string,
        // Kernel bundles
        public bundles: Bundle[] = [],
        // Kernel dependency-injection container
        public container: Container = new Container()
    ) {

        this.env = env = env || process.env.NODE_ENVIRONMENT || 'development';

        this.profiler.start('kernel.constructor');

        let kernel = this;
        let rootDir = getPackageDir();

        if ( existsSync(rootDir + '/dist') ) this.sourceDirectory = '/dist';

        // Container parameters
        container.setParameter(Kernel.DI_PARAM_ROOT, rootDir);
        container.setParameter(Kernel.DI_PARAM_ENV, env);

        // Set kernel and Kernel refrence to current kernel
        container.setAlias(Kernel, kernel);

        // Configuration resolver
        container.setFactory(ConfigResolver, function objectResolverFactory() {
            return new ConfigResolver().resolver( container.invoke(ConfigSchema)!.resolver );
        });

        this.bundles = ([ new CoreBundle ] as Bundle[]).concat( this.bundles );

        container.setParameter( 'kernel.bundles' , this.bundles.map(bundle => 
            (bundle.constructor as any).bundleName || bundle.constructor.name ));

        // Initialize bundles
        this.bundles.forEach(bundle => this.container.invokeLater(bundle, 'init')() );
                    
        // Configure container defaults
        configureContainer(container);

        this.profiler.end('kernel.constructor');
    }

    /**
     * Bootstrap kernel
     */
    async boot() {

        this.profiler.start('kernel.boot');

        let { container, bundles } = this;

        // Boot time
        container.setParameter(Kernel.DI_PARAM_BOOTSTART, Date.now());

        // Logger
        let logger = await container.invokeAsync(Logger);
        
        logger.info('Kernel bootstrap');
        
        // Bundles services
        bundles.forEach(bundle => {
            let services = container.invokeLater(bundle, 'getServices')();
            container.add(...services);
        });

        // Initialize bundles
        await asyncEach( bundles, async bundle => await container.invokeLaterAsync(bundle, 'boot')() );

        // Time of boot end
        container.setParameter(Kernel.DI_PARAM_BOOTEND, Date.now());

        this.profiler.end('kernel.boot');

        
        // Freeze container
        container.add =
        container.addDefinition =
        container.set =
        container.setAlias =
        container.setFactory = () => { throw Error(`Container cannot be modified after kernel bootstrap`); }


        return this;
        
    }

    /**
     * Run kernel
     * @param params Optional kernel parameters
     */
    async run(...params: any[]) {
        this.container.setParameter(Kernel.DI_PARAM_PARAMETERS, params);

        // Run bundles
        await asyncEach( this.bundles, async bundle => await this.container.invokeLaterAsync(bundle, 'run')(...params));
    }

    /**
     * Add services to kernel container
     * @param services Services
     */
    addService(...services: Function[]) {
        this.container.add(...services);
        return this;
    }

    /**
     * Set kernel container parameter
     * @param key Parameter name
     * @param value Value
     */
    setParameter(key: string, value: any) {
        this.container.setParameter(key, value);
        return this;
    }

    /**
     * Load configuration file
     * @param config Configuration
     */
    async loadConfig(config: string | object) {
        this.profiler.start('kernel.config');
        let cachePath = this.rootDir + this.cacheDirectory + '/config.cache.json';
        let resolvedConfig: any;

        if (existsSync(cachePath)) {
            resolvedConfig = JSON.parse( readFileSync(cachePath).toString() );
        } else {
            resolvedConfig = await this.container.invoke(ConfigResolver).context({ kernel: this }).resolve(config);

            // Set cache directory
            if (resolvedConfig.kernel.cacheDir)
                this.cacheDirectory = resolvedConfig.kernel.cacheDir;

            // Cache resolved configuration
            if ( resolvedConfig.kernel.cacheConfig ) {
                if (!existsSync(cachePath))
                    mkdirSync( path.dirname(cachePath), { recursive: true });
                writeFileSync( cachePath, JSON.stringify(resolvedConfig));
            }
        }

        this.loadParameters(resolvedConfig.parameters);
        this.config = resolvedConfig;
        this.container.set('config', resolvedConfig);
        this.profiler.end('kernel.config');
        return this;
    }

    /**
     * Load parameters from json file or object
     * @param file Json File
     */
    loadParameters(file: string | object) {
        let parameters: any;

        if ( typeof file == 'string' ) {
            this.container.setParameter(Kernel.DI_PARAM_CONFIG_FILE, path.normalize(file) );
            if (!this.container.hasParameter(Kernel.DI_PARAM_ROOT)) {
                this.container.setParameter(Kernel.DI_PARAM_ROOT, path.resolve( path.dirname(file)) );
            }
            if ( file.endsWith('.json') )
                parameters = JSON.parse( readFileSync( file, { encoding: 'utf8' } ) );
            else
                parameters = require(file);
        } else {
            parameters = file;
        }

        Object.keys(parameters).forEach(key => {
            this.container.setParameter(key, parameters[key]);
        });

        return this;
    }

    /**
     * Dump container parameters
     */
    dumpParameters() {
        return this.container.getParameters();
    }

    /**
     * Load configuration file then Boot kernel and then run it
     * @param configFile Configuration file
     * @param params Run parameters
     */
    async bootAndRun( configFile?: string, ...params: any[]) {

        if ( configFile ) {
            await this.loadConfig({ $imports: configFile });
        }

        await this.boot();

        await this.run(...params);

    }

    /** Get Profiler */
    get profiler() { return this.container.invoke(Profiler)! }

    /** Get application root directory */
    get rootDir() { return this.container.getParameter(Kernel.DI_PARAM_ROOT); }

    /**
     * Dynamic import
     * @param name Name
     */
    use<T>(name: string): T {

        if ( name.startsWith('/') ) name = '.' + name;

        let filePath = this.resolvePath(name);
        let className = name.split('/').pop()!;

        let module = require(filePath);

        return module[className] || module.default;
    }

    /**
     * Resolve path
     * @param path Path
     */
    resolvePath(pathName: string) {

        // Import from another package
        if ( !pathName.startsWith('./') && !path.isAbsolute(pathName) ) {
            let moduleName = pathName.split('/').slice(0, pathName.startsWith('@') ? 2 : 1).join('/');
            let modulePath = getPackageDir(moduleName);
            pathName = modulePath + pathName.substr( moduleName.length );
        }

        // Find base directory from parent config file
        pathName = path.resolve(this.rootDir + this.sourceDirectory, pathName);

        // Normalize
        pathName = path.normalize(pathName);

        return pathName;

    }

    /**
     * Create simple web app
     * @param controllers Controllers
     */
    static async createWebApp(port: number, ...controllers: Function[]) {
        let { HttpBundle, Controller, isDecoratedController } = await import('./bundle/http');
        let { TwigBundle } = await import('./bundle/twig');

        let kernel = new Kernel(undefined, [ new HttpBundle, new TwigBundle ], new Container());
        kernel.setParameter(HttpBundle.DI_PARAM_PORT, port);
        controllers.forEach(controller => {
            if (controller instanceof Function && !isDecoratedController(controller)) {
                Controller()(controller);
            }
        })
        kernel.addService(...controllers);
        return kernel;
    }

}
