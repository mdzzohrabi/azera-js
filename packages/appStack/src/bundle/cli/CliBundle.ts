import { Container, Inject } from '@azera/container';
import * as commander from 'commander';
import { writeFileSync } from 'fs';
import * as process from 'process';
import { Bundle } from '../Bundle';
import { Logger } from '../../logger/Logger';
import { Profiler } from '../../debug/Profiler';
import { Command } from './Command';

export const DI_TAG_COMMAND = 'cli.command';
export const DI_PARAM_ARGV = 'cli.argv';

/**
 * Command-line handle
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class CliBundle extends Bundle {

    static DI_TAG_COMMAND = DI_TAG_COMMAND;

    @Inject() init(container: Container) {
        container.autoTag(Command, [DI_TAG_COMMAND]);

        let profilerExecuted = false;
        commander.program.option('--profile', 'Enable profiler', function enableProfile() {
            if (profilerExecuted) return;
            profilerExecuted = true;
            
            let originalContainerInvoke = container['_invoke'].bind(container);
            let profiler = container.invoke(Profiler);
                profiler.enabled = true;

            // profiler.profileMethod(container as any, '_invoke', 'container.invoke', (container, service, stack) => {
            //     return {
            //         service: debugName(service),
            //         stack
            //     }
            // });

            container['_invoke'] = function containerInvokeProfile(...args: any[]) {
                let profile = profiler.start('container.invoke', {
                    service: typeof args[0] == 'string' ? args[0] : args[0].name,
                    stack: args[1]
                });
                let result = originalContainerInvoke(...args);
                profile?.end();
                return result;
            }

            container.setParameter('debug.profile', true);

            let time = Date.now();
            process.on('exit', (err) => {
                let profileName = `profile-${time}.json`;
                writeFileSync(process.cwd() + '/' + profileName, JSON.stringify(profiler.profiles));
                console.log(`Profile ${ profileName } created`);
            });

            process.on('SIGINT', () => {
                process.exit();
            });
        })
        .parseOptions(process.argv);
    }

    @Inject() boot(container: Container) {

        let commands = container.getByTag<Command>(DI_TAG_COMMAND);

        // Register commands
        commands
            // Sort by name ASC
            .sort((a, b) => a.name > b.name ? -1 : 1)
            .forEach(command => {
                // Create commander command object
                let commanderCommand = commander.program.command(command.name);
                commanderCommand.description(command.description);
                commanderCommand.action(container.invokeLaterAsync(command, 'run') as any);

                // Call Command.configure method
                container.invoke(command, 'configure', commanderCommand)
            });

    }

    @Inject() run(container: Container, log: Logger, action: string) {
        if (action == 'cli') {
            commander.program.parse(process.argv);
        }
    }

    static bundleName = "Cli";
    static version = "1.0.0";

}