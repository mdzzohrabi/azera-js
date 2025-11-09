import { describe, expect, test } from 'bun:test';
import { createAttribute, getAttribute, getAttributes, hasAttribute } from '..';

describe('Reflect', () => {

    describe('createAttribute', () => {

        describe('basic usage', () => {

            const Summary = createAttribute((summary: string) => summary, { key: 'summary' });
            const Authorize = createAttribute((roles?: string[]) => roles, { key: 'authorize' });
            const Inject = createAttribute({ key: 'inject' });
            const GET = createAttribute((path: string) => path, { key: 'http:route:get' });

            class DbContext { }
            class Session { }

            @Summary('Class')
            class HomeController {

                @Summary('Property') version: string = '1.0.0';

                @Summary('Method') homes() {
                    return true;
                }

                @Authorize() profile() {
                    return true;
                }

                @GET('/') indexAction(@Inject() db: DbContext, @Inject() session: Session) {
                    return true;
                }
            }

            test('Class attribute', () => {
                expect(getAttributes(HomeController), `HomeController class must have Summary attribute`).toContainKeys([Summary.attrKey]);
            });

            test('Property attribute', () => {
                expect(getAttributes(HomeController, 'version'), `HomeController.version property must have Summary attribute`).toContainKeys([Summary.attrKey]);
                expect(getAttribute(Summary, HomeController, 'version')?.value).toEqual('Property');
                expect(getAttribute(Summary, HomeController, 'version')?.attribute).toEqual(Summary);
                expect(getAttribute(Summary, HomeController, 'version')?.kind).toEqual('property');
                expect(getAttribute(Summary, HomeController, 'version')?.name).toEqual('version');
                expect(getAttribute(Summary, HomeController, 'version')?.type).toEqual(String);
                expect(hasAttribute(Summary, HomeController, 'version')).toBeTrue();
            });

            test('Method attribute', () => {
                expect(getAttributes(HomeController, 'homes'), `HomeController.homes method must have Summary attribute`).toContainKeys([Summary.attrKey]);
                expect(getAttribute(Summary, HomeController, 'homes')?.value).toEqual('Method');
                expect(getAttribute(Summary, HomeController, 'homes')?.attribute).toEqual(Summary);
                expect(getAttribute(Summary, HomeController, 'homes')?.kind).toEqual('method');
                expect(getAttribute(Summary, HomeController, 'homes')?.name).toEqual('homes');
                expect(getAttribute(Summary, HomeController, 'homes')?.type).toEqual(Function);
                expect(hasAttribute(Summary, HomeController, 'homes')).toBeTrue();
            });

            test('Method parameter attribute', () => {
                // expect((getAttributes(HomeController, 'indexAction')), `HomeController.indexAction method must have Inject attribute on parameter`).toContainKeys([GET.attrKey, Inject.attrKey]);
                expect(getAttribute(Inject, HomeController, 'indexAction', 0)?.kind).toEqual('parameter');
                expect(getAttribute(Inject, HomeController, 'indexAction', 0)?.name).toEqual('db');
                expect(getAttribute(Inject, HomeController, 'indexAction', 0)?.type).toEqual(DbContext);
                expect(getAttribute(Inject, HomeController, 'indexAction', 0)?.parameterIndex).toEqual(0);
                expect(hasAttribute(Inject, HomeController, 'indexAction', 0)).toBeTrue();
            });
        });

        test('inheritance', () => {

            const Authorize = createAttribute(() => true, {
                key: 'authorize'
            });

            const Inject = createAttribute(() => true, {
                key: 'inject'
            });

            @Authorize() class SecuredController {

                @Inject() isSecure() { }

            }

            class ProfileController extends SecuredController {
                override isSecure(): void {
                    super.isSecure();
                }
            }

            expect(hasAttribute(Authorize, SecuredController), 'SecuredController must have Authorize attribute').toBeTrue();

            expect(hasAttribute(Authorize, ProfileController), 'ProfileController must inherit attributes from SecuredController').toBeTrue();

            expect(hasAttribute(Inject, ProfileController, 'isSecure'), 'ProfileController.isSecure must inherit attributes from SecuredController.isSecure').toBeTrue();

        });

        test('class static method', () => {

            const Description = createAttribute((description: string) => description);

            class TestClass {
                @Description('Static method') static method() { }
                @Description('Instance method') instanceMethod() { }
            }

            expect(hasAttribute(Description, TestClass, 'method')).toBeTrue();
            expect(hasAttribute(Description, TestClass, 'instanceMethod')).toBeTrue();

        });

        test('Construction parameter injection', () => {

            const Inject = createAttribute(() => true, { key: 'inject' });

            class Logger { }
            class EventManager { }
            class AuthManager { }

            @Inject() class Controller {

                @Inject() logger: Logger = null!

                constructor(
                    @Inject() public eventManager: EventManager,
                    @Inject() authManager: AuthManager
                ) { }

                methodInject(
                    @Inject() eventManager: EventManager,
                    @Inject() authManager: AuthManager
                ) {

                }

            }

            expect(getAttribute(Inject, Controller)?.kind).toEqual('class');
            expect(getAttribute(Inject, Controller)?.name).toEqual('Controller');

            expect(getAttribute(Inject, Controller, 'logger')?.kind).toEqual('property');
            expect(getAttribute(Inject, Controller, 'logger')?.name).toEqual('logger');

            expect(getAttribute(Inject, Controller, 'constructor', 0)?.kind).toEqual('parameter');
            expect(getAttribute(Inject, Controller, 'constructor', 0)?.type).toEqual(EventManager);
            expect(getAttribute(Inject, Controller, 'constructor', 0)?.name).toEqual('eventManager');

            expect(getAttribute(Inject, Controller, 'methodInject', 0)?.kind).toEqual('parameter');
            expect(getAttribute(Inject, Controller, 'methodInject', 0)?.type).toEqual(EventManager);
            expect(getAttribute(Inject, Controller, 'methodInject', 0)?.name).toEqual('eventManager');


        });

        describe('Context', () => {
            test('context-aware attribute', () => {

                const Query = createAttribute(function queryAttribute (queryName?: string) {
                    return queryName ?? this.name;
                });

                class BookController {

                    books(@Query() page = 1) {
                    }

                }

                expect(getAttribute(Query, BookController, 'books', 0)?.value).toBe('page');
                expect(getAttribute(Query, BookController, 'books', 0)?.parameterDefaultValue).toBe('1');


            });
        })
    });

});