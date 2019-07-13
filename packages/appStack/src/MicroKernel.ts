import { Bundle } from './Bundle';
import { Inject, Container, IInjectable } from '@azera/container';
import { Kernel } from './Kernel';

export interface MicroKernelOptions {
    /** Environment (default: NODE_ENVIRONMENT) */
    env?: string
    /** Configuration file */
    configFile?: string
    /** Bundles */
    bundles?: Bundle[]
    /** Kernel initialize */
    init?: Function
}

/**
 * Create a kernel simply
 * @param runHandler Kernel run
 * @param options Kernel options
 */
export function createMicroKernel(runHandler: IInjectable, options: MicroKernelOptions = {}) {

    // Default options
    options = {
        env: process.env.NODE_ENVIRONMENT || 'dev',
        bundles: [],
        ...options
    };

    class MicroBundle extends Bundle {
        init( @Inject() container: Container ) {
            if (options.init)
                container.invokeLater(options, 'init')();
        }

        run( @Inject() container: Container, ...params: any[] ) {
            container.invokeLater(runHandler)(...params);
        }
    }

    options.bundles!.push(new MicroBundle);

    let kernel = new Kernel(options.env, options.bundles);

    return kernel;

}