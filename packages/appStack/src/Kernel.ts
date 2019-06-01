import { Container } from '@azera/container';
import { Bundle } from './Bundle';
import { Logger } from './Logger';
import configureContainer from './Container.Config';
import { readFileSync } from 'fs';

/**
 * Application kernel
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class Kernel {

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
        container.setParameter('env', env);

        // Set kernel and Kernel refrence to current kernel
        container.set('kernel', this).setFactory(Kernel, function kernelFactory() {
            return kernel;
        });
        
        // Initialize bundles
        this.bundles.forEach(bundle => this.container.invokeLater(bundle, 'init')() );

        // Configure container defaults
        configureContainer(container);
    }

    /**
     * Bootstrap kernel
     */
    boot() {

        // Boot time
        this.container.setParameter('kernel.bootStart', Date.now());

        // Logger
        let logger = this.container.invoke(Logger)!;
        
        logger.info('Kernel bootstrap');

        // Initialize bundles
        this.bundles.forEach(bundle => this.container.invokeLater(bundle, 'boot')() );

        // Time of boot end
        this.container.setParameter('kernel.bootEnd', Date.now());

        return this;
        
    }

    /**
     * Run kernel
     * @param params Optional kernel parameters
     */
    run(...params: any[]) {
        this.container.setParameter('kernel.parameters', params);

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

        if ( typeof file == 'string' )
            parameters = JSON.parse( readFileSync( file, { encoding: 'utf8' } ) );
        else
            parameters = file;

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