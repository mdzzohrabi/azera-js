import { deepStrictEqual, rejects } from "assert";
import { ObjectResolver } from "../src";

describe('SchemaValidator', () => {

    it('should work ok', async () => {

        let resolver = ObjectResolver.schema({
            id: { type: 'objectId' },
            firstName: t => t.isRequired().isString(),
            lastName: t => t.isString(),
            mobile: t => t.isMobile().toNumber(),
            socialId: t => t.startsWith('@').withError('Social Id is not valid'),
            gender: t => t.enum('male', 'female').mapBy({ male: 'm', female: 'f' }).toUpper().withDefault('M'),
            tags: t => t.toArray(),
            age: t => t.between(18, 50).withError('You must be at least 18 years old').toNumber(),
            color: t => t.sanitize((value, { result }) => {
                return result.gender == 'M' ? 'Black' : 'White';
            }),
            address: _ => _.isObject({
                country: _ => _.isString(),
                city: _ => _.isString()
            })
        });

        await rejects(() => resolver.resolve({ lastName: 'Zohrabi' }), /"firstName" is required/);
        await rejects(() => resolver.resolve({ firstName: 12 }), /must be a valid.*firstName/);
        await rejects(() => resolver.resolve({ mobile: 1234 }), /must be a valid "mobile".*mobile/);
        await rejects(() => resolver.resolve({ id: 1234 }), /must be a valid "objectId".*id/);
        await rejects(() => resolver.resolve({ author: 'asd' }), /not defined.*author/);
        await rejects(() => resolver.resolve({ socialId: 'mdzzohrabi' }), /Social Id is not valid.*socialId/);
        await rejects(() => resolver.resolve({ gender: 'none' }), /must be a valid.*gender/);
        await rejects(() => resolver.resolve({ age: '17' }), /18 years old.*age/);
        await rejects(() => resolver.resolve({ address: 'none' }), /must be a valid.*address/);
        await rejects(() => resolver.resolve({ address: { country: 12 } }), /must be a valid.*address/, 'Address field should matchs schema');

        deepStrictEqual(
            await resolver.resolve({ firstName: 'Masoud', lastName: 'Zohrabi', mobile: '19391239434', tags: 'user', gender: 'male', age: '20' }),
            { firstName: 'Masoud', lastName: 'Zohrabi', mobile: 19391239434, tags: [ 'user' ], gender: 'M', age: 20 }
        )

        deepStrictEqual(
            await resolver.resolve({ firstName: 'Masoud' }),
            { firstName: 'Masoud', gender: 'M' }
        )

        deepStrictEqual(
            await resolver.resolve({ firstName: 'Masoud', gender: 'male', color: 'Red' }),
            { firstName: 'Masoud', color: 'Black', gender: 'M' }
        )

        deepStrictEqual(
            await resolver.resolve({ firstName: 'Masoud', gender: 'female', color: 'Red' }),
            { firstName: 'Masoud', color: 'White', gender: 'F' }
        )

    });

})