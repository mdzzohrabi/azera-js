import { Bundle } from '../Bundle';
import { MakeControllerCommand } from './command/MakeControllerCommand';
import { MakeEntityCommand } from './command/MakeEntityCommand';

export class MakerBundle extends Bundle {

    static bundleName = "Maker";

    getServices() {
        return [
            MakeControllerCommand,
            MakeEntityCommand
        ]
    }

}