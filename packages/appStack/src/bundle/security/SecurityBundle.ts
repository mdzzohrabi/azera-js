import { Container, ContainerInvokeOptions, Inject } from '@azera/container';
import { is } from '@azera/util';
import { ConfigSchema } from '../../config/ConfigSchema';
import { debugName, getProperty } from '../../helper/Util';
import { Kernel } from '../../kernel/Kernel';
import { Bundle } from '../Bundle';
import { AuthenticationManager } from './authentication/AuthenticationManager';
import { AuthenticationProvider } from './authentication/AuthenticationProvider';
import { SecurityContext } from './SecurityDecorators';
import { SecurityEventSubscriber } from './SecurityEventSubscriber';

/**
 * Security bundle
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class SecurityBundle extends Bundle {

    static DI_TAG_AUTHENTICATION_PROVIDER = 'security.authentication_provider';

    get bundleName() { return 'Security'; }

    @Inject() init(config: ConfigSchema, container: Container) {

        config
            .node('security', { description: 'Security configuration' })
            .node('security.secret', { description: 'Security secret key' })
            .node('security.authentication', { description: 'Authentication controller' })
            .node('security.authentication.providers', { description: 'Authentication providers' })
            .node('security.authentication.providers.*', { description: 'Authentication provider' })
        ;

        config
            .node('web.routes.*.secure', { description: 'Enable security in given route', type: 'boolean|object' })
            .node('web.routes.*.secure.redirectPath', { description: 'Redirect path on authentication failed', type: 'string' })
            .node('web.routes.*.secure.anonymoous', { description: 'Allow anonymous', type: 'boolean' })
            .node('web.routes.*.secure.role', { description: 'Authorization checking role', type: 'string' })
            .node('web.routes.*.secure.providerName', { description: 'Authentication provider name', type: 'string' })

        container.autoTag(AuthenticationProvider, [SecurityBundle.DI_TAG_AUTHENTICATION_PROVIDER]);
        container.getDefinition(AuthenticationManager).parameters[0] = '$$' + SecurityBundle.DI_TAG_AUTHENTICATION_PROVIDER;
        container.getDefinition(AuthenticationManager).parameters[1] = '=invoke("$config")?.security?.secret';

        /**
         * Security context provider
         */
        container.setFactory(SecurityContext, (invokeOptions: ContainerInvokeOptions) => {
            if (!invokeOptions.invokeArguments || !invokeOptions.invokeArguments[1] || !invokeOptions.invokeArguments[1].locals) return { context: null };
            return { context: invokeOptions.invokeArguments[1].locals.securityContext };
        }, true);
    }

    @Inject() async boot(container: Container, kernel: Kernel) {
        let $config = container.getParameter('config');
        // Make authentication providers as tagged
        getProperty($config, 'security.authentication.providers', []).forEach((provider: any) => {
            if (is.String(provider)) {
                provider = kernel.use(provider);
            }
            
            if (is.ClassObject(provider)) {
                container.getDefinition(provider).tags.push(SecurityBundle.DI_TAG_AUTHENTICATION_PROVIDER);
            } else {
                throw Error(`AuthenticationProvider ${debugName(provider)} must be a class that implements 'AuthenticationProvider'`);
            }
        });

    }

    getServices() {
        return [ SecurityEventSubscriber ];
    }
    
}