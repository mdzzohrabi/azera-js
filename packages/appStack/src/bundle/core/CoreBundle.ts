import { Bundle } from '../../Bundle';
import { Inject } from '@azera/container';
import { SchemaValidator } from '../../ObjectResolver';

export class CoreBundle extends Bundle {

    static bundleName = 'Core';
    static version = '1.0.0';

    init( @Inject() config: SchemaValidator ) {

        // Configuration parameters
        config.node('parameters', {
            description: 'Container parameters',
            type: 'object'
        })

    }

}