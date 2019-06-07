import { Container, Inject } from '@azera/container';
import * as parser from 'body-parser';
import * as express from 'express';
import { Bundle } from '../../Bundle';
import { Logger } from '../../Logger';
import { HttpCoreMiddlewareFactory } from './CoreMiddleware';
import { RoutesCollection, ROUTES_PROPERTY } from './Route';
import { DecoratedController } from './Controller';
import { Kernel } from '../../Kernel';
import * as path from 'path';
import { MiddlewaresCollection, MIDDLEWARES_PROPERTY } from './Middleware';
import { SchemaValidator } from '../../ObjectResolver';

/**
 * Http Bundle
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class HttpBundle extends Bundle {

    static DI_TAG_MIDDLEWARE = 'http.middleware';
    static DI_TAG_CONTROLLER = 'http.controller';

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
    )
    {
        super();
    }

    init( @Inject() container: Container, @Inject() config: SchemaValidator, @Inject(Kernel.DI_PARAM_ROOT) rootDir: string ) {

        // Configuration
        config
            .node('parameters.' + HttpBundle.DI_PARAM_VIEWS, { description: 'Web server views directory', type: 'string', required: true, validate: this._normalizeViewsDir.bind(this, rootDir), default: this._normalizeViewsDir.bind(this, rootDir, './views') })
            .node('parameters.' + HttpBundle.DI_PARAM_PORT, { description: 'Web server port', type: 'number', required: true, default: 9090 })
            .node('routes', { description: 'Route collection', type: 'object' })
            .node('routes.**', {
                description: 'Route item',
                validate: function routeValidate(value, info) {
                    info.skipChildren = !Array.isArray(value);
                    if (typeof value == 'string') {
                        return { controller: value };
                    }
                    return value;
                }
            })
        ;

        // Register middlewares
        this.middlewares.forEach((middle, i) => {
            container.set( 'http.middleware_' + i, { tags: [ HttpBundle.DI_TAG_MIDDLEWARE ], service: function middleFactory() { return middle; } });
        })

        // Default middlewares
        container.add(HttpCoreMiddlewareFactory);

        // Default listen port
        container.setParameter(HttpBundle.DI_PARAM_PORT, 9095);
        
        let bundle = this;

        container.set(HttpBundle.DI_SERVER, function expressFactory() {
            let server = bundle.server = express();
            let middlewares = container.getByTag(HttpBundle.DI_TAG_MIDDLEWARE) as any[];
            let controllers = container.getByTag(HttpBundle.DI_TAG_CONTROLLER) as any[];
    
            // Setup middlewares
            middlewares.forEach((middle: any) => {
                if ('middlewarePath' in middle) {
                    server.use(middle.middlewarePath, middle);
                } else {
                    server.use(middle);
                }
            });
    
            // Controllers
            controllers.forEach(controller => {
    
                let routePrefix = controller['routePrefix'] || '';
    
                // Controller routes
                let routes = (<RoutesCollection>controller)[ ROUTES_PROPERTY ] || [];

                // Middlewares
                let middlewares = (<MiddlewaresCollection>controller)[ MIDDLEWARES_PROPERTY ] || [];
    
                // Controller di definition
                let definition = container.getDefinition(controller.constructor);
    
                // Injected controller methods
                let injectedMethods = Object.keys(definition.methods);

                middlewares.forEach(middle => {
                    server.use( routePrefix + middle.path, container.invokeLater(controller, middle.methodName) );
                });
               
                routes.forEach(route => {
    
                    if ( injectedMethods.includes(route.action) ) {
                        // @ts-ignore
                        server[ route.method ]( routePrefix + route.path, function requestHandler() {
                            // @ts-ignore
                            return container.invokeLater(controller, route.action)();
                        });
                    } else {
                        // @ts-ignore
                        server[ route.method ]( routePrefix + route.path, controller[ route.action ].bind( controller ) );
                    }
    
                });
    
            });

            return server;
    
        });
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

    boot( @Inject() container: Container, @Inject('config') config : any ) {

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

    run( @Inject() container: Container, @Inject(HttpBundle.DI_PARAM_PORT) httpPort: number, @Inject() logger: Logger, action?: string ) {

        if (!action || action == 'web') {
            container.get<express.Express>(HttpBundle.DI_SERVER)!.listen(httpPort, function serverStarted() {
                logger.info(`Server started on port ${ httpPort }`);
            });
        }

    }

    static bundleName = "Http";
    static version = "1.0.0";

}