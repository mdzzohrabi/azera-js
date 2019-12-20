import { expect } from 'chai';
import { Kernel } from '../src/Kernel';
import { Bundle } from '../src/Bundle';

describe(`Kernel`, () => {
    it(`environment`, () => {
        expect(new Kernel().env).eq('development');
        expect(new Kernel('production').env).eq('production');
        process.env.NODE_ENVIRONMENT = 'test';
        expect(new Kernel().env).eq('test');
    });

    it('should initialize bundles', () => {

        let inited = false;

        class AppBundle extends Bundle {
            init() {
                inited = true;
            }
        }

        new Kernel(undefined, [ new AppBundle ]);

        expect(inited).eq(true);
    });
});