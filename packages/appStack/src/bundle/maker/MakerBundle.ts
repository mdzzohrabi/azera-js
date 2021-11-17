import { Inject } from '@azera/container';
import { Kernel } from '../../kernel/Kernel';
import { Bundle } from '../Bundle';
import { MakeCommandCommand } from './command/MakeCommandCommand';
import { MakeControllerCommand } from './command/MakeControllerCommand';
import { MakeEntityCommand } from './command/MakeEntityCommand';

export class MakerBundle extends Bundle {

    static bundleName = "Maker";

    @Inject() getServices(kernel: Kernel) {
        if (kernel.isDevelopment) {
            return [
                MakeControllerCommand,
                MakeEntityCommand,
                MakeCommandCommand
            ]
        }
        return [];
    }

}