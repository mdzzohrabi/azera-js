import { Command, Inject, Container } from '@azera/stack';

export class GetTaggedServicesCommand extends Command {
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