import { Container, Inject } from '@azera/container';
import { forEach } from '@azera/util';
import * as cluster from 'cluster';
import { createLogger, transports } from 'winston';
import { Bundle } from '../../Bundle';
import { CacheManager, MemoryCacheProvider } from '../../cache';
import { FileCacheProvider } from '../../cache/FileCacheProvider';
import { ConfigSchema } from '../../ConfigSchema';
import { EventManager } from '../../EventManager';
import { camelCase, pascalCase, snakeCase } from '../../helper';
import { Kernel } from '../../Kernel';
import { Logger } from '../../Logger';
import { WebClient } from '../../net';
import { ConfigSchemaCommand } from './Command/ConfigSchemaCommand';
import { DiTagCommand } from './Command/DITagCommand';
import { DumpProfilerCommand } from './Command/DumpProfilerCommand';
import { WorkflowManager, Workflow } from '../../workflow';
import { CacheCleanCommand } from './Command/CacheCleanCommand';
import { DiParametersCommand } from './Command/DIParametersCommand';
import { ContainerInvokeOptions } from '@azera/container/build/container';

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
            .node('kernel.uncaughtExceptionHandler', { description: 'Node uncaught exception handler. e.g: /Kernel::errorHandler', type: 'string', validate(value) { return kernel.use(value) } })
            .node('kernel.rootDir', { description: 'Application root directory path', type: 'string', default: kernel.rootDir })
            .node('kernel.cacheConfig', { description: 'Cache resolved configuration', type: 'boolean', default: false })
            .node('kernel.cacheDir', { description: 'Cache directory', default: '/cache', type: 'string' })
            .node('kernel.classNameFormatter', { description: 'Formatter to convert name to className for Kernel.use() method', default: 'pascalCase', type: 'enum:pascalCase,snakeCase,camelCase' })
            .node('kernel.logger', { description: 'Logger', type: 'object' })
            .node('kernel.logger.metas', { description: 'Logger metas', type: 'object' })
            .node('kernel.logger.transports', { description: 'Logger transports', type: 'array' })
            .node('kernel.logger.transports.*', { description: 'Logger transport', type: 'object' })
            .node('kernel.logger.transports.*.type', { description: 'Logger transport type', type: 'enum:console,file' })
            .node('kernel.logger.transports.*.filename', { description: 'Logger transport file', type: 'string', validate: (value, info) => { return info.resolvePath(value); } })
            .node('kernel.logger.transports.*.level', { description: 'Logger transport level (error,warn,info,verbose,debug,silly)', type: 'string' })
        ;

        // Configuration parameters
        config.node('parameters', {
            description: 'Container parameters',
            type: 'object',
            afterResolve(value, info) {
                Object.assign(info.context, value);
                return value;
            }
        });

        config
            .node('services', { description: 'Container services', type: 'array|object' })
            .node('services.*', { description: 'Service', type: 'object|string', validate: function(service) {
                    //if (typeof service == 'string') return { service };
                    return service;
                }
            })
            .node('services.*.methods', { description: 'Service method calls', type: 'object' })
            .node('services.*.methods.*', { description: 'Service method call', type: 'object' })
            .node('services.*.tags', { description: 'Service tags', type: 'array', skipChildren: true })
            .node('services.*.service', { description: 'Service name', type: 'string' })
            .node('services.*.imports', { description: 'Service imports', type: 'array' })
            .node('services.*.private', { description: 'Service singleton or shared', type: 'boolean' })
            ;

        config
            .node('cache', { description: 'Cache manager' })
            .node('cache.defaultProvider', { description: 'Default cache provider', type: 'string' })
            .node('cache.providers', { description: 'Cache providers', type: 'object' })
            .node('cache.providers.*', { description: 'Cache provider' })
            .node('cache.providers.*.type', { description: 'Cache provider type', type: 'enum:memory,file' })
            .node('cache.providers.*.path', { description: 'Cache provider path', type: 'string' })

        config
            .node('workflow', { description: 'Workflow manager' })
            .node('workflow.workflows', { description: 'Workflows', type: 'object' })
            .node('workflow.workflows.*', { description: 'Workflow', type: 'object' })
            .node('workflow.workflows.*.supports', { description: 'Supported types', type: 'string|array' })
            .node('workflow.workflows.*.places', { description: 'States', type: 'array' })
            .node('workflow.workflows.*.initial', { description: 'Initial state', type: 'string' })
            .node('workflow.workflows.*.property', { description: 'Object property name', type: 'string' })
            .node('workflow.workflows.*.transitions', { description: 'Workflow transitions', type: 'object' })
            .node('workflow.workflows.*.transitions.*', { description: 'Workflow transition', type: 'object' })
            .node('workflow.workflows.*.transitions.*.from', { description: 'Source states', type: 'string|array' })
            .node('workflow.workflows.*.transitions.*.to', { description: 'Destination state', type: 'string' })
            .node('workflow.workflows.*.transitions.*.metadata', { description: 'Supported types', type: 'string|array|object' })
            .node('workflow.workflows.*.transitions.*.guard', { description: 'Transition guard expression (vars: subject)', type: 'string' })

        config
            .node('event_manager', { description: 'Event manager' })
            .node('event_manager.events', { description: 'Event listeners' })
            .node('event_manager.events.*', { description: 'Event', type: 'object' })
            .node('event_manager.events.*.*', { description: 'Event listener', type: 'array' })

        container.add(EventManager);

        /**
         * WebClient
         */
        container.setFactory(WebClient, function webClientFactory($config) {
            let client = new WebClient();
            if ($config?.web_client?.proxy) {
                client.setProxy($config.web_client.proxy);
            }
            return client;
        });

        // CacheManager
        container.setFactory(CacheManager, function cacheManagerFactory($config) {
            let manager = new CacheManager();
            let defaultProvider = $config?.cache?.defaultProvider;
            let providers = $config?.cache?.providers || {};
            manager.defaultProvider = defaultProvider;
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
        container.setFactory(Logger, function loggerFactory(invokeOptions: ContainerInvokeOptions) {

            let $config = container.getParameter('config', {});
            let $logger = container.getParameter('logger.metas', {});

            let defaultMeta = { ...( $logger?.metas ?? {} ) };
            let config = { metas: {}, transports: [
                { type: 'console', level: 'info' }
            ] , ...($config?.kernel?.logger ?? {}) } as {
                metas: any,
                transports: { type: string, filename?: string, level?: string }[]
            };

            // Add worker Id in clustered process
            if (cluster.isWorker) {
                defaultMeta['workerId'] = cluster.worker.id;
            }

            // Create logger instance
            return createLogger({
                transports: config.transports.map(transport => {
                    switch (transport.type) {
                        case 'console':
                            return new transports.Console(transport);
                        case 'file':
                            return new transports.File(transport);
                        default:
                            throw new Error(`Logger transport "${transport.type}" not found`);
                    }
                }),
                defaultMeta,
            })
        }, false);

        // Workflow
        container.addPipe(WorkflowManager, workflowManager => {
            let workflows = container.getParameter('config', {}).workflow?.workflows ?? {};
            forEach(workflows, (workflow: Workflow, name) => {
                if (typeof workflow.supports == 'string') {
                    workflow.supports = [workflow.supports];
                }

                if (typeof workflow.transitions == 'object') {
                    for (let transition in workflow.transitions) {
                        workflow.transitions[transition].guard = eval(`(subject) => ${workflow.transitions[transition]}`);
                    }
                }


                let workflowObj = new Workflow(
                    name,
                    workflow.places,
                    workflow.initial,
                    (workflow.supports ?? []).map(support => kernel.use(support as any)),
                    workflow.transitions,
                    workflow.property
                );
                
                workflowManager.addWorkflow(workflowObj);
            });
        });

        // EventManager
        container.addPipe(EventManager, eventManager => {
            let events = container.getParameter('config', {}).event_manager?.events ?? {};
            
            forEach(events, (listeners: string[], name) => {
                listeners.map(listener => kernel.use(listener)).forEach(listener => {
                    if (typeof listener !== 'function') throw Error(`Event listener must be a function but type of "${typeof listener}" given`);
                    eventManager.on(name, listener as any);
                });
            });
        });

    }

    @Inject() handleError(serviceContainer: Container) {
        let errorHandler = serviceContainer.getParameter('config', {}).kernel?.uncaughtExceptionHandler;

        if (errorHandler) {
            process.on('uncaughtException', errorHandler);
            process.on('unhandledRejection', errorHandler);
        } else {
            process.on('uncaughtException', error => {
                serviceContainer.invoke(Logger).error(error as any);
            });

            process.on('unhandledRejection', error => {
                serviceContainer.invoke(Logger).error(error as any);
            });
        }
    }

    getServices() {
        return [
            DumpProfilerCommand,
            ConfigSchemaCommand,
            DiTagCommand,
            DiParametersCommand,
            CacheCleanCommand ];
    }

    @Inject() boot(container: Container) {
        
        let kernel = container.invoke(Kernel)!;
        let config = container.getParameter('config', {
            services: {} as any,
            kernel: {
                rootDir: undefined,
                classNameFormatter: 'pascalCase',
                cacheConfig: false
            }
        });

        let { services, kernel: kernelConfig } = config;

        // Kernel configuration
        if ( kernelConfig ) {
            // Root directory
            if ( kernelConfig.rootDir )
                container.setParameter(Kernel.DI_PARAM_ROOT, kernelConfig.rootDir);

            switch (kernelConfig.classNameFormatter) {
                case 'pascalCase':
                    kernel.importClassNameFormatter = pascalCase;
                    break;
                case 'snakeCase':
                    kernel.importClassNameFormatter = snakeCase;
                    break;
                case 'camelCase':
                    kernel.importClassNameFormatter = camelCase;
                    break;
                default:
                    throw Error(`Import formatter "${ kernelConfig.classNameFormatter }" not defined`);
            }
        }

        // Configuration services
        if (services) {
            kernel.profiler.start('core.services');
            Object.keys(services).forEach(serviceName => {
                let service = services[serviceName];
                // Added services
                if (!service) {
                    container.add( kernel.use(serviceName) );
                } else if ( typeof service == 'string' ) {
                    container.add(kernel.use(service));
                } else {
                    service.service = kernel.use(service.service || serviceName);
                    container.set(serviceName, service);
                }

            });
            kernel.profiler.end('core.services');
        }   

    }

}