import { assert, expect } from 'chai';
import { Profiler } from "../src";

describe('Profiler', () => {

    it('should have profiles after profiling', () => {
        let profiler = new Profiler();

        profiler.enabled = true;
    
        assert.doesNotHaveAnyKeys(profiler.profiles, ['Test']);
    
        let profile = profiler.start('Test', { name: 'A' });
        profile?.end();
    
        assert.hasAllKeys(profiler.profiles, ['Test']);
    });

    it('should disable by default', () => {
        let profiler = new Profiler();
   
        assert.doesNotHaveAnyKeys(profiler.profiles, ['Test']);
        expect( profiler.start('Test', { name: 'A' }) ).eq(undefined);
        assert.doesNotHaveAnyKeys(profiler.profiles, ['Test']);
    });

    it('getStackTrace() works ok', () => {
        let profiler = new Profiler();
            profiler.enabled = true;

        expect(profiler.getStackTrace(2)?.length).greaterThan(2);
    });

    it('profileMethod() works ok', () => {
        let profiler = new Profiler();
            profiler.enabled = true;
        let db = new class Db {
            connect() {
                return new Promise(done => setTimeout(done, 100));
            }
        }

        profiler.profileMethod(db, 'connect', 'DbConnect');

        expect(profiler.profiles).not.keys('DbConnect');
        db.connect();
        expect(profiler.profiles).keys('DbConnect');
    });

});