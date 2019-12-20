import { Container, Inject } from '@azera/container';
import { Bundle } from '../../Bundle';
import { ConfigSchema } from '../../ConfigSchema';
import { Kernel } from '../../Kernel';
import { ConfigSchemaCommand } from './Command/ConfigSchemaCommand';
import { DumpProfilerCommand } from './Command/DumpProfilerCommand';
import { DiTagCommand } from './Command/DITagCommand';
import { Logger } from '../../Logger';
import { EventManager } from '../../EventManager';
import { WebClient } from '../../net';
import { CacheManager, MemoryCacheProvider } from '../../cache';
import { forEach } from '@azera/util';
import { FileCacheProvider } from '../../cache/FileCacheProvider';
import * as cluster from 'cluster';
import { createLogger, transports } from 'winston';

/**
 * Core bundle
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */ 
export class CoreBundle extends Bundle {

    static bundleName = 'Core';
    static version = '1.0.0';

    @Inject() init( config: ConfigSchema, container: Container ) {

        let kernel = container.invoke(Kernel)!;

        config
            .node('config', { description: 'Config validator configuration', type: 'object' })
            .node('config.allowExtra', { type: 'boolean', description: 'Allow custom configuration node', default: false, validate: (value, info) => {
                config.allowExtra = value;
                return value;
            } });

        config
            .node('web_client', { description: 'Web client configuration' })
            .node('web_client.proxy', { type: 'string', description: 'Web client proxy server e.g: "http://127.0.0.1:9090"' });

        config
            .node('kernel', { description: 'Kernel' })
            .node('kernel.handleError', { description: 'Handle node errors', type: 'boolean', default: true, validate: (value) => {
                if (value) this.handleError(container);
            } })
            .node('kernel.rootDir', { description: 'Application root directory path', type: 'string', default: kernel.rootDir })
            .node('kernel.cacheConfig', { description: 'Cache resolved configuration', type: 'boolean', default: true })
            .node('kernel.cacheDir', { description: 'Cache directory', default: '/cache', type: 'string' });

        // Configuration parameters
        config.node('parameters', {
            description: 'Container parameters',
            type: 'object'
        });

        config
            .node('services', { description: 'Container services', type: 'array|object' })
            .node('services.*', { description: 'Service', type: 'object|string', validate: function(service) {
                    //if (typeof service == 'string') return { service };
                    return service;
                }
            })
            .node('services.*.tags', { description: 'Service tags', type: 'array', skipChildren: true })
            .node('services.*.service', { description: 'Service name', type: 'string' })
            .node('services.*.imports', { description: 'Service imports', type: 'array' })
            .node('services.*.private', { description: 'Service singleton or shared', type: 'boolean' })
            ;

        config
            .node('cache', { description: 'Cache manager' })
            .node('cache.providers', { description: 'Cache providers', type: 'object' })
            .node('cache.providers.*', { description: 'Cache provider' })
            .node('cache.providers.*.type', { description: 'Cache provider type', type: 'enum:memory,file' })
            .node('cache.providers.*.path', { description: 'Cache provider path', type: 'string' })

        container.add(EventManager);

        /**
         * WebClient
         */
        container.setFactory(WebClient, function webClientFactory($config) {
            let client = new WebClient();
            if ($config && $config.web_client && $config.web_client.proxy) {
                client.setProxy($config.web_client.proxy);
            }
            return client;
        });

        // CacheManager
        container.setFactory(CacheManager, function cacheManagerFactory($config) {
            let manager = new CacheManager();
            let providers = $config?.cache?.providers || {};
            forEach(providers, (config: any, name) => {
                let type = config?.type || 'memory';
                switch (type) {
                    case 'memory': {
                        let provider = new MemoryCacheProvider();
                        provider.name = name;
                        manager.addProvider(provider);
                        break;
                    }
                    case 'file': {
                        let provider = new FileCacheProvider(name, config?.path);
                        manager.addProvider(provider);
                        break;
                    }
                    default: {
                        throw Error(`Provider type "${ type }" for provider "${ name }" not found`)
                    }
                }
            });
            return manager;
        });

        // Logger
        container.setFactory(Logger, function loggerFactory() {
            let defaultMeta = { ...container.getParameter('logger.metas', {}) };
            if (cluster.isWorker) {
                defaultMeta['workerId'] = cluster.worker.id;
            }
            return createLogger({
                transports: [
                    new transports.Console
                ],
                defaultMeta,
            })
        });

    }

    @Inject() handleError(serviceContainer: Container) {
        process.on('uncaughtException', error => {
            serviceContainer.invoke(Logger).error(error as any);
        });

        process.on('unhandledRejection', error => {
            serviceContainer.invoke(Logger).error(error as any);
        });
    }

    getServices() {
        return [
            DumpProfilerCommand,
            ConfigSchemaCommand,
            DiTagCommand ];
    }

    @Inject() boot(container: Container) {

        let profile = container.getParameter('debug.profile', false);
        let config: any = container.getParameter('config', {});

        let { services, kernel: kernelConfig } = config || { services: {}, kernel: {} };
        let kernel = container.invoke(Kernel)!;

        // Kernel configuration
        if ( kernelConfig ) {

            // Root directory
            if ( kernelConfig.rootDir )
                container.setParameter(Kernel.DI_PARAM_ROOT, kernelConfig.rootDir);

        }

        // Configuration services
        if (services) {
            profile && kernel.profiler.start('core.services');
            Object.keys(services).forEach(serviceName => {
                let service = services[serviceName];
                // Added services
                if (!service) {
                    container.add( kernel.use(serviceName) );
                } else if ( typeof service == 'string' ) {
                    container.add(kernel.use(service));
                } else {
                    service.service = kernel.use(service.service);
                    container.set(serviceName, service);
                }

            });
            profile && kernel.profiler.end('core.services');
        }   

    }

}