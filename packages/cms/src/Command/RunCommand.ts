import { Command, Inject, Kernel } from '@azera/stack';

export class RunCommand extends Command {
    name = 'web';
    description = 'Start web server';
    async run( @Inject() kernel: Kernel ) {
        kernel.run('web');
    }
}