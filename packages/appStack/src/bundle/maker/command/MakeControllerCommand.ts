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
        this.makeFile({
            type: 'Controller',
            name, backupConfiguration: backup, dirName: dir,
            template: className => `import {Controller, Get, Request, Response, Inject} from '@azera/stack';

@Controller(${path && path != '/' ? "'" + path.replace('%name%', Str.dasherize(name)) + "'" : ''})
export class ${className} {
    @Get('/') @Inject() indexAction(req: Request, res: Response) {
        return 'Index action';
    }
}`});

   }

}