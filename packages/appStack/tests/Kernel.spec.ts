import { expect } from 'chai';
import { Kernel } from '../src/kernel/Kernel';
import { Bundle } from '../src/bundle/Bundle';
import { Container } from '../src';
import { CoreBundle } from '../src/bundle/core/CoreBundle';

/**
 * Kernel tests
 */
describe(`Kernel`, () => {
    it(`environment`, () => {
        process.env.NODE_ENVIRONMENT = '';
        expect(new Kernel().env).eq('development', 'Default environment for kernel must be development');
        expect(new Kernel('production').env).eq('production', 'Kernel environment must be read from constructor parameter');
        process.env.NODE_ENVIRONMENT = 'test';
        expect(new Kernel().env).eq('test', 'Kernel environment should read from NODE_ENVIRONMENT when constructor paremeter is empty');
    });

    it('should initialize bundles', () => {
        let inited = false;

        class AppBundle extends Bundle {
            init() { inited = true; }
        }

        new Kernel(undefined, [ new AppBundle ]);
        expect(inited).eq(true, 'AppBundle init() must be called after kernel construction');
    });
    
    it('should have container', () => {
        let kernel = new Kernel();
        expect(kernel.container).instanceOf(Container, 'Kernel container must be instanceof Container');
    });

    it('should init CoreBundle', async () => {
        let kernel = new Kernel();
        expect(kernel.bundles).length(1);
        expect(kernel.bundles.map(bundle => bundle.bundleName)).members([ 'Core' ]);
    });

    it('getBundle() must return bundle by name or its prototype', () => {
        let kernel = new Kernel();
        expect(kernel.getBundle('Core')).instanceOf(CoreBundle);
        expect(kernel.getBundle(CoreBundle)).instanceOf(CoreBundle);
        expect(kernel.getBundle('Test')).eq(undefined);
    });

    it('hetBundle() must return bundle by name or its prototype', () => {
        let kernel = new Kernel();
        expect(kernel.hasBundle('Core')).eq(true);
        expect(kernel.hasBundle(CoreBundle)).eq(true);
        expect(kernel.hasBundle('Test')).eq(false);
    });
});