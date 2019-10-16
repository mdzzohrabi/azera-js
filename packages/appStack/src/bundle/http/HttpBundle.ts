import { Container, Inject } from '@azera/container';
import * as parser from 'body-parser';
import * as express from 'express';
import * as path from 'path';
import { Bundle } from '../../Bundle';
import { ConfigSchema } from '../../ConfigSchema';
import { EventManager } from '../../EventManager';
import { Kernel } from '../../Kernel';
import { Logger } from '../../Logger';
import { DumpRoutesCommand } from './Command/DumpRoutesCommand';
import { HttpCoreMiddlewareFactory } from './CoreMiddleware';
import { EVENT_HTTP_EXPRESS, EVENT_HTTP_LISTEN, HttpResultEvent, HttpActionEvent, EVENT_HTTP_ACTION, EVENT_HTTP_RESULT } from './Events';
import { HttpEventSubscriber } from './HttpEventSubsriber';
import { MiddlewaresCollection, MIDDLEWARES_PROPERTY } from './Middleware';
import { Request } from './Request';
import { Response } from './Response';
import { RoutesCollection, ROUTES_PROPERTY } from './Route';
import { isFunction } from 'util';
import { debugName } from '../../Util';

/**
 * Http Bundle
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class HttpBundle extends Bundle {

    static DI_TAG_MIDDLEWARE = 'http.middleware';
    static DI_TAG_CONTROLLER = 'http.controller';

    static EVENT_LISTEN = EVENT_HTTP_LISTEN;
    static EVENT_EXPRESS = EVENT_HTTP_EXPRESS;

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
            parser.json()
        ]
    ) { super(); }

    init( @Inject() container: Container, @Inject() config: ConfigSchema, @Inject(Kernel.DI_PARAM_ROOT) rootDir: string ) {

        let httpBundle = this;

        // Configuration
        config
            .node('parameters.' + HttpBundle.DI_PARAM_VIEWS, { description: 'Web server views directory', type: 'string', required: true, validate: this._normalizeViewsDir.bind(this, rootDir), default: this._normalizeViewsDir.bind(this, rootDir, './views') })
            .node('parameters.' + HttpBundle.DI_PARAM_PORT, { description: 'Web server port', type: 'number', required: true, default: 9090 })
            .node('web', { description: 'Web server configuration', type: 'object' })
            .node('web.routes', { description: 'Route collection', type: 'object' })
            .node('web.routes.**', {
                description: 'Route item',
                type: 'string|array|object',
                validate: function routeValidate(value, info) {
                    //info.skipChildren = !Array.isArray(value);
                    if (typeof value == 'string') {
                        return { controller: value };
                    }
                    return value;
                }
            })
            .node('web.routes.**.controller', { description: 'Route controller', type: 'string' })
            .node('web.routes.**.type', { description: 'Route type', type: 'enum:static,controller', default: 'controller' })
            .node('web.routes.**.resource', { description: 'Route resource (e.g: /home/public)', type: 'string', validate(value, info) {
                return info.resolvePath(value);
            } })
        ;

        // Register middlewares
        this.middlewares.forEach((middle, i) => {
            container.set( 'http.middleware_' + i + '_' + middle.name, { tags: [ HttpBundle.DI_TAG_MIDDLEWARE ], service: function middleFactory() { return middle; } });
        })

        // Default middlewares
        container.add(HttpCoreMiddlewareFactory);

        // Default listen port
        container.setParameter(HttpBundle.DI_PARAM_PORT, 9095);
        
        let bundle = this;

        
        container
            // Request
            .setFactory(Request, function requestFactory(serviceContainer: Container) { return serviceContainer.getParameter('http.req'); })
            // Response
            .setFactory(Response, function responseFactory(serviceContainer: Container) { return serviceContainer.getParameter('http.res'); });

        container.setFactory(HttpBundle.DI_SERVER, async function expressFactory() {
            let server = bundle.server = express();
            let middlewares = await container.getByTagAsync(HttpBundle.DI_TAG_MIDDLEWARE) as any[];
            let controllers = await container.getByTagAsync(HttpBundle.DI_TAG_CONTROLLER) as any[];
            let events = container.invoke(EventManager);

            // Setup middlewares
            middlewares.forEach((middle: any) => {

                if (!isFunction(middle)) throw Error(`Http Middleware must be a function, but ${ debugName(middle) } given`);

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
                    } else {
                        server.use( routePrefix + middle.path, container.invokeLater(controller, middle.methodName) );
                    }
                });
               
                // Register controller routes
                routes.forEach(route => {

                    let routePath = routePrefix + route.path;
                    let routeObj = router.route(routePath);
                    let handler: Function;
    
                    if ( injectedMethods.includes(route.action) ) {
                        handler = container.invokeLater(controller, route.action);
                    } else {
                        handler = (<Function>controller[ route.action ]).bind( controller );
                    }

                    let event = new HttpActionEvent(routePath, route.method, route.action, controller, handler);
                    events.emit(EVENT_HTTP_ACTION, event);

                    routeObj[ event.method ]( httpBundle.$handleRequest( event.controller, event.action, event.method, event.handler, events ) );

                    routeObj.controller = controller;
                    routeObj.methodName = route.action;
    
                });
    
            });

            container.invoke(EventManager).emit(HttpBundle.EVENT_EXPRESS, server);

            return server;
    
        });
    }

    $handleRequest(controller: any, action: string, method: string, handle: Function, events: EventManager) {
        return function httpRequestHandle(req: Request, res: Response, next: Function) {
            let result = handle(req, res, next);
            let event = new HttpResultEvent(controller, action, method, result, req, res, next);
            events.emit(EVENT_HTTP_RESULT, event);
        }
    }

    _normalizeViewsDir(appRoot: string, viewsDir: string) {
        if (viewsDir.match(/:[\/\\]/)) return viewsDir;
        if ( !viewsDir && appRoot ) {
            // Default views path
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

    run(
        @Inject() container: Container,
        @Inject(HttpBundle.DI_PARAM_PORT) httpPort: number,
        @Inject() logger: Logger,
        action?: string ) {

        if (!action || action == 'web') {
            container.invokeAsync<express.Express>(HttpBundle.DI_SERVER).then(server => {
                server.listen(httpPort, function serverStarted() {
                    container.invoke(EventManager).emit(HttpBundle.EVENT_LISTEN, httpPort);
                    logger.info(`Server started on port ${ httpPort }`);
                })
            });
        }

    }

    getServices() {
        return [ HttpEventSubscriber, DumpRoutesCommand ];
    }

    static bundleName = "Http";
    static version = "1.0.0";

}