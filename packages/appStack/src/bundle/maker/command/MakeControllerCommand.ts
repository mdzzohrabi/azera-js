import { Inject } from '@azera/container';
import { camelCase, humanize } from '../../../helper';
import { Kernel } from '../../../Kernel';
import { Cli, Command, CommandInfo } from '../../cli';
import { mkdirSync, existsSync, writeFileSync } from 'fs';

/**
 * Make an http route controller
 */
export class MakeControllerCommand extends Command {

    description: string = "Make an Http Controller";
    name: string = "make:controller <name>";

    configure(command: CommandInfo) {
        command.option('-p --path <path>', 'Route path', '/');
        command.option('-d --dir <directory>', 'Controller directory', '/src/controller');
    }

    @Inject() async run(kernel: Kernel, cli: Cli, name: string, { path, dir }: { path?: string, dir?: string }): Promise<void> {

        let fullName = humanize(name) + 'Controller';
        dir = kernel.rootDir + ( dir ?? '/src/controller' );
        let file = dir + '/' + fullName + '.ts';

        if (existsSync(file)) {
            cli.error(`Controller file "${file}" already exists`);
            return;
        }

        // Ensure controller directory exists
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

        writeFileSync(
            file,
`import {Controller, Get, Request, Response, Inject} from '@azera/stack';

@Controller(${path ? "'" + path + "'" : ''})
export class ${fullName} {
    @Get('/') @Inject() indexAction(req: Request, res: Response) {
        return 'Index action';
    }
}
`);

        cli.success(`Controller ${fullName} successfuly created in ${file}`);

    }

}