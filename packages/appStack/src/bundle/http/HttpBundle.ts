import { Container, Inject } from '@azera/container';
import * as parser from 'body-parser';
import * as express from 'express';
import { Bundle } from '../../Bundle';
import { Logger } from '../../Logger';
import { HttpCoreMiddlewareFactory } from './CoreMiddleware';
import { RoutesCollection, ROUTES_PROPERTY } from './Route';
import { DecoratedController } from './Controller';

/**
 * Http Bundle
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class HttpBundle extends Bundle {

    static DI_TAG_MIDDLEWARE = 'http.middleware';
    static DI_TAG_CONTROLLER = 'http.controller';

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

    init( @Inject() container: Container ) {

        // Register middlewares
        this.middlewares.forEach((middle, i) => {
            container.set( 'http.middleware_' + i, { tags: [ HttpBundle.DI_TAG_MIDDLEWARE ], service: function middleFactory() { return middle; } });
        })

        // Default middlewares
        container.add(HttpCoreMiddlewareFactory);

        // Default listen port
        container.setParameter('http.port', 9095);
        container.set('http.server', express);

    }

    boot( @Inject() container: Container ) {

        let server = this.server = container.get<express.Express>('http.server')!;
        let middlewares = container.getByTag(HttpBundle.DI_TAG_MIDDLEWARE);

        // fix: Resolve controller imports
        container.getByTag(HttpBundle.DI_TAG_CONTROLLER);

        let controllers = container.getByTag(HttpBundle.DI_TAG_CONTROLLER);

        // Setup middlewares
        middlewares.forEach(middle => server.use(middle as any));

        // Controllers
        controllers.forEach(controller => {

            let routePrefix = (<any>controller)['routePrefix'] || '';

            // Controller routes
            let routes = (<RoutesCollection>controller)[ ROUTES_PROPERTY ] || [];

            // Controller di definition
            let definition = container.getDefinition(controller.constructor);

            // Injected controller methods
            let injectedMethods = Object.keys(definition.methods);
           
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

    }

    run( @Inject('http.port') httpPort: number, @Inject() logger: Logger, action?: string ) {

        if (!action || action == 'web') {
            this.server!.listen(httpPort, function serverStarted() {
                logger.info(`Server started on port ${ httpPort }`);
            });
        }

    }

    static bundleName = "Http";
    static version = "1.0.0";

}