import { Container, Inject } from '@azera/container';
import { Command } from '../../cli/Command';

/**
 * Start http server command
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class HttpStartCommand extends Command {
    
    name = 'http:start';
    description = 'Start web server';

    async run(@Inject() container: Container ) {
        let { HttpBundle } = await import('../HttpBundle');
        let httpBundle = container.invoke(HttpBundle);
        container.invokeAsync(httpBundle, 'run', 'web');
    }
}