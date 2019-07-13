import { Command } from '../../cli/Command';
import { Container, Inject } from '@azera/container';

/**
 * Find tagged services
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class DiTagCommand extends Command {

    name: string = 'di:tag <tag>';
    description: string = 'Find services by tag';

    async run( @Inject() container: Container, tag: string ) {

        let services = container.findByTag(tag);

        if (services.length == 0) console.log(`No services found for tag "${ tag }"`);

        let i = 0;
        services.forEach(service => {
            console.log(`${ ++i } : ${ service.name } (${ typeof service.service == 'function' ? service.service.name : '?' })`);
        });
    }
}