import { Container, Inject } from '@azera/container';
import { writeFileSync } from 'fs';
import { Kernel } from '../../../Kernel';
import { SchemaValidator } from '../../../objectResolver';
import { Command } from '../../cli/Command';
import { normalize } from 'path';
import { Cli } from '../../cli/Cli';

/**
 * Generate config json schema
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class ConfigSchemaCommand extends Command {
    
    description: string = 'Generate config json schema';
    name: string = 'config:schema';
    
    async run( @Inject() container: Container, @Inject() validator: SchemaValidator, @Inject() cli: Cli ) {
        let kernel = container.invoke(Kernel)!;
        let schema = validator.getJsonSchema();
        let filePath = normalize( kernel.rootDir + '/config.schema.json' );

        writeFileSync(filePath, JSON.stringify(schema));

        cli.success(`Schema generated in "${ filePath }".`);
    }

}