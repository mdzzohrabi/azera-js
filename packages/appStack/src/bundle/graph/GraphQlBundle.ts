import { Bundle } from '../../Bundle';
import { Inject, Container } from '@azera/container';
import { ConfigSchema } from '../../ConfigSchema';
import { GraphQl } from './Decorators';

export class GraphQlBundle extends Bundle {

    readonly bundleName = "GraphQl";

    @Inject() init(config: ConfigSchema, container: Container) {

    }


}

class User {

}

@GraphQl.Type()
class Query {

    @GraphQl.Field(`users(limit: Int): [User] # List of users`)
    async users() {
        return [];
    }

}