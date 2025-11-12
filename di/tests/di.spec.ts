import { describe, expect, test } from 'bun:test';
import { Inject, ServiceCollection } from '..';

describe('Dependency Injection (DI)', () => {
    describe('ServiceCollection', () => {

        class Logger { }

        @Inject() abstract class IBundle { }

        class BundleA implements IBundle { }
        class BundleB implements IBundle { }

        class Application {
            constructor(
                @Inject(IBundle) public bundles: IBundle[]
            ) { }

            @Inject() public logger: Logger | null = null;
        }

        test('basic', () => {

            const services = new ServiceCollection();
            services.addSingleton(Application);
            services.addSingleton(Logger);
            services.addSingleton(IBundle, BundleA);
            services.addSingleton(IBundle, BundleB);
            const provider = services.buildServiceProvider();
            const app: Application = provider.get(Application);

            expect(app).toBeInstanceOf(Application);
            expect(app.bundles).toHaveLength(2);
        });

        test('Property injection', () => {
            const services = new ServiceCollection();
            services.addSingleton(Logger);
            services.addSingleton(Application);

            const provider = services.buildServiceProvider();
            const app: Application = provider.get(Application);

            expect(app.logger).toBeInstanceOf(Logger);
        });

        test('expect errors when needed services not added to service collection', () => {

            const services = new ServiceCollection();
            const provider = services.buildServiceProvider();

            expect(() => provider.get(Application)).toThrow(/Service not registered: class Application/);

            services.addSingleton(Application);
            const provider2 = services.buildServiceProvider();
            expect(() => provider2.get(Application)).toThrow(/Service not registered: class Logger/);

        });

        test('Scope', () => {

            class Request {
                public id = Math.random();
            }

            class Controller {
                @Inject() public request!: Request;

                getRequestid() {
                    return this.request.id;
                }

            }

            const services = new ServiceCollection();
            services.addSingleton(Controller);
            services.addTransient(Request, () => {
                return new Request();
            });

            const provider = services.buildServiceProvider();
            const controller = provider.get(Controller);
            // expect(controller.getRequestid()).toEqual(controller.getRequestid());

        });
    });

});