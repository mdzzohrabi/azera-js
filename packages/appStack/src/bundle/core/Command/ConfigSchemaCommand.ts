import { Inject } from '@azera/container';
import { writeFileSync } from 'fs';
import { normalize } from 'path';
import { ConfigSchema } from '../../../config/ConfigSchema';
import { Kernel } from '../../../kernel/Kernel';
import { Cli } from '../../cli/Cli';
import { Command } from '../../cli/Command';

/**
 * Generate config json schema
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class ConfigSchemaCommand extends Command {
    
    description: string = 'Generate config json schema';
    name: string = 'config:schema';
    
    @Inject() async run(kernel: Kernel, validator: ConfigSchema, cli: Cli ) {
        let schema = validator.getJsonSchema();
        let filePath = normalize( kernel.rootDir + '/config.schema.json' );
        writeFileSync(filePath, JSON.stringify(schema));
        cli.success(`Schema generated in "${ filePath }".`);
    }

}