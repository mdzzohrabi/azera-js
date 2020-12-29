import { Container } from '@azera/container';
import { existsSync, promises as fs } from 'fs';
import * as path from 'path';
import { Bundle } from './Bundle';
import { CoreBundle } from './bundle/core/CoreBundle';
import { ConfigResolver } from './ConfigResolver';
import { ConfigSchema } from './ConfigSchema';
import configureContainer from './Container.Config';
import { Logger } from './Logger';
import { Profiler } from './Profiler';
import { enableSourceMap, getPackageDir } from './Util';
import { Cli } from './bundle/cli';

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

    /** Map path name to class name for import */
    public importClassNameFormatter?: (value: string, fullName: string) => string;

    constructor(
        // Kernel environment
        public readonly env?: string,
        // Kernel bundles
        public readonly bundles: Bundle[] = [],
        // Kernel dependency-injection container
        public readonly container: Container = new Container()
    ) {

        this.env = env = env || process.env.NODE_ENVIRONMENT || 'development';

        let kernel = this;
        let rootDir = container.hasParameter(Kernel.DI_PARAM_ROOT) ? container.getParameter(Kernel.DI_PARAM_ROOT) : getPackageDir();

        if ( container.hasParameter('kernel.sourceDir') ) this.sourceDirectory = container.getParameter('kernel.sourceDir');
        else if ( existsSync(rootDir + '/dist') ) this.sourceDirectory = '/dist';

        // Container parameters
        container.setParameter(Kernel.DI_PARAM_ROOT, rootDir);
        container.setParameter(Kernel.DI_PARAM_ENV, env);

        // Set kernel and Kernel refrence to current kernel
        container.setAlias(Kernel, kernel);

        // Configuration resolver
        container.setFactory(ConfigResolver, function objectResolverFactory() {
            return new ConfigResolver().context({ kernel, envExt: kernel.env == 'development' ? 'dev' : 'prod' }).resolver( container.invoke(ConfigSchema)!.resolver );
        });

        // Prepend CoreBundle
        this.bundles = [ new CoreBundle, ...this.bundles ];

        // Set alias for bundles in container
        this.bundles.forEach(bundle => {
            container
                .add(bundle.constructor)
                .setAlias(bundle.constructor, bundle); 
        });

        // Set bundles names as container parameter
        container.setParameter( 'kernel.bundles' , this.bundles.map(bundle => (bundle.constructor as any).bundleName || bundle.constructor.name ));

        // Initialize bundles
        for (let bundle of this.bundles) {
            container.invoke(bundle, 'init');
            container.invoke(Logger).debug(`${bundle.bundleName} initialized`);
        }
                    
        // Configure container defaults
        configureContainer(container);
    }

    /**
     * Bootstrap kernel
     */
    async boot() {      
        let { container, bundles, profiler } = this;
        
        profiler.start('kernel.boot');

        // Boot time
        container.setParameter(Kernel.DI_PARAM_BOOTSTART, Date.now());

        // Logger
        let logger = await container.invokeAsync(Logger);
        
        logger.debug('Kernel bootstrap');
        
        // Bundles services
        bundles.forEach(async bundle => {
            let services = await container.invokeAsync(bundle, 'getServices');
            container.add(...services);
        });

        profiler.start('kernel.boot.bundles', { bundles: bundles.map(bundle => bundle.bundleName)});
        
        // Initialize bundles
        for (let bundle of bundles) {
            profiler.start('kernel.boot.' + bundle.bundleName);
            await container.invokeAsync(bundle, 'boot');
            profiler.end('kernel.boot.' + bundle.bundleName);
        }
        profiler.end('kernel.boot.bundles');

        // Time of boot end
        container.setParameter(Kernel.DI_PARAM_BOOTEND, Date.now());

        profiler.end('kernel.boot');

        
        // Freeze container
        // container.add =
        // container.addDefinition =
        // container.set =
        // container.setAlias =
        // container.setFactory = () => { throw Error(`Container cannot be modified after kernel bootstrap`); }


        return this;
        
    }

    /**
     * Run kernel
     * @param params Optional kernel parameters
     */
    async run(...params: any[]) {
        let { container, profiler, bundles } = this;
       
        profiler.start('kernel.run');
        container.setParameter(Kernel.DI_PARAM_PARAMETERS, params);

        // Run bundles
        for (let bundle of bundles) {
            profiler.start(`kernel.run.${bundle.bundleName}`);
            await container.invokeAsync(bundle, 'run', ...params);
            profiler.end(`kernel.run.${bundle.bundleName}`);
        }

        profiler.end('kernel.run');
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
        let { container, profiler } = this;
        profiler.start('kernel.config');
        
        let cachePath = this.rootDir + this.cacheDirectory + '/config.cache.json';
        let resolvedConfig: any;

        try {
            await fs
            .readFile(cachePath)
            .then(cachedBuffer => resolvedConfig = JSON.parse( cachedBuffer.toString('utf8') ))
            .catch(async err => {
                resolvedConfig = await container.invoke(ConfigResolver).context({ kernel: this }).resolve(config)

                // Set cache directory
                if (resolvedConfig.kernel.cacheDir)
                    this.cacheDirectory = resolvedConfig.kernel.cacheDir;

                // Cache resolved configuration
                if ( true === resolvedConfig.kernel.cacheConfig ) {
                    if (!existsSync(cachePath))
                        await fs.mkdir( path.dirname(cachePath), { recursive: true });
                    await fs.writeFile( cachePath, JSON.stringify(resolvedConfig));
                }
            });
            
            // Clear logger
            container['instances'].delete(Logger);

            await this.loadParameters(resolvedConfig.parameters);
            this.config = resolvedConfig;

        } catch (err) {
            container.invoke(Cli).error(err.message);
        }

        container.set('config', resolvedConfig);
        profiler.end('kernel.config');
        return this;
    }

    /**
     * Load parameters from json file or object
     * @param file Json File
     */
    async loadParameters(file: string | object) {
        let parameters: any;

        if ( typeof file == 'string' ) {
            this.container.setParameter(Kernel.DI_PARAM_CONFIG_FILE, path.normalize(file) );
            if (!this.container.hasParameter(Kernel.DI_PARAM_ROOT)) {
                this.container.setParameter(Kernel.DI_PARAM_ROOT, path.resolve( path.dirname(file)) );
            }
            if ( file.endsWith('.json') )
                parameters = JSON.parse( (await fs.readFile( file, { encoding: 'utf8' } )).toString() );
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
     * Load configuration file then Boot kernel and then run it, e.g :
     * ```
     * Kernel.bootAndRun("./config.yml", "cli");
     * ```
     * @param configFile Configuration file
     * @param params Run parameters
     */
    async bootAndRun( configFile?: string, ...params: any[]) {

        if ( configFile ) {
            this.container.setParameter(Kernel.DI_PARAM_CONFIG_FILE, configFile);
            await this.loadConfig({ $imports: configFile });
        }

        await this.boot();

        await this.run(...params);

    }

    /**
     * Debug profiler
     */
    get profiler() { return this.container.invoke(Profiler)! }


    /**
     * Get application root directory, e.g :
     * ```
     * Kernel.rootDir; // returns "/home/app"
     * ```
     */
    get rootDir() { return this.container.getParameter(Kernel.DI_PARAM_ROOT); }

    /**
     * Will require entered file and return the exported class according to file name, e.g :
     * ```
     * Kernel.use("/controller/home-controller"); // returns HomeController class
     * Kernel.use("/controller/home-controller::indexAction"); // returns invokeLater(HomeController, 'indexAction') class
     * ```
     * @param fullName Name
     */
    use<T>(fullName: string): T | Function {
        let importName: string, method: string, path: string;
        [path, method] = fullName.split('::');
        [path, importName] = path.split('@');
        if ( path.startsWith('/') ) path = '.' + path;

        let className = this.importClassNameFormatter ? this.importClassNameFormatter(importName ?? path.split('/').pop()!, path) : importName ?? path.split('/').pop()!;

        let module = require(this.resolvePath(path));
        let target = module[className] || module.default;
        
        if (method) return this.container.invokeLater(target, method);
        return target;
    }

    /**
     * Resolve path, e.g :
     * ```
     * Kernel.resolvePath("@azera/stack/package.json"); // returns "/home/app/node_modules/@azera/stack/package.json"
     * Kernel.resolvePath("./package.json"); // returns "/home/app/package.json"
     * ```
     * @param path Path
     */
    resolvePath(pathName: string) {

        // Import from another package
        if ( !/^\.+\//.test(pathName) && !path.isAbsolute(pathName) ) {
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
     * Search for bundle instance
     * ```
     * getBundle(CoreBundle); // return `CoreBundle` instance
     * ```
     * @param bundle Bundle
     */
    getBundle(bundle: string | Function): Bundle | undefined {
        for (let item of this.bundles) {
            if (typeof bundle == 'string' && item.bundleName == bundle) return item;
            else if (typeof bundle == 'function' && item instanceof bundle) return item;
        }
    }

    /**
     * Check if given bundle registred
     * @param bundle Bundle
     */
    hasBundle(bundle: string | Function): boolean {
        return this.getBundle(bundle) !== undefined;
    }

    /**
     * Enable source map in errors
     */
    static enableSourceMap() {
        enableSourceMap();
        return this;
    }

    /**
     * Create a full-stack kernel.
     * 
     * Create new Kernel instance with all internal bundles (`Core`, `Cli`, `TypeORM`, `Twig`, `Http`, `etc`).
     * 
     * @param bundles Bundles
     * @param env Environment
     */
    static async createFullStack(bundles?: Bundle[], env?: string): Promise<Kernel> {
        let { HttpBundle } = await import('./bundle/http');
        let { CliBundle } = await import('./bundle/cli');
        let { TwigBundle } = await import('./bundle/twig');
        let { TypeORMBundle } = await import('./bundle/typeORM');
        let { MessageBundle } = await import('./bundle/message');
        let { MongooseBundle } = await import('./bundle/mongoose');
        let { MongoBundle } = await import('./bundle/mongo');
        let { SecurityBundle } = await import('./bundle/security');
        let { MakerBundle } = await import('./bundle/maker/MakerBundle');
        let { GraphQlBundle } = await import('./bundle/graph/GraphQlBundle');
        return new Kernel(env, [ new HttpBundle, new CliBundle, new TwigBundle, new TypeORMBundle, new MongooseBundle, new MessageBundle, new MongoBundle, new SecurityBundle, new MakerBundle, new GraphQlBundle, ...(bundles ?? []) ]);
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
