import { Container, Inject } from '@azera/container';
import { Invokable } from '@azera/container/build/types';
import { Bundle } from '../bundle/Bundle';
import { Kernel } from './Kernel';

export interface MicroKernelOptions {
    /** Environment (default: NODE_ENVIRONMENT) */
    env?: string
    /** Configuration file */
    configFile?: string
    /** Bundles */
    bundles?: Bundle[]
    /** Kernel initialize */
    init?: Invokable<any>
}

/**
 * Create a kernel simply
 * @param runHandler Kernel run
 * @param options Kernel options
 */
export function createMicroKernel(runHandler: Invokable<any>, options: MicroKernelOptions = {}) {

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

/**
 * Create a simple cli application kernel
 * @param runHandler Run
 * @param options Options
 */
export async function createCliKernel(runHandler: Invokable<any>, options: MicroKernelOptions = {}) {
    options.bundles = [ new (await import('../bundle/cli')).CliBundle, ...(options.bundles || []) ];
    return createMicroKernel(runHandler, options);
}