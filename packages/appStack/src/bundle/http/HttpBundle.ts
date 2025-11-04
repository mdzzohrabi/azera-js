import { Container, Inject } from '@azera/container';
import { forEach, is } from '@azera/util';
import cluster from 'cluster';
import * as express from 'express';
import * as path from 'path';
import { ConfigSchema } from '../../config/ConfigSchema';
import { Profiler } from '../../debug/Profiler';
import { EventManager } from '../../event/EventManager';
import { debugName, invariant } from '../../helper/Util';
import { Kernel } from '../../kernel/Kernel';
import { Logger } from '../../logger/Logger';
import { Bundle } from '../Bundle';
import { DumpRoutesCommand } from './Command/DumpRoutesCommand';
import { HttpStartCommand } from './Command/HttpStartCommand';
import { MiddlewaresCollection, MIDDLEWARES_PROPERTY } from './decorator/Middleware';
import { RoutesCollection, ROUTES_PROPERTY } from './decorator/Route';
import { EVENT_CONFIGURE_ROUTE, EVENT_HTTP_ACTION, EVENT_HTTP_ERROR, EVENT_HTTP_EXPRESS, EVENT_HTTP_EXPRESS_INIT, EVENT_HTTP_LISTEN, EVENT_HTTP_RESULT, HttpActionEvent, HttpErrorEvent, HttpResultEvent, HttpRouteConfigEvent } from './Events';
import { HttpEventSubscriber } from './HttpEventSubsriber';
import { HttpCoreMiddlewareFactory } from './middleware/CoreMiddleware';
import { createRateLimiterMiddleware } from './rate-limiter/RateLimiterMiddleware';
import { isHttpRequest, Request } from './Request';
import { NextFn, Response } from './Response';
import { IHttpConfigRouteObject, IHttpRouteHandlerObject } from './Types';

export { express };

