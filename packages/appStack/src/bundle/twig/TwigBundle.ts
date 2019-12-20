import { Bundle } from '../../Bundle';
import { Inject, Container } from '@azera/container';
import * as twig from 'twig';
import { Twig } from './Twig';
import { Kernel } from '../../Kernel';
import { ConfigSchema } from '../../ConfigSchema';

/**
 * Twig bundle
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class TwigBundle extends Bundle {

    static bundleName = 'Twig';
    static version = '1.0.0';

    static DI_PARAM_CACHE = 'twigCache';

    @Inject() init(container: Container, kernel: Kernel, config: ConfigSchema) {
        config//.node('twig', { description: 'Twig bundle configuration' })
            .node('parameters.twigCache', { description: 'Cache twig rendered templates', type: 'boolean', default: true });

        container.setParameter(TwigBundle.DI_PARAM_CACHE, true);

        // set HttpBundle view engine
        if ( kernel.bundles.find(bundle => bundle.bundleName == 'Http') ) {
            container.setParameter('http.viewEngine', twig.__express);
        }

        container.setFactory(Twig, function twigFactory() {
            return twig;
        });
    }

    @Inject() boot(container: Container) {
        // Twig cache
        twig.cache( container.getParameter(TwigBundle.DI_PARAM_CACHE) );
    }

}