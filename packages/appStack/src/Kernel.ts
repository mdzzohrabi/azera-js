import { Container } from '@azera/container';
import { Bundle } from './Bundle';
import { Logger } from './Logger';
import configureContainer from './Container.Config';
import { readFileSync } from 'fs';
import * as path from 'path';

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

    constructor(
        // Kernel environment
        public env: string = 'dev',
        // Kernel bundles
        public bundles: Bundle[] = [],
        // Kernel dependency-injection container
        public container: Container = new Container()
    ) {

        let kernel = this;

        // Container parameters
        container.setParameter(Kernel.DI_PARAM_ENV, env);

        // Set kernel and Kernel refrence to current kernel
        container.setAlias(Kernel, kernel);

        container.setParameter( 'kernel.bundles' , this.bundles.map(bundle => 
            (bundle.constructor as any).bundleName || bundle.constructor.name ));
        
        // Initialize bundles
        this.bundles.forEach(bundle => this.container.invokeLater(bundle, 'init')() );

        // Bundles services
        this.bundles.forEach(bundle => {
            let services = this.container.invokeLater(bundle, 'getServices')();
            container.add(...services);
        });

        // Configure container defaults
        configureContainer(container);
    }

    /**
     * Bootstrap kernel
     */
    boot() {

        // Boot time
        this.container.setParameter(Kernel.DI_PARAM_BOOTSTART, Date.now());

        // Logger
        let logger = this.container.invoke(Logger)!;
        
        logger.info('Kernel bootstrap');

        // Initialize bundles
        this.bundles.forEach(bundle => this.container.invokeLater(bundle, 'boot')() );

        // Time of boot end
        this.container.setParameter(Kernel.DI_PARAM_BOOTEND, Date.now());

        return this;
        
    }

    /**
     * Run kernel
     * @param params Optional kernel parameters
     */
    run(...params: any[]) {
        this.container.setParameter(Kernel.DI_PARAM_PARAMETERS, params);

        // Run bundles
        this.bundles.forEach(bundle => this.container.invokeLater(bundle, 'run')(...params));
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

}