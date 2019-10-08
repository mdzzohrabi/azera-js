import { Bundle } from '../../Bundle';
import * as commander from 'commander';
import { Inject, Container } from '@azera/container';
import { Command } from './Command';

export const DI_TAG_COMMAND = 'cli.command';
export const DI_PARAM_ARGV = 'cli.argv';

/**
 * Command-line handle
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class CliBundle extends Bundle {

    static DI_TAG_COMMAND = DI_TAG_COMMAND;

    init( @Inject() contianer: Container ) {

        contianer.autoTag(function (service) {
            return typeof service.service == 'function' && service.service.prototype instanceof Command ? [DI_TAG_COMMAND] : [];
        });

    }

    boot( @Inject() container: Container ) {

        let commands = container.getByTag(DI_TAG_COMMAND) as Command[];

        // Register commands
        commands.sort((a, b) => a.name > b.name ? -1 : 1).forEach(command => {
            command.configure(
                commander
                    .command(command.name)
                    .action(container.invokeLaterAsync(command, 'run'))
            )
        });

    }

    run(action: string) {
        if (action == 'cli') {
            commander.parse(process.argv);
        }
    }

    static bundleName = "Cli";
    static version = "1.0.0";

}