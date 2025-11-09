import { describe, test, expect } from 'bun:test';
import { ServiceCollection, Inject } from '..';

describe('Dependency Injection (DI)', () => {
    test('ServiceCollection', () => {

        const Route = createAttribute((route: string) => { route });

        @Inject()
        abstract class IBundle { }

        class BundleA implements IBundle {}
        class BundleB implements IBundle {}

        @Inject() class Application {
            constructor(public bundles: IBundle[]) {}
        }

    });
});