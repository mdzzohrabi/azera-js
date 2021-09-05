import { Container, Service } from '../..';
import { IBundle } from "./IBundle";

@Service({
    imports: [ __dirname + '/Bundle' ],
    autoTags: [
        { class: IBundle, tags: [ 'bundles', 'bundle' ] }
    ],
    parameters: ['$$bundle', Container]
})
export class FixtureApp {

    constructor(
        public bundles: IBundle[],
        public container: Container
    ) {
        // Register bundles
        bundles.forEach( bundle => bundle.register() );
    }
}