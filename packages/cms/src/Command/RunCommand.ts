import { Command, Inject, Kernel, HttpBundle, Container } from '@azera/stack';

export class RunCommand extends Command {
    
    name = 'web';
    description = 'Start web server';

    async run( @Inject() kernel: Kernel, @Inject() container: Container ) {
        let httpBundle = kernel.getBundle(HttpBundle);
        if (httpBundle) {
            container.invokeAsync(httpBundle, 'run', 'web');
        }
    }
}