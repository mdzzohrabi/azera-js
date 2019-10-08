import { equal } from 'assert';
import { Kernel } from '../src/Kernel';

describe(`Kernel`, () => {

    it(`should resolve kernel`, () => {

        let kernel = new Kernel();
        equal(kernel.env, 'development');

    });

});