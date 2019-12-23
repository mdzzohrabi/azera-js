import { asyncEach, Cli, Command, Container, Inject, Kernel } from '@azera/stack';
import { IPortalModule } from '../IPortalModule';

export class WatchBundleCommand extends Command {
    description: string = 'Watch a bundle and build it to destination';    
    name: string = 'portal:watch [bundle]';
    
    @Inject() async run(kernel: Kernel, container: Container, cli: Cli, bundleName: string): Promise<any> {

        let Parcel = await import('parcel-bundler');

        let bundles = kernel.bundles;

        if (bundleName) {
            let bundle = kernel.getBundle(bundleName);
            if (!bundle) return cli.error(`Bundle "${ bundleName }" not found`);
            bundles = [ bundle ];
        }

        let workers: (import('parcel-bundler'))[] = [];

        await asyncEach(bundles, async bundle => {
            
            if ('getPortalModules' in bundle) {
                cli.print(`<bg:yellow><black>Bundle</black></bg:yellow> ${bundle!.bundleName}`);
                let modules = container.invoke(bundle as IPortalModule, 'getPortalModules');
    
                asyncEach(Object.keys(modules), async entry => {
                    let out = kernel.resolvePath(modules[entry]);
                    let bundler = new Parcel(kernel.resolvePath(entry), {
                        outDir: out,
                        target: 'browser',
                        bundleNodeModules: true,
                        watch: true,
                        cache: true,
                        cacheDir: kernel.rootDir + kernel.cacheDirectory + '/parcel',
                        publicUrl: './'
                    });
        
                    workers.push(bundler); 
                });
    
            } else {
                if (bundleName) cli.error(`Bundle "${bundle.bundleName}" must implement "IPortalModule" interface`);
            }
        });

        await Promise.all(workers.map(worker => worker.bundle()));
        
    }
}