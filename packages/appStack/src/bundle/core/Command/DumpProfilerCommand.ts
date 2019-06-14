import { Inject, Container } from '@azera/container';
import { Kernel } from '../../../Kernel';
import { Command, CommandInfo } from '../../cli/Command';

/**
 * Dump profiles
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class DumpProfilerCommand extends Command {
    
    description: string = 'Dump profiler';
    name: string = 'profiler';
    
    async run( @Inject() container: Container, visual: boolean ) {
        let kernel = container.invoke(Kernel)!;
        let profiles = kernel.profiler.profiles;

        console.log(visual);

        console.log(`Profiles :`);
        console.log(`${ 'Name'.padEnd(26, ' ') }|\tDuration`);
        console.log( ''.padEnd(50, '-') );
        Object.keys(profiles).forEach(name => {
            let profile = profiles[name];
            console.log(`${ name.padEnd(26, ' ') }|\t${ profile.lastEnd! - profile.firstStart } ms`);
        });

    }

    configure(command: CommandInfo) {
        super.configure(command);
        command.option('-v, --visual', 'Visualize profiles');
    }

}