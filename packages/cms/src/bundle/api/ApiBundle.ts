import { Bundle } from '@azera/stack';
import { ModelManager } from './model/ModelManager';

export class ApiBundle extends Bundle {

    bundleName = "api";

    getServices = () => [
        ModelManager
    ]

}