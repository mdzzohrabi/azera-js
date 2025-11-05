import { describe, expect, test } from 'bun:test';
import { createAttribute, getAttribute, getAttributes, hasAttribute } from '..';

describe('Reflect', () => {

    describe('createAttribute', () => {
        test('must works', () => {

            const Summary = createAttribute((summary: string) => summary);
            const Authorize = createAttribute((roles?: string[]) => roles);

            @Summary('Class')
            class HomeController {

                @Summary('Property') version = '1.0.0';

                @Summary('Method') homes() {
                    return true;
                }

                @Authorize() profile() {
                    return true;
                }
            }

            expect(getAttributes(HomeController)).toContainKeys([Summary.attrKey]);
            expect(getAttributes(HomeController, 'version')).toContainKeys([Summary.attrKey]);
            expect(getAttributes(HomeController, 'homes')).toContainKeys([Summary.attrKey]);
            expect(getAttribute(Summary, HomeController, 'homes')?.value).toEqual('Method');
            expect(getAttribute(Summary, HomeController, 'homes')?.attribute).toEqual(Summary);
            expect(getAttribute(Summary, HomeController, 'homes')?.kind).toEqual('method');
            expect(getAttribute(Summary, HomeController, 'homes')?.name).toEqual('homes');
            expect(hasAttribute(Summary, HomeController, 'homes')).toBeTrue();
            expect(hasAttribute(Authorize, HomeController, 'homes')).toBeFalse();
            expect(hasAttribute(Authorize, HomeController, 'profile')).toBeTrue();

        });

        test('inheritance', () => {

            const Authorize = createAttribute(() => true);

            @Authorize() class SecuredController {}

            class ProfileController extends SecuredController {}

            expect(hasAttribute(Authorize, ProfileController), 'ProfileController must inherit attributes from SecuredController').toBeTrue();

        });

        test('Context.static', () => {

            const Description = createAttribute((description: string) => description);

            class TestClass {
                @Description('Static method') static method() {}
                @Description('Instance method') instanceMethod() {}
            }

            expect(hasAttribute(Description, TestClass, 'method')).toBeTrue();
            expect(hasAttribute(Description, TestClass, 'instanceMethod')).toBeTrue();

        });
    });

});