import { Bundle } from '../../Bundle';
import { Inject, Container } from '@azera/container';
import * as twig from 'twig';
import { Twig } from './Twig';
import { Kernel } from '../../Kernel';

/**
 * Twig bundle
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class TwigBundle extends Bundle {

    static bundleName = 'Twig';
    static version = '1.0.0';

    static DI_PARAM_CACHE = 'twig.cache';

    init( @Inject() container: Container, @Inject() kernel: Kernel ) {

        container.setParameter(TwigBundle.DI_PARAM_CACHE, true);

        // Kernel contains HttpBundle
        if ( kernel.bundles.find(bundle => bundle.bundleName == 'Http') ) {
            container.setParameter('http.viewEngine', twig.__express);
        }

        container.setFactory(Twig, function twigFactory() {

            // Twig cache
            twig.cache( container.getParameter(TwigBundle.DI_PARAM_CACHE) );

            return twig;
        });

    }

}