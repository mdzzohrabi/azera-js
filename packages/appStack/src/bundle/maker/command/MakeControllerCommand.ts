import { Inject } from '@azera/container';
import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { Str } from '../../../helper';
import { Kernel } from '../../../kernel/Kernel';
import { Cli, Command, CommandInfo } from '../../cli';

/**
 * Make an http route controller
 */
export class MakeControllerCommand extends Command {

    description: string = "Make an Http Controller";
    name: string = "make:controller <name>";

    configure(command: CommandInfo) {
        command.option('-p --path <path>', 'Route path', '/%name%');
        command.option('-d --dir <directory>', 'Controller directory', '/src/controller');
        command.option('-b --backup', 'Make backup of current configuration file', false);
    }

    @Inject() async run(kernel: Kernel, cli: Cli, name: string, { path, dir, backup }: { path?: string, dir?: string, backup?: boolean }): Promise<void> {

        let fullName = Str.humanize(name) + 'Controller';
        let dirPath = kernel.rootDir + ( dir ?? '/src/controller' );
        let file = dirPath + '/' + fullName + '.ts';

        if (existsSync(file)) {
            cli.error(`Controller file "${file}" already exists`);
            return;
        }

        // Ensure controller directory exists
        if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });

        writeFileSync(
            file,
`import {Controller, Get, Request, Response, Inject} from '@azera/stack';

@Controller(${path && path != '/' ? "'" + path.replace('%name%', Str.dasherize(name)) + "'" : ''})
export class ${fullName} {
    @Get('/') @Inject() indexAction(req: Request, res: Response) {
        return 'Index action';
    }
}
`);

        if (kernel.container.hasParameter(Kernel.DI_PARAM_CONFIG_FILE)) {
            let configFile = kernel.resolvePath( kernel.container.getParameter<string>(Kernel.DI_PARAM_CONFIG_FILE) );

            if (configFile.endsWith('.json') && existsSync(configFile)) {

                // Make backup
                if (backup) {
                    if (existsSync(configFile + '__backup')) unlinkSync(configFile + '__backup');
                    copyFileSync(configFile, configFile + '__backup');
                }
                
                let config = JSON.parse(readFileSync(configFile).toString());
                if (config.services) {
                    config.services.push( (dir?.replace('src/', '') ?? '') + `/${fullName}` );
                } else {
                    config.services = [ (dir?.replace('src/', '') ?? '') + `/${fullName}` ];
                }
                writeFileSync(configFile, JSON.stringify(config, null, "\t"));
            } else {
                cli.warning(`Configuration file %s not found`, configFile);
            }

        }

        cli.success(`Controller ${fullName} successfuly created in ${file}`);

    }

}