import { Container, Inject } from '@azera/container';
import { Bundle } from '../../Bundle';
import { ConfigSchema } from '../../ConfigSchema';
import { AuthenticationProvider } from './AuthenticationProvider';
import { AuthenticationManager } from './AuthenticationManager';
import { SecurityEventSubscriber } from './SecurityEventSubscriber';

export class SecurityBundle extends Bundle {

    get bundleName() { return 'Security'; }

    @Inject() init(config: ConfigSchema, container: Container) {

        config
            .node('security', { description: 'Security configuration' })
            .node('security.secret', { description: 'Security secret key' })
            .node('security.authentication', { description: 'Authentication controller' })
            .node('security.authentication.providers', { description: 'Authentication providers' })
            .node('security.authentication.providers.*', { description: 'Authentication provider' })
        ;

        container.autoTag(AuthenticationProvider, ['security.authentication_provider']);
        container.getDefinition(AuthenticationManager).parameters[0] = '$$security.authentication_provider';
    }

    getServices() {
        return [ SecurityEventSubscriber ];
    }

    run(@Inject('$config') $config: any) {
        let { security = {} } = $config || {};
    }
    
}