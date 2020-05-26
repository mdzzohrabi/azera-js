import { Command } from '../../cli/Command';
import { Container, Inject } from '@azera/container';

/**
 * Find tagged services
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class DiParametersCommand extends Command {

    name: string = 'di:parameters';
    description: string = 'Dump container parameters';

    async run( @Inject() container: Container, tag: string ) {
        console.log(container.getParameters());
    }
}