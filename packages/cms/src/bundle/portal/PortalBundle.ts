import { Bundle } from '@azera/stack';
import { PortalController } from './controller/PortalController';

export class PortalBundle extends Bundle {
    static bundleName = "portal";

    getServices() {
        return [
            PortalController
        ]
    }
}