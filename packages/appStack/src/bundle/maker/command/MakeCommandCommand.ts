import { CommandInfo } from '../../cli';
import { AbstractMakeCommand } from './AbstractMakeCommand';

/**
 * Make an cli command
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class MakeCommandCommand extends AbstractMakeCommand {

    description: string = "Make an Cli Command";
    name: string = "make:command <name> <description>";

    configure(command: CommandInfo) {
        command.option('-d --dir <directory>', 'Controller directory', '/src/controller');
        command.option('-b --backup', 'Make backup of current configuration file', false);
    }

    async run(name: string, description: string, { dir, backup }: { dir?: string, backup?: boolean }) {
        this.makeFile({
            type: 'Command',
            name,
            dirName: dir,
            backupConfiguration: backup,
            template: className => `import { Command, CommandInfo, Cli, Inject } from '@azera/stack';

export class ${className} extends Command {
    // Command name
    name: string = "${name}";

    // Command description
    description: string = "${description}";

    // Command configuration
    configure(cli: CommandInfo) {
        /** Customize command options */
        // cli
        //     .option('-p, --port <port>', 'Media server port', '1350')
        //     .option('-r, --path <path>', 'Media server path', '/')
    }

    // Execute command
    async run(@Inject() cli: Cli, { port, path }: { port: string, path: string })
    {
        // cli.success(\`Server started on Port \${port} and Path \${path}\`)
    }
}`
        });
    }

}