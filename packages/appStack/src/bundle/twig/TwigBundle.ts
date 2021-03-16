import { Container, Inject } from '@azera/container';
import { ConfigSchema } from '../../config/ConfigSchema';
import { Kernel } from '../../kernel/Kernel';
import { Bundle } from '../Bundle';
import { Twig } from './Twig';

/**
 * Twig bundle
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class TwigBundle extends Bundle {

    static bundleName = 'Twig';
    static version = '1.0.0';

    static DI_PARAM_CACHE = 'twigCache';

    @Inject() init(container: Container, config: ConfigSchema) {
        config//.node('twig', { description: 'Twig bundle configuration' })
            .node('parameters.twigCache', { description: 'Cache twig rendered templates', type: 'boolean', default: true });

        container.setParameter(TwigBundle.DI_PARAM_CACHE, true);

        // Twig factory
        container.setFactory(Twig, async function twigFactory() {
            return await import('twig');
        });
    }

    @Inject() async boot(container: Container, kernel: Kernel) {
        // set HttpBundle view engine
        if ( kernel.bundles.find(bundle => bundle.bundleName == 'Http') ) {            
            container.setParameter('http.viewEngine', (await import('twig')).__express);
        }

        // Twig cache
        if (container.hasParameter(TwigBundle.DI_PARAM_CACHE)) {
            (await import('twig')).cache( container.getParameter(TwigBundle.DI_PARAM_CACHE) );
        }
    }

}