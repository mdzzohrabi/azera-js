import { Inject } from '@azera/container';
import { Bundle } from '../../Bundle';
import { ConfigSchema } from '../../ConfigSchema';

export class TypeORMBundle extends Bundle {

    static bundleName = "TypeORM";
    
    init( @Inject() config: ConfigSchema ) {
        config
        .node('db', { description: 'Database', type: 'object' })
        .node('db.*', { description: 'Database connection', type: 'object' })
        .node('db.*.driver', { description: 'Database driver', type: 'string' })
        .node('db.*.host', { description: 'Database host', type: 'string' })
        .node('db.*.port', { description: 'Database port', type: 'string|number' })
        .node('db.*.username', { description: 'Database username', type: 'string' })
        .node('db.*.password', { description: 'Database password', type: 'string' })
    }

}