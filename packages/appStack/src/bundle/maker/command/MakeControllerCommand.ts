import { Str } from '../../../helper';
import { CommandInfo } from '../../cli';
import { AbstractMakeCommand } from './AbstractMakeCommand';

/**
 * Make an http route controller
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class MakeControllerCommand extends AbstractMakeCommand {

    description: string = "Make an Http Controller";
    name: string = "make:controller <name>";

    configure(command: CommandInfo) {
        command.option('-p --path <path>', 'Route path', '/%name%');
        command.option('-d --dir <directory>', 'Controller directory', '/src/controller');
        command.option('-b --backup', 'Make backup of current configuration file', false);
    }

    async run(name: string, { path, dir, backup }: { path?: string, dir?: string, backup?: boolean }) {
        let controllerPath = path && path != '/' ? "'" + path.replace('%name%', Str.dasherize(name)) + "'" : '';

        this.makeFile({
            type: 'Controller',
            name, backupConfiguration: backup, dirName: dir,
            template: className => `
import { Controller, Get, Request, Response, Inject } from '@azera/stack';

@Controller(${controllerPath})
export default class ${className} {

    @Get('/') indexAction(req: Request, res: Response) {
        return 'Index action';
    }

}`.trim()
        });

   }

}