/**
 * Http Bundle
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class HttpBundle extends Bundle {

    static static = express.static;

    static DI_TAG_MIDDLEWARE = 'http.middleware';
    static DI_TAG_CONTROLLER = 'http.controller';

    static EVENT_LISTEN = EVENT_HTTP_LISTEN;
    static EVENT_EXPRESS_INIT = EVENT_HTTP_EXPRESS_INIT;
    static EVENT_EXPRESS = EVENT_HTTP_EXPRESS;
    static EVENT_ERROR = EVENT_HTTP_ERROR;
    static EVENT_CONFIGURE_ROUTE = EVENT_CONFIGURE_ROUTE;

    /** Http listen port */
    static DI_PARAM_PORT = 'httpPort';

    /** Views directory */
    static DI_PARAM_VIEWS = 'httpViews';

    /** Express view engine */
    static DI_PARAM_VIEW_ENGINE = 'httpViewEngine';

    /** Http server (express) service name */
    static DI_SERVER = 'http.server';

    public server: express.Express | undefined;

    constructor(
        // Middlewares
        public middlewares: express.RequestHandler[] = [
            express.json()
        ]
    ) { super(); }

    init( @Inject() container: Container, @Inject() config: ConfigSchema, @Inject(Kernel.DI_PARAM_ROOT) rootDir: string ) {

        let httpBundle = this;
        let kernel = container.invoke(Kernel);

        // Configuration
        config
            .node('parameters.' + HttpBundle.DI_PARAM_VIEWS, { description: 'Web server views directory', type: 'string', required: true, validate: this._normalizeViewsDir.bind(this, rootDir), default: this._normalizeViewsDir.bind(this, rootDir, './views') })
            .node('parameters.' + HttpBundle.DI_PARAM_PORT, { description: 'Web server port', type: 'number', required: true, default: 9090 })
            .node('web', { description: 'Web server configuration', type: 'object' })
            .node('web.forks', { description: 'Number of application forks', type: 'number', default: 1 })
            .node('web.port', { description: 'Web server port', type: 'number' })
            .node('web.host', { description: 'Web server hostname', type: 'string' })
            .node('web.routes', { description: 'Route collection', type: 'object' })
            .node('web.routes.*', {
                description: 'Route item',
                type: 'string|array|object',
                validate(value, node) {
                    if (typeof value == 'string') return { controller: value, method: 'get', type: 'controller' };
                    return value;
                }
            })
            .node('web.routes.*.controller', { description: 'Route controller', type: 'string', validate(controller) { return kernel.use(controller) } })
            .node('web.routes.*.type', { description: 'Route type', type: 'enum:static,controller', default: 'controller' })
            .node('web.routes.*.method', { description: 'Method', type: 'enum:get,post,put,delete,head', default: 'get' })
            .node('web.routes.*.rate_limiter', { description: 'Apply Rate-limiter middleware', type: 'array' })
            .node('web.routes.*.rate_limiter.*', { description: 'Rate-limiter middleware', type: 'object' })
            .node('web.routes.*.rate_limiter.*.name', { description: 'Limiter name that defined in rate_limiter config', type: 'string' })
            .node('web.routes.*.rate_limiter.*.key', { description: 'Limiter key path based on request object', type: 'string' })
            .node('web.routes.*.rate_limiter.*.message', { description: 'Limiter exeeded message', type: 'string' })
            .node('web.routes.*.rate_limiter.*.tokens', { description: 'Limiter tokens (Default: 1)', type: 'string' })
            .node('web.routes.*.resource', { description: 'Route resource (e.g: /home/public)', type: 'string', validate(value, info) {
                return info.resolvePath(value);
            } })
        ;

        // Register middlewares
        this.middlewares.forEach((middle, i) => {
            container.set( 'http.middleware_' + i + '_' + (middle as any).name, { tags: [ HttpBundle.DI_TAG_MIDDLEWARE ], service: function middleFactory() { return middle; } });
        })

        // Default middlewares
        container.add(HttpCoreMiddlewareFactory);

        // Default listen port
        container.setParameter(HttpBundle.DI_PARAM_PORT, 9095);
 
        // Decorated parameters factory
        container
            // Request
            .argumentConverter(Request, ({ parameters }) => {
                if (isHttpRequest(parameters[0])) return parameters[0];
                return null;
            })
            // Response
            .argumentConverter(Response, ({ parameters }) => {
                if ('end' in parameters[1]) return parameters[1];
                return null;
            })
            // Next
            .argumentConverter(NextFn, ({ parameters }) => {
                if (arguments[2] instanceof Function) return parameters[2];
                return null;
            })
            
        container.setFactory(HttpBundle.DI_SERVER, async function expressFactory() {
            let server = httpBundle.server = express();
            let middlewares = await container.getByTagAsync(HttpBundle.DI_TAG_MIDDLEWARE) as any[];
            let controllers = await container.getByTagAsync(HttpBundle.DI_TAG_CONTROLLER) as any[];
            let profiler = await container.invokeAsync(Profiler);
            let events = await container.invokeAsync(EventManager);
            let config = container.getParameter('config', {});

            events.emit(HttpBundle.EVENT_EXPRESS_INIT, server);

            // Setup middlewares
            middlewares.forEach((middle: any) => {

                if (!is.Function(middle)) throw Error(`Http Middleware must be a function, but ${ debugName(middle) } given`);

                if ('middlewarePath' in middle) {
                    server.use(middle.middlewarePath, middle);
                } else {
                    server.use(middle);
                }
            });

            let router = server._router;
              
            // Controllers
            controllers.forEach(controller => {
    
                let routePrefix = controller['routePrefix'] || '';
    
                // Controller routes
                let routes = (<RoutesCollection>controller)[ ROUTES_PROPERTY ] || [];

                // Middlewares
                let middlewares = (<MiddlewaresCollection>controller)[ MIDDLEWARES_PROPERTY ] || [];
   
                // Controller service definition
                let definition = container.getDefinition(controller.constructor);
    
                // Injected controller methods
                let injectedMethods = Object.keys(definition.methods);

                // Register controller middlewares
                middlewares.forEach(middle => {
                    if ( typeof middle == 'function' ) {
                        server.use( routePrefix , middle as any );
                    } else if ( Array.isArray(middle) ) {
                        server.use( routePrefix , container.invokeLaterAsync(middle) );
                    } else {
                        server.use( routePrefix + middle.path, container.invokeLaterAsync(controller, middle.methodName) );
                    }
                });
               
                // Register controller routes
                routes.forEach(route => {

                    let routePath = routePrefix + route.path;
                    let routeObj = router.route(routePath);
                    let handler: Function;
                    let middles = (controller.methodMiddlewares && (<MiddlewaresCollection>controller).methodMiddlewares[route.action] || []).map((middle: any) => {
                         if (Array.isArray(middle)) return container.invokeLaterAsync(middle);
                        return middle;
                    });
    
                    if ( injectedMethods.includes(route.action) ) {
                        handler = container.invokeLaterAsync(controller, route.action);
                    } else {
                        handler = (<Function>controller[ route.action ]).bind( controller );
                    }
                                      
                    let event = new HttpActionEvent(routePath, route.method, route.action, controller, handler);
                    events.emit(EVENT_HTTP_ACTION, event);

                    routeObj[ event.method ]( middles, httpBundle.$handleRequestWithProfile( profiler, event.controller, event.action, event.method, event.handler, events ) );

                    routeObj.controller = controller;
                    routeObj.methodName = route.action;
    
                });
    
            });


            httpBundle.configureRoutesFromConfiguration(kernel, server, config?.web?.routes || {});

            // Event handler
            if ( events.listenerCount(HttpBundle.EVENT_ERROR) > 0 ) {
                server.use(function builtInErrorHandler(err: Error, req: Request, res: Response, next: NextFn) {
                    events.emit(HttpBundle.EVENT_ERROR, new HttpErrorEvent(err, req, res, next));
                });
            }

            events.emit(HttpBundle.EVENT_EXPRESS, server);

            return server;
    
        });
    }

    async configureRoutesFromConfiguration(kernel: Kernel, app: express.Express, routes: { [path: string]: object | object[] }) {     

        let container = kernel.container;
        let eventManager = await container.invokeAsync(EventManager);
        let profiler = await container.invokeAsync(Profiler);
        let httpBundle = this;

        forEach(routes, (route, routePath) => {
            // Bug: ingore star
            if (routePath == '*') return;
            if (Array.isArray(route)) {
                route.forEach(item => {
                    let handler = resolveRoute(item);
                    eventManager.emit(HttpBundle.EVENT_CONFIGURE_ROUTE, new HttpRouteConfigEvent(item, handler));
                    app[handler.method](routePath, handler.middlewares, handler.handler as any);
                })
            } else {
                let handler = resolveRoute(route);
                eventManager.emit(HttpBundle.EVENT_CONFIGURE_ROUTE, new HttpRouteConfigEvent(route, handler));
                app[handler.method](routePath, handler.middlewares, handler.handler as any);
            }
        });

        function resolveRoute(handler: IHttpConfigRouteObject): IHttpRouteHandlerObject {
            if (typeof handler == 'object') {
                let type = handler.type ?? 'controller';
                let method = (handler.method ?? 'get').toLowerCase() as any;
                let middlewares: any[] = [];

                // Rate limiter middleware
                if (handler.rate_limiter && Array.isArray(handler.rate_limiter)) {
                    handler.rate_limiter.forEach(limit => {
                        middlewares.push(createRateLimiterMiddleware({
                            limiterName: limit.name,
                            requestKey: limit.key,
                            message: limit.message,
                            tokens: limit.tokens
                        }).bind({}, container));
                    });
                }

                switch (type) {
                    case 'controller':
                        invariant(handler.controller, 'Controller not defined for route');
                        let [controller, action] = handler.controller!.split('::');
                        let target = kernel.use(controller) as any;
                        if (action) {
                            return { handler: httpBundle.$handleRequestWithProfile(profiler, target, action, method, container.invokeLaterAsync( container.invoke(target) , action), eventManager), method, middlewares };
                        } else {
                            return { handler: httpBundle.$handleRequestWithProfile(profiler, target, '', method, kernel.container.invokeLaterAsync(target), eventManager), method, middlewares }
                        }
                    case 'static':
                        invariant(handler.resource, 'Resource must be defined for route with static type');
                        return { handler: express.static(handler.resource!), method: 'use', middlewares };
                }
            }
            throw Error(`Invalid route type ${ typeof handler }`);
        }
    }

    $handleRequestWithProfile(profiler: Profiler ,controller: any, action: string, method: string, handle: Function, events: EventManager) {
        if (!profiler.enabled) return this.$handleRequest(controller, action, method, handle, events);
        return async function httpRequestHandle(req: Request, res: Response, next: Function) {
            let profile = profiler.start('http.action', { controller: controller && controller.name || controller.constructor.name || undefined , action, method });
            let result = await Promise.resolve(handle(req, res, next));
            let event = new HttpResultEvent(controller, action, method, result, req, res, next);
            events.emit(EVENT_HTTP_RESULT, event);
            profile?.end();
        }
    }

    $handleRequest(controller: any, action: string, method: string, handle: Function, events: EventManager) {
        return async function httpRequestHandle(req: Request, res: Response, next: Function) {
            let result = await Promise.resolve(handle(req, res, next));
            let event = new HttpResultEvent(controller, action, method, result, req, res, next);
            events.emit(EVENT_HTTP_RESULT, event);
        }
    }

    /**
     * Resolve views path based on application root (used in Config resolution)
     * @param appRoot Application root directory
     * @param viewsDir Views directory
     */
    _normalizeViewsDir(appRoot: string, viewsDir: string) {

        // full-path directory (Windows-only)
        if (viewsDir.match(/:[\/\\]/)) return viewsDir;

        // Default views path
        if ( !viewsDir && appRoot ) {
            return path.resolve( appRoot , './views' );
        }
        else if ( viewsDir ) {
            // Resolve relative path
            let dirPath = viewsDir || './' as string;
            if (dirPath.startsWith('.') || dirPath.startsWith('/')) {
                return path.resolve( appRoot , dirPath );
            }
        }
        return null;
    }

    boot( @Inject() container: Container ) {

        // Views path
        if ( !container.hasParameter(HttpBundle.DI_PARAM_VIEWS) && container.hasParameter(Kernel.DI_PARAM_ROOT) ) {
            // Default views path
            container.setParameter(HttpBundle.DI_PARAM_VIEWS, path.resolve( container.getParameter(Kernel.DI_PARAM_ROOT) , './views' ) );
        } else if ( container.hasParameter(HttpBundle.DI_PARAM_VIEWS) ) {
            // Resolve relative path
            let dirPath = container.getParameter(HttpBundle.DI_PARAM_VIEWS) || './' as string;
            if (dirPath.startsWith('.') || dirPath.startsWith('/')) {
                container.setParameter( HttpBundle.DI_PARAM_VIEWS, path.resolve( container.getParameter(Kernel.DI_PARAM_ROOT) , dirPath ) );
            }
        }

    }

    @Inject() async run(container: Container, action?: string ) {
        if (!action || action == 'web') {

            let logger = await container.invokeAsync(Logger);
            let { port: httpPort, forks, host } = container.getParameter('config', {}).web ?? {};

            httpPort = Number(httpPort) || 9090;
            forks = Number(forks) || 1;

            if (forks > 1 && cluster.isPrimary) {
                // Create promise to prevent continue to next bundles run when forks are more than one
                logger.info(`Fork application at scale ${forks}`);
                for (let i = 0; i < forks; i++) {
                    cluster.fork();
                }

                cluster.on('exit', (worker, code, signal) => {
                    logger.info(`Worker ${worker.id} exit with code ${code} and signal ${signal}`);
                })
                return;
            }


            return container.invokeAsync<express.Express>(HttpBundle.DI_SERVER).then(server => {
                server.listen(httpPort, host, async function serverStarted() {
                    var events = await container.invokeAsync(EventManager);
                    events.emit(HttpBundle.EVENT_LISTEN, httpPort);
                    logger.info(`Server started on ${ host ? host + ':' : '' }${ httpPort }`);
                })
            });
        }
    }

    getServices() {
        return [ HttpEventSubscriber, DumpRoutesCommand, HttpStartCommand ];
    }

    static bundleName = "Http";
    static version = "1.0.0";

}