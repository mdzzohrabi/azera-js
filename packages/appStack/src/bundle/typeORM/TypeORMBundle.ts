import { Inject } from '@azera/container';
import { Bundle } from '../../Bundle';
import { ConfigSchema } from '../../ConfigSchema';

export class TypeORMBundle extends Bundle {

    bundleName = "TypeORM";
    
    init( @Inject() config: ConfigSchema ) {

    }

}