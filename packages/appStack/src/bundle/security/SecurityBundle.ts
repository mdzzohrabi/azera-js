import { Bundle } from '../../Bundle';
import { Inject } from '@azera/container';
import { ConfigSchema } from '../../ConfigSchema';
import { SecurityEventSubscriber } from './SecurityEventSubscriber';

export class SecurityBundle extends Bundle {

    get bundleName() { return 'Security'; }

    @Inject() init(config: ConfigSchema) {

        config
            .node('security', { description: 'Security configuration' })
            .node('security.authentication', { description: 'Authentication controller' })
            .node('security.authentication.providers', { description: 'Authentication providers' })
            .node('security.authentication.providers.*', { description: 'Authentication provider' })
            .node('security.authentication.providers.*.', { description: 'Authentication provider' })
        ;
    }

    getServices() {
        return [ SecurityEventSubscriber ];
    }

    run(@Inject('$config') $config: any) {
        let { security = {} } = $config || {};

        console.log(security);
        
    }
    
}