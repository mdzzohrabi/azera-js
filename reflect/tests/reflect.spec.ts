import { describe, test } from 'bun:test';
import { createAttribute, getAttributes } from '..';

describe('Reflect', () => {

    test('createAttribute', () => {

        const Summary = createAttribute((summary: string) => summary);

        @Summary('Home controller')
        class HomeController {

            @Summary('Home blocks')
            homes() {
                return true;
            }
        }

        getAttributes(HomeController);

    })

});