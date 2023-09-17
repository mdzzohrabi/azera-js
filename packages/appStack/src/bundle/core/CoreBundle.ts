import { Container, ContainerInvokeOptions, Inject } from '@azera/container';
import { forEach, is } from '@azera/util';
import { createLogger, transports } from 'winston';
import { CacheManager, CacheProvider } from '../../cache';
import { ConfigSchema } from '../../config/ConfigSchema';
import { EventManager } from '../../event/EventManager';
import { Str } from '../../helper';
import { Kernel } from '../../kernel/Kernel';
import { Logger } from '../../logger/Logger';
import { WebClient } from '../../net';
import { RateLimiter } from '../../rate-limiter/RateLimiter';
import { RateLimiterLimit } from '../../rate-limiter/RateLimiterLimit';
import { AbstractRateLimitStrategy } from '../../rate-limiter/strategy/AbstractRateLimitStrategy';
import { Workflow, WorkflowManager } from '../../workflow';
import { Bundle } from '../Bundle';
const cluster = require('cluster');

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
            .node('kernel.handleError', { description: 'Handle node errors', type: 'boolean', default: true, validate: value => value && this.handleError(container) })
            .node('kernel.uncaughtExceptionHandler', { description: 'Node uncaught exception handler. e.g: /Kernel::errorHandler', type: 'string', validate: value => kernel.use(value) })
            .node('kernel.rootDir', { description: 'Application root directory path', type: 'string', default: kernel.rootDir })
            .node('kernel.cacheConfig', { description: 'Cache resolved configuration', type: 'boolean', default: false })
            .node('kernel.cacheDir', { description: 'Cache directory', default: '/cache', type: 'string' })
            .node('kernel.classNameFormatter', { description: 'Formatter to convert name to className for Kernel.use() method', default: 'pascalCase', type: 'enum:pascalCase,snakeCase,camelCase' })
            .node('kernel.logger', { description: 'Logger', type: 'object' })
            .node('kernel.logger.metas', { description: 'Logger metas', type: 'object' })
            .node('kernel.logger.transports', { description: 'Logger transports', type: 'array' })
            .node('kernel.logger.transports.*', { description: 'Logger transport', type: 'object' })
            .node('kernel.logger.transports.*.type', { description: 'Logger transport type', type: 'enum:console,file' })
            .node('kernel.logger.transports.*.filename', { description: 'Logger transport file', type: 'string', validate: (value, info) => info.resolvePath(value) })
            .node('kernel.logger.transports.*.level', { description: 'Logger transport level (error,warn,info,verbose,debug,silly)', type: 'string' })
        ;

        // Source Generator
        config
            .node('source_generator', { description: 'Source generator' })
            .node('source_generator.enabled', { default: true })
        ;

        // Configuration parameters
        config.node('parameters', {
            description: 'Container parameters',
            type: 'object',
            afterResolve(value, info) {
                Object.assign(info.context, value);
                return value;
            }
        })
        .node('parameters.*', { description: 'Container parameter', type: 'string|object|array|number|boolean' });

        config
            .node('services', { description: 'Container services', type: 'array|object' })
            .node('services.*', { description: 'Service', type: 'object|string|function', validate: function(service) {
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
            .node('cache.providers.*', { description: 'Cache provider', type: 'object|string' })
            .node('cache.providers.*.type', { description: 'Cache provider type (e.g: memory,file,redis)', type: 'string' })
            .node('cache.providers.*.path', { description: 'Cache provider path/url', type: 'string', validate: (value, info) => info.resolvePath(value) });

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
            .node('event_manager.events.*.*', { description: 'Event listener', type: 'array' });

        config
            .node('rate_limiter', { description: 'Rate limiters' })
            .node('rate_limiter.*', { description: 'Rate limiter' })
            .node('rate_limiter.*.strategy', { description: 'Rate limiter strategy (e.g: fixed_window, slide_window, token_bucket)' })
            .node('rate_limiter.*.limit', { description: 'Rate limiter window limited tokens' })
            .node('rate_limiter.*.interval', { description: 'Rate limiter window reset interval' })
            .node('rate_limiter.*.cache_provider', { description: 'Rate limiter cache provider name (if empty it will use defaultProvider)' })
        ;

        container.add(EventManager);
        container.autoTag(CacheProvider, [`cache_provider`]);
        container.autoTag(AbstractRateLimitStrategy, ['rate_limiter_strategy']);

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

            // Default cache provider
            manager.defaultProvider = $config?.cache?.defaultProvider;
            
            // Providers Class
            let providers = container.findByTag<typeof CacheProvider>(`cache_provider`);
            
            // Providers
            for (let [name, config] of Object.entries($config?.cache?.providers || {})) {
                let url: URL | undefined;
                let schema: string = 'memory';
                
                if (is.String(config)) {
                    url = new URL(config);
                    schema = url.protocol.replace(':', '');
                } else {
                    let { type = schema , path } = config as any || {};
                    schema = type;
                    if (typeof path == 'string') {
                        if (!path.match(/\:[\/\\]/)) path = 'none://' + path;
                        url = new URL(path);
                    }
                }
                
                let provider = providers.find(p => p.service?.schema == schema);
                if (!provider) throw Error(`Cache provider "${schema}" not found`);
                let instance = container.invoke<CacheProvider>(provider.service!);
                instance.name = name;
                instance.url = url;
                manager.addProvider(instance);
            }

            return manager;
        });

        // Default cache provider
        container.setFactory(CacheProvider, () => container.invoke(CacheManager).get());

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
            if (cluster.isPrimary) {
                defaultMeta['workerId'] = cluster.worker?.id;
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

        // Rate Limiter
        container.setFactory(RateLimiter, async function rateLimiterFactory() {
            let config = container.getParameter('config', {}).rate_limiter ?? {};
            let strategies = await container.getByTagAsync<AbstractRateLimitStrategy>('rate_limiter_strategy');
            let limiters: RateLimiterLimit[] = [];
            forEach(config, (limit: any, name: string) => {
                limiters.push(new RateLimiterLimit(
                    name, limit.limit ?? 1000 , limit.interval ?? 60 * 1000 , limit.strategy ?? 'fixed_window', limit.cache_provider
                ));
            });

            return new RateLimiter(strategies, limiters);
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

    async getServices() {
        return [
            // Commands
            (await import('./Command/DumpProfilerCommand')).DumpProfilerCommand,
            (await import('./Command/ConfigSchemaCommand')).ConfigSchemaCommand,
            (await import('./Command/DITagCommand')).DiTagCommand,
            (await import('./Command/DIParametersCommand')).DiParametersCommand,
            (await import('./Command/CacheCleanCommand')).CacheCleanCommand,
            // Cache providers
            (await import('../../cache/provider/FileCacheProvider')).FileCacheProvider,
            (await import('../../cache/provider/RedisCacheProvider')).RedisCacheProvider,
            (await import('../../cache/provider/MemoryCacheProvider')).MemoryCacheProvider,
            (await import('../../cache/provider/MongoCacheProvider')).MongoCacheProvider
        ];
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
                    kernel.importClassNameFormatter = Str.pascalCase;
                    break;
                case 'snakeCase':
                    kernel.importClassNameFormatter = Str.snakeCase;
                    break;
                case 'camelCase':
                    kernel.importClassNameFormatter = Str.camelCase;
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
                } else if ( typeof service == 'function' ) {
                    container.add(service);
                } else {
                    service.service = kernel.use(service.service || serviceName);
                    container.set(serviceName, service);
                }
            });
            kernel.profiler.end('core.services');
        }   

    }

}