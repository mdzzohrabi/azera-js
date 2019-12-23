import { Bundle, Inject } from '@azera/stack';
import { IPortalModule } from './IPortalModule';

export class PortalBundle extends Bundle implements IPortalModule {
    
    @Inject() getPortalModules() {
        let srcDir = './../src/bundle/portal/public';
        let distDir = './bundle/portal/public';
        
        return {
            [srcDir + '/index.html']: distDir
        }
    }

    static bundleName = "Portal";

    getServices = async () => [
        (await import('./controller/PortalController')).PortalController,
        (await import('./command/WatchBundleCommand')).WatchBundleCommand
    ]

}