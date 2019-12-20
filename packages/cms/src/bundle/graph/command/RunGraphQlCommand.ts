import { Command, Inject, Kernel } from '@azera/stack';

/**
 * Run GraphQl command
 * 
 * @command
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class RunGraphQlCommand extends Command {
    
    description: string = 'Run graphQl server';
    name: string = 'graphql';

    @Inject() async run(kernel: Kernel) {
        kernel.run('graphql');
    }

}