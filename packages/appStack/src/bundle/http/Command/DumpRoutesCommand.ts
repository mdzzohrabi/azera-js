import { Inject } from '@azera/container';
import { Express } from 'express';
import { Command, CommandInfo,  } from '../../cli';
import { Cli } from '../../cli/Cli';


export class DumpRoutesCommand extends Command {

    name = "http:routes"
    description = "Dump http routes"

    async run( @Inject('http.server') express: Express, @Inject() cli: Cli, command: any ): Promise<void> {

        
        // Routes collection
        let stack = express._router.stack as RouteLayer[];
        let i = 0;
        let { middleware } = command;

        cli.print(`Http routes collection`);
        cli.startTable({ rowBreakLine: false });
        cli.row( '#', 'Path', 'Controller', 'Verbs' );
        cli.tableBreakRow();
        stack.forEach(layer => {
            let route = layer.route;           
            
            if ( route ) {
                if (route.controller && !middleware) {
                    cli.row(++i, route!.path, route!.controller!.constructor.name + '::' + route!.methodName, Object.keys(route.methods).map(method => method.toUpperCase()).join(', ') );
                } else {
                    route.stack.forEach(routeLayer => {
                        cli.row(++i, route!.path, routeLayer.handle.name, routeLayer.method!.toUpperCase());
                    });
                }
            } else {
                if (middleware) {
                    let pattern = layer.regexp.source.replace('^', '').replace('\\/?(?=\\/|$)', '').replace(/\\\//g,'/') || '/';
                    cli.row( ++i, `${pattern} [M]`, layer.handle.name, 'All');
                }
            }
        });

        cli.endTable();

    }

    configure(command: CommandInfo) {
        command.option('-m, --middleware', 'Include middlewares');
    }
}


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