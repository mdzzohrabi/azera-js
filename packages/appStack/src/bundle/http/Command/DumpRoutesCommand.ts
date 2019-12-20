import { Inject } from '@azera/container';
import { Express } from 'express';
import { Command } from '../../cli';
import { Cli } from '../../cli/Cli';

/**
 * Express route layer
 * @internal
 */
interface RouteLayer {
    handle: Function
    name: string
    params: object
    path: string
    keys: any[]
    regexp: RegExp
    method?: string
    route?: {
        path: string
        stack: RouteLayer[],
        methods: { [name: string]: boolean }
        controller?: Function
        methodName?: string
    }
}

export class DumpRoutesCommand extends Command {
    name = "http:routes"
    description = "Dump http routes"

    async run( @Inject('http.server') express: Express, @Inject() cli: Cli ): Promise<void> {

        // Routes collection
        let stack = express._router.stack as RouteLayer[];
        let i = 0;

        cli.print(`Http routes collection`);

        cli.startTable({ rowBreakLine: false });
        cli.row( '#', 'Path', 'Controller', 'Verbs' );
        cli.tableBreakRow();

        stack.forEach(layer => {

            let route = layer.route;
            
            if ( route ) {

                route.stack.forEach(routeLayer => {
                    cli.row(++i, route!.path, route!.controller ? route!.controller!.constructor.name + '::' + route!.methodName : routeLayer.handle.name, routeLayer.method!.toUpperCase());
                })

            } else {

                let pattern = layer.regexp.source.replace('^', '').replace('\\/?(?=\\/|$)', '').replace(/\\\//g,'/') || '/';

                cli.row( ++i, `${pattern} [M]`, layer.handle.name, 'All');
            }

        });

        cli.endTable();

    }
}