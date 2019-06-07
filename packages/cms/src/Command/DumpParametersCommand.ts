import { Command, Inject, Kernel } from '@azera/stack';

export class DumpParametersCommand extends Command {
    
    description: string = 'Dump container parameters';
    name: string = 'di:dump';
    
    async run( @Inject() kernel: Kernel ) {
        console.log(kernel.dumpParameters());       
    }

}