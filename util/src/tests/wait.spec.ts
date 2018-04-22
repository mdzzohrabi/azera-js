import { wait } from "..";

describe('wait()', () => {
    it('should works', ( done ) => {
        wait(100).then( done );
    });
});