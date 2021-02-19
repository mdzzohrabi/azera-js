import { Container, Inject } from '@azera/container';
import { writeFileSync } from 'fs';
import { normalize } from 'path';
import { ConfigSchema } from '../../../ConfigSchema';
import { Kernel } from '../../../Kernel';
import { Cli } from '../../cli/Cli';
import { Command } from '../../cli/Command';

/**
 * Generate config json schema
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class ConfigSchemaCommand extends Command {
    
    description: string = 'Generate config json schema';
    name: string = 'config:schema';
    
    async run( @Inject() container: Container, @Inject() validator: ConfigSchema, @Inject() cli: Cli ) {
        let kernel = container.invoke(Kernel)!;
        let schema = validator.getJsonSchema();
        let filePath = normalize( kernel.rootDir + '/config.schema.json' );

        writeFileSync(filePath, JSON.stringify(schema));

        cli.success(`Schema generated in "${ filePath }".`);
    }

}