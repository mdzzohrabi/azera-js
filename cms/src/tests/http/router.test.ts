import { Router, makeRouter } from "../../http/router";
import { equal, deepEqual } from "assert";

describe(`Router`, () => {
    
    let router: Router;
    before(() => { router = new Router; });

    it(`add()`, () => {
        // New route
        router.add('GET', '/', () => 'Hello World');
        equal(router.length, 1);

        // Add handler to existing route
        router.add('/', () => 'After words');
        equal(router.length, 1);

        // New route
        router.add('/api', () => []);
        equal(router.length, 2);

        router.add('/', () => 1, v => v + 1 , v => v + 3);

        // Multiple handlers
        equal(router.match('/').length, 5, 'It should handler multiple handlers');

        // Bind router
        router.add('/api',
            makeRouter().add('/users', () => 12)
        );

        equal(router.length, 3);
    });

    it(`match()`, () => {
        equal(router.match('/').length, 5);
        equal(router.match('/hello').length, 0);
        equal(router.match('/api').length, 1);
        equal(router.match('/api/users').length, 1);
    });
});