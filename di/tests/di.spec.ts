import Bun from 'bun';
import { Inject, ServiceCollection } from '..';
import { describe, expect, test } from 'bun:test';
import { getAllAttributes, getAttributes } from '@azera/reflect';

describe('Dependency Injection (DI)', () => {
    describe('ServiceCollection', () => {

        class Logger {
            public loggerId: number = Math.random();
        }

        @Inject() abstract class IBundle { }

        class BundleA implements IBundle { }
        class BundleB implements IBundle { }

        class Application {
            constructor(
                @Inject(IBundle) public bundles: IBundle[]
            ) { }

            @Inject() public logger: Logger | null = null;
        }

        test('Property injection', () => {
            const services = new ServiceCollection();
            services.addSingleton(Logger);
            services.addSingleton(Application);

            const provider = services.buildServiceProvider();
            const app: Application = provider.get(Application);

            expect(app.logger).toBeInstanceOf(Logger);
            expect(app.logger?.loggerId).toBeNumber();
        });

        test('Property array injection in constructor', () => {

            const services = new ServiceCollection();
            services.addSingleton(Application);
            services.addSingleton(Logger);
            services.addSingleton(IBundle, BundleA);
            services.addSingleton(IBundle, BundleB);
            const provider = services.buildServiceProvider();
            const app: Application = provider.get(Application);

            expect(app).toBeInstanceOf(Application);
            expect(app.bundles).toHaveLength(2);
            expect(app.bundles[0]).toBeInstanceOf(BundleA);
            expect(app.bundles[1]).toBeInstanceOf(BundleB);
        });

        test('expect errors when needed services not added to service collection', () => {

            const services = new ServiceCollection();
            const provider = services.buildServiceProvider();

            expect(() => provider.get(Application)).toThrow(/Service "Application" not registered/);

            services.addSingleton(Application);
            const provider2 = services.buildServiceProvider();
            expect(() => provider2.get(Application)).toThrow(/Service "Logger" not registered/);

        });

        test('Scope', () => {

            class Request {
                public id: number;

                constructor() {
                    this.id = Math.random();
                }
            }

            class Controller {
                constructor(
                    @Inject() public request: Request
                ) { }

                getRequestid() {
                    return this.request?.id;
                }
            }

            console.log(getAllAttributes(Controller));

            const services = new ServiceCollection();
            services.addScoped(Controller);
            services.addScoped(Request, () => new Request());

            const provider = services.buildServiceProvider();


            const provider1 = provider.createScope();
            const controller1 = provider1.get(Controller);
            expect(controller1.getRequestid()).toEqual(controller1.getRequestid());

            const controller2 = provider1.get(Controller);
            expect(controller2.getRequestid()).toEqual(controller1.getRequestid());
            expect(controller2.getRequestid()).toBeNumber();

            const provider2 = provider.createScope();

            const controller3 = provider2.get(Controller);
            expect(controller3.getRequestid()).toEqual(controller3.getRequestid());
            expect(controller3.getRequestid()).not.toEqual(controller2.getRequestid());

            const controller4 = provider2.get(Controller);
            expect(controller4.getRequestid()).toEqual(controller3.getRequestid());

        });
    });

});