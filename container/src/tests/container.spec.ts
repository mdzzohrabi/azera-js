//@ts-nocheck
//@ts-ignore

import { deepEqual, equal, notEqual, ok, throws } from "assert";
import { Container, getDependencies, isDefinition, isFactory, isService } from "../container";
import { ContainerAware } from "../containerAware";
import { Inject, Service } from "../decorators";
import { IDefinition, IFactory, IServices } from "../types";
import { FixtureApp } from './fixture/App';
import { IBundle } from './fixture/IBundle';
import { BundleA } from './fixture/BundleA';
import { BundleB } from './fixture/BundleB';
import { HomeController, Request } from './fixture/Controller';
import { Decorator } from '../util';
import forEach from "../../../util/src/forEach";

describe('Util.Decorator', () => {

    it('getType()', () => {

        let Type = Decorator.Type;

        function isType(type: Decorator.Type) {
            return (...args: any[]) => {
                equal( Decorator.getType( args[0], args[1], args[2] ), type );
            };
        }

        @isType(Type.Class) class TestClass {
            @isType(Type.Property) prop1: any;

            constructor( @isType(Type.ConstructorParameter) param1: any ) {
            }

            @isType(Type.Method) method1() {}

            method2( @isType(Type.MethodParameter) param2: any ) {}
        }

        let s = new TestClass("");

    });

});

describe('Container', () => {

    it('isDefinition()', () => {
        ok(!isDefinition({}));
        ok(isDefinition({ service: 12 }));
    });

    describe('isService()', () => {
        it('should works', () => {
            ok(isService(function () { }));
            ok(isService(() => null));
            ok(isService(class { }));
        });

        it('should false for primitives and factories', () => {
            ok(!isService(function cacheFactory() { }));
            ok(!isService(12));
            ok(!isService({}));
            ok(!isService(class logFactory { }));
        });
    });

    describe('isFactory()', () => {
        it('should works', () => {
            ok(isFactory(function cacheFactory() { }));
        });
    });

    describe('getDependencies()', () => {
        it('Function', () => {
            deepEqual(
                getDependencies(function (logger, messageBroker) { }).deps,
                ['logger', 'messageBroker']
            );
        });

        it('Function ($inject)', () => {
            function myService(a, b, c) { }
            myService['$inject'] = ['logger', 'messageBroker'];
            deepEqual(getDependencies(myService).deps, ['logger', 'messageBroker']);
        });

        it('Arrow Function', () => {
            deepEqual(
                getDependencies((logger, messageBroker) => { }).deps,
                ['logger', 'messageBroker']
            );
        });

        it('Arrow Function ($inject)', () => {
            let myService = (a, b, c) => { };
            myService['$inject'] = ['logger', 'messageBroker'];
            deepEqual(getDependencies(myService).deps, ['logger', 'messageBroker']);
        });

        it('Array', () => {
            deepEqual(
                getDependencies(['logger', 'broker', function (a, b) { }]).deps,
                ['logger', 'broker']
            );
        });

        it('Array function deps', () => {
            class A {}
            class B {}
            deepEqual(
                getDependencies([ A, B, (a, b) => null ]).deps,
                [ A, B ]
            );
        });

        it('Class', () => {
            class MyService {
                constructor(logger, broker) {}
            }
            let { deps } = getDependencies( MyService );
            deepEqual( deps, ['logger', 'broker'] );
        });

        it('Class ($inject)', () => {
            class MyService {
                static $inject = [ 'logger', 'broker' ];
                constructor(a, b) {}
            }
            let { deps } = getDependencies( MyService );
            deepEqual( deps, ['logger', 'broker'] );
        });

        it('Class (Inject decorator)', () => {
            @Inject([ 'logger', 'broker' ]) class MyService {
                constructor(a, b) {}
            }
            let { deps } = getDependencies( MyService );
            deepEqual( deps, ['logger', 'broker'] );
        });

    });


    describe('Container', () => {
        
        let container: Container;
        
        before(() => {
            container = new Container;
        });

        it('size()', () => {
            equal( container.size, 1 );
        });

        it('[iterate]', () => {
            for (let name of container) {
                equal(name, 'serviceContainer');
            }
        });

        it('set(HashMap)', () => {
            ok(!container.has('logger'));

            container.set({
                logger: function () {
                    this.age = 12;
                },
                broker: {
                    service: class Broker {
                        hello() { return 'hello'; }
                    },
                    private: true
                }
            });

            ok(container.has('logger'));
            ok(container.has('broker'));
        });

        it('set(name, value)', () => {
            container.set('version', '1.0.2');
            ok(container.hasParameter('version'));
        });

        it('get( parameter )', () => {
            equal( container.get('version'), '1.0.2' );
            equal( container.get('$version'), '1.0.2' );
        });

        it('get( service )', () => {
            equal( container.get<{ age: number }>('logger').age, 12 );
            equal( container.get('logger'), container.get('logger'), 'Logger must be a shared service');

            notEqual( container.get('broker'), container.get('broker'), 'Broker must be a private service' );
        });

        it('getDefinition()', () => {
            equal( container.getDefinition('logger').name, 'logger' );
            throws(() => {
                container.getDefinition('not_defined');
            }, /Service not_defined not found/);
        });

        it('invoke()', () => {
            equal( container.invoke(12), 12);
            equal( container.invoke <Container>('serviceContainer'), container );
            
            let service = container.invoke(function () {
                this.age = 12;
                return this;
            });
            equal(service.age, 12);

            let factory = container.invoke(function configFactory() {
                return {
                    host: 'localhost'
                };
            });

            equal(factory.host, 'localhost');
        });

        it('# advanced', () => {

            // Auto tag command services
            container.autoTag((service) => {
                if ( service.name.endsWith('Command') ) return ['command'];
            });

            interface ICommand {
                command: string;
            }
            

            @Inject([ '$version' ])
            class ConsoleApp {

                @Inject('$$command') commands: ICommand[] = [];

                constructor( public version: string) {}
            }

            container.set({

                version: '1.0.0',

                testCommand: {
                    service: function () {
                        this.command = '45';
                    },
                    tags: ['command']
                },
                myCommand: function () {
                    this.command = '12';
                },
                console: function ( $$command ) {
                    this.commands = $$command;
                },

                consoleClass: ConsoleApp

            });

            equal( container.getByTag('command').length, 2);

            equal( container.findByTag('command').length, 2);

            let vConsole = container.get<{ commands: Function[] }>('console');
            equal( vConsole.commands.length , 2);

            let app = container.get<ConsoleApp>('consoleClass');

            console.log(container.getDefinition(ConsoleApp));

            deepEqual(container.getDefinition(ConsoleApp).properties, {
                commands: []
            });

            equal( app.version, '1.0.0' );
            equal( app.commands.length, 2 );
            equal( app.commands[0].command, '45');
            equal( app.commands[1].command, '12');

        });

        it('# late binding', () => {

            let resolved = false;

            class Logger {
                constructor() {
                    resolved = true;
                }

                send() {}
            }

            class Mailer {
                @Inject('logger', { lateBinding: true }) logger: Logger;
                
                send() {
                    this.logger.send();
                }
            }

            container.set({
                mailer: Mailer,
                logger: Logger
            });

            equal(resolved, false);
            let mailer = container.get <Mailer>('mailer');
            equal(resolved, false);
            mailer.send();
            equal(resolved, true);

        });

        it('# serviceContainer', () => {
            equal( container.get('serviceContainer'), container );
        });

        it('# ContainerAware()', () => {

            class A extends ContainerAware() {
                get hasContainer() {
                    return !!this.container;
                }
            }

            ok( container.invoke(A).hasContainer, `A class must have container`);

            class B extends A {
                isB = true;
            }

            ok( container.invoke(B).isB );
            ok( container.invoke(B).hasContainer, `B class must have container` );

            class C extends ContainerAware(class M { color = "red"; }) {
                say() {
                    return this.color;
                }
            }

            equal(container.invoke(C).say(), "red");
            equal(container.invoke(C).color, "red");
            equal(container.invoke(C).container, container);

            
            @Service({ private: false }) class Test {}

            equal( container.getDefinition(Test).private, false );
            equal( container.getDefinition(Test).name, 'Test');

            equal( container.invoke(Test), container.invoke(Test) , `Runtime-injection must create one instance of shared class`);

        });

        it('# Runtime injection', () => {

            // Create a fressh container
            let container = new Container;
            let invoked = false;

            container.setParameter('loggerNS', 'app');

            abstract class BaseLogger {
                abstract log(message: string);
            }

            @Service('logger') class Logger extends BaseLogger {

                @Inject('serviceContainer') container: Container;

                log(message: string) {
                    invoked = true;
                }

                @Inject('loggerNS') public namespace: string;

                get hasContainer() {
                    return !!this.container;
                }
            }

            @Inject([ Logger ]) class App {
                constructor(private logger: Logger) {}
                run() {
                    this.logger.log('Hello World');
                }
            }

            let app = container.invoke(App);
            app.run();

            ok(invoked, `Logger.log() must be invoked`);
            equal( container.getDefinition(App).name, 'App' );
            equal( container.getDefinition(Logger).name, 'logger' );
            equal( container.invoke(Logger).namespace, 'app' );
            ok( container.invoke(Logger).hasContainer );

            deepEqual( Object.keys(container.definitions), [ 'serviceContainer' ]);

            container.add( Logger );
            deepEqual( container.names, [ 'serviceContainer', 'logger' ] );
            ok( container.has('logger') );

            // Check for instanceof
            ok( (new Logger) instanceof BaseLogger );

            abstract class Command {}
            class Command1 extends Command {}
            class Command2 extends Command {}

            ok( Command1.prototype instanceof Command );

            container
                .autoTag(Command, [ 'command' ])
                .add(Command1, Command2);

            equal( container.findByTag('command').length, 2 );

            class Console {
                @Inject( '$$command' ) commands: Command[];
            }

            let c = container.invoke(Console);
            equal( c.commands.length, 2 );

            let result = container.invoke(function ($loggerNS) {
                return $loggerNS;
            });

            equal(result, 'app');


        });

        it('# Runtime injection - Class method invoke (Container.invokeLater)', () => {

            let container = new Container;

            abstract class Middleware {}
            class Firewall extends Middleware {}
            class Logger {}

            function Custom() {
                return (target, key) => null;
            }

            class App {

                @Inject() middlewares: Middleware[];
                @Inject() logger: Logger;

                @Custom() run( logger: Logger, name: string ) {
                    return { logger , name };
                }

            }

            container
                .autoTag(Middleware, ['middlewares'])
                .add(Firewall);

            let app = container.invoke(App);

            equal(app.middlewares.length, 1);
            ok( app.logger instanceof Logger );

            let result = container.invokeLater(app, 'run');
            let run = result('Masoud');
            ok( run.logger instanceof Logger );
            equal(run.name, 'Masoud');
            // Second call
            run = result('Masoud');
            ok( run.logger instanceof Logger );
            equal(run.name, 'Masoud');

        });

        it('# Runtime injection - Fixture', () => {
            let container = new Container;
            let app = container.invoke(FixtureApp);
            equal( app.bundles.length, 2 );
            ok( app.container instanceof Container, `Container must be injected to FixtureApp`);
        });


        it('# Type-based factory', () => {

            let container = new Container;

            class Logger {}

            @Service({ private: true })
            class Monolog extends Logger { }

            class App {
                constructor( @Inject() public logger: Logger ) { }
            }

            ok( container.invoke(App).logger instanceof Logger, 'App.logger must be instanceof Logger');

            container.setFactory(Logger, function () {
                return 'Hello';
            });

            equal( container.invoke(Logger), 'Hello', `Container must use factory for Logger type`);

            equal( container.invoke([Logger, function (logger) {
                return logger;
            }]), 'Hello');


            class LoggerFactory implements IFactory {
                create() {
                    return new Monolog;
                }
            }

            container.setFactory(Logger, LoggerFactory);
            ok( container.invoke(Logger) instanceof Monolog );

        });

        it('# Fixture - Controller', () => {

            let container = new Container;

            container.add(Request);

            let controller = container.invoke( HomeController );
            let indexAction = container.invokeLater(controller, 'indexAction');
            let signupAction = container.invokeLater(controller, 'signUpAction');
            let logoutAction = container.invokeLater(controller, 'logoutAction');
            let loginAction = container.invokeLater(controller, 'loginAction');

            equal( indexAction(), 12 );
            equal( loginAction(), 12 );
            equal( logoutAction(), 12 );
            deepEqual( signupAction('Hello'), [ 'Hello', 12 ] );

            //console.log( container.getDefinition(HomeController) );

        });
    });

});