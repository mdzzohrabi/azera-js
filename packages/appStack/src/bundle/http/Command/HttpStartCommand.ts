import { Container, Inject } from '@azera/container';
import { Command, CommandInfo } from '../../cli/Command';

/**
 * Start http server command
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class HttpStartCommand extends Command {
    
    name = 'http:start';
    description = 'Start web server';

    configure(command: CommandInfo) {
        command
            .option('-p --port <port>', 'Web server port', /[0-9]+/)
            .option('-h --host <host>', 'Web server host')
            ;
    }

    async run(@Inject() container: Container, { port, host }: { host?: string, port?: string }) {

        let config = container.getParameter('config', {});
        let webConfig = config.web || {};
        
        if (port) {
            container.setParameter('config', { ...config, web: { ...webConfig, port } });
            config = container.getParameter('config', {});
            webConfig = config.web || {};
        }

        if (host) {
            container.setParameter('config', { ...config, web: { ...webConfig, host } });
        }

        let { HttpBundle } = await import('../HttpBundle');
        let httpBundle = container.invoke(HttpBundle);
        container.invokeAsync(httpBundle, 'run', 'web');
    }
}