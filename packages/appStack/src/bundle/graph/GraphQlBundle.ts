import { Container, Inject } from '@azera/container';
import { Bundle } from '../../Bundle';
import { ConfigSchema } from '../../ConfigSchema';

export class GraphQlBundle extends Bundle {

    readonly bundleName = "GraphQl";

    @Inject() init(config: ConfigSchema, container: Container) {

    }


}