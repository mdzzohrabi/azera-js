import { Inject } from '@azera/container';
import { Bundle } from '../../Bundle';
import { ConfigSchema } from '../../ConfigSchema';

export class TypeORMBundle extends Bundle {

    static bundleName = "TypeORM";
    
    init( @Inject() config: ConfigSchema ) {
        config
        .node('db', { description: 'Database', type: 'array' })
        .node('db.*', { description: 'Database connection' })
        .node('db.*.alias', { description: 'Database connection alias' })
        .node('db.*.driver', { description: 'Database driver' })
        .node('db.*.username', { description: 'Database username'})
    }

}