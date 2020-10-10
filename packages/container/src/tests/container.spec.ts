//@ts-nocheck
//@ts-ignore

import { deepEqual, equal, notEqual, ok, throws, deepStrictEqual } from "assert";
import { Container, getDependencies, isDefinition, isFactory, isService, ContainerInvokeOptions } from "../container";
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
import { getParameters } from '@azera/reflect';

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

    describe('Decorators', () => {

        describe('Class Decorator', () => {

            it('should inject constructor parameters', () => {
                @Inject([ 'logger', 'mailer' ])
                class TestClass {
                    constructor(logger, mailer) {}
                }

                let dep = new Container().getDefinition(TestClass);
                deepStrictEqual(dep.parameters, [ 'logger', 'mailer' ]);
            });

            it('should inject contructor parameters with @Inject in parameter', () => {
                class TestClass {
                    constructor( @Inject('logger') _logger, @Inject('mailer') _mailer ) {}
                }
                deepStrictEqual(
                    new Container().getDefinition(TestClass).parameters,
                    [ 'logger', 'mailer' ]
                );
            });

            it('should inject contructor parameters with @Inject in parameter', () => {
                class TestClass2 {
                    constructor( @Inject('logger') _logger, _mailer ) {}
                }
                deepStrictEqual(
                    new Container().getDefinition(TestClass2).parameters,
                    [ 'logger' ]
                );
            });

            it('should inject contructor parameters with @Inject in methods', () => {
                class TestClass2 {
                    hello( @Inject('logger') _logger, _mailer ) {}
                }
                deepStrictEqual(
                    new Container().getDefinition(TestClass2).methods['hello'],
                    [ 'logger' ]
                );
            });            

            it('should resolve parameters when @Inject to method', () => {
                class Logger {}
                class Mailer {}
                class TestClass2 {
                    @Inject() hello(logger: Logger,mailer: Mailer, name: String) {}
                }
                deepEqual(
                    new Container().getDefinition(TestClass2).methods['hello'],
                    [ Logger, Mailer ]
                );
            });            

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
                logger: function loggerService() {
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
            ok( container.has('logger') , '"logger" service not found' );
            equal( container.get<{ age: number }>('logger').age, 12 );
            equal( container.get('logger'), container.get('logger'), 'Logger must be a shared service');

            notEqual( container.get('broker'), container.get('broker'), 'Broker must be a private service' );
        });

        describe('getDefinition()', () => {
            let container: Container;

            before(() => {
                container = new Container({
                    loggerService: function loggerService() { this.age = 12; },
                    loggerFactory: function loggerFactory() {
                        return { age: 12 };
                    },
                    loggerClass: class Logger {
    
                    }
                });
            });

            it('should contains loggerClass', () => ok(container.has('loggerClass')));

            it('should resolve anonymous function', () => {
                let func = function () {};
                let def = container.getDefinition(func);
                equal(def.invoke, true, 'it should invoke anonymous function');
                equal(def.service, func, 'Service must equals to function');
            });

            it('should throw error for not defined services', () => {
                throws(() => {
                    container.getDefinition('not_defined');
                }, /Service "not_defined" not found/);
            });

            describe('anonymous service function', () => {
                let def: IDefinition;
                before(() => def = container.getDefinition('loggerService'));
                it('should resolve name of defined service', () => equal( def.name, 'loggerService' ));
                it('should resolve anonyous service function as not invokable', () => equal(def.invoke, false));
                it('should resolve anonyous function as service not factory', () => equal(def.isFactory, false));
            });

            describe('anonymous factory function', () => {
                let def: IDefinition;
                before(() => def = container.getDefinition('loggerFactory'));
                it('should resolve name of defined service', () => equal( def.name, 'loggerFactory' ));
                it('should resolve anonyous factory function as invokable', () => equal(def.invoke, true));
                it('should resolve function as factory', () => equal(def.isFactory, true));
            });

            describe('class', () => {
                let def: IDefinition;
                before(() => def = container.getDefinition('loggerClass'));
                it('should resolve name of named class', () => equal(def.name, 'loggerClass'));
                it('should resolve class as not invokable', () => equal(def.invoke, false));
            });

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

        describe('Resolve Definition', () => {

            describe('Invoke methods', () => {

                it('should invoke methods', () => {
                    let name: string;
                    let container = new Container().set({
                        message: () => 'Masoud',
                        logger: {
                            service: class Logger {
                                log(message: string) {
                                    name = message;
                                }
                            },
                            calls: {
                                log: ['message']
                            }
                        }
                    });
    
                    container.invoke('logger');
    
                    equal(name, 'Masoud');    
                });

            });

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
                    service: function testCommandService() {
                        this.command = '45';
                    },
                    tags: ['command']
                },
                myCommand: function myCommandService() {
                    this.command = '12';
                },
                console: function consoleService( $$command ) {
                    this.commands = $$command;
                },

                consoleClass: ConsoleApp

            });

            deepEqual( container.getParameters(), { version: '1.0.0' });

            deepEqual( container.findByTag('command').map(d => d.name), [ 'testCommand', 'myCommand' ]);

            equal( container.getByTag('command').length, 2);
            equal( container.findByTag('command').length, 2);

            let vConsole = container.get<{ commands: Function[] }>('console');
            equal( vConsole.commands.length , 2);

            let app = container.get<ConsoleApp>('consoleClass');

            deepEqual(container.getDefinition(ConsoleApp).properties, {
                commands: {
                    lateBinding: true,
                    name: '$$command'
                }
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

            
            @Service({ private: false }) class Test { caseName = "Shared Object"; }

            equal( container.getDefinition(Test).private, false );
            equal( container.getDefinition(Test).name, 'Test');

            equal( container.invoke(Test), container.invoke(Test) , `Runtime-injection must create one instance from a class`);

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
            equal( container.getByTag('command').length , 2);

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

                @Inject() run( logger: Logger, name: string ) {
                    return { logger , name, self: this };
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
            equal(run.self, app);
            // Second call
            run = result('Masoud');
            ok( run.logger instanceof Logger );
            equal(run.name, 'Masoud');

        });

        it('# Runtime injection - Function invoke later', () => {

            let container = new Container();
            container.setParameter('name', 'Masoud');
            let invoked = false;

            let invokable = container.invokeLater(function ($name: string) {
                return $name;
            });

            equal(invoked, false, `Bounded function must not call soon`);

            equal( invokable('ASD'), 'Masoud');

            equal( container.invokeLater([ '$name' , (name: string) => name ])(), 'Masoud' );


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

        describe('Resolve without Inject and Service decorators', () => {

            it.skip('should resolve class constructor parameters', () => {

                let container = new Container();
                class Connection {
                    name = "default";
                }

                @Service()
                class App {
                    constructor(public connection: Connection) {}
                }

                let app = container.invoke(App);

                // Dependencies => ['connection']
                equal(app.connection.name, 'default');

            });

        });

        describe('Type-Based Factory', () => {
            
            it('should invoke create one time for non-private services', () => {
                let container = new Container();
                let count = 0;
                class A {}
                class B {
                    create() {
                        count++;
                        return new A;
                    }
                }
                container.setFactory(A, B);
                container.invoke(A);
                container.invoke(A);

                equal(count, 1);
            });


            it('should invoke create every time for private services', () => {
                let container = new Container();
                let count = 0;
                @Service({ private: true })
                class A {}
                class B {
                    create() {
                        count++;
                        return new A;
                    }
                }
                container.setFactory(A, B);
                container.invoke(A);
                container.invoke(A);

                equal(count, 2);
            });

        });

        describe('Type-Based Properties Injection', () => {

            let container1: Container;
            let container2: Container;
            before(() => {
                container1 = new Container();
                container2 = new Container();
            });

            class A {}
            class B {
                @Inject() public a: A;
            }
            class C {
                @Inject() public a: A;
            }

            it('should separate different containers', () => {
                let b = container1.invoke(B);
                let c = container1.invoke(C);
                equal(b.a, c.a, 'instance of A must be equals in different injections');

                let b2 = container2.invoke(B);
                let c2 = container2.invoke(C);

                equal(b2.a, c2.a, 'instance of A must be equals in different injections');

                notEqual(b.a, b2.a, 'instance of A must be difference in diffenrece containers');
            });

            it('should override class definitions by container specific definitions', () => {

                equal( container.getDefinition(A).private, false );
                container.set(A, { private: true });
                equal( container.getDefinition(A).private, true );

            });

        });

        describe('Factory decorated service', () => {
            it('should use factory for decorated services', () => {

                let container = new Container();

                @Service({
                    factory: () => new Connection("dev")
                })
                class Connection {
                    constructor(public name = "default") {}
                }

                equal( container.invoke(Connection).name, "dev" );

            });
        });

        describe('Conflict', () => {
            it('should works with type-based factory', () => {

                let c1 = new Container();
                let c2 = new Container();

                class Count extends Number {}
                class CounterFactory {
                    i = 1;
                    create() {
                        return new Count(this.i++);
                    }
                }

                c1.setFactory(Count, CounterFactory);
                c2.setFactory(Count, CounterFactory);

                deepEqual([ ...(c1 as any).instances.keys() ], []);
                equal(c1.invoke(Count), 1);
                deepEqual([ ...(c1 as any).instances.keys() ], [CounterFactory, Count]);

                deepEqual([ ...(c2 as any).instances.keys() ], []);
                equal(c2.invoke(Count), 1);
                deepEqual([ ...(c2 as any).instances.keys() ], [CounterFactory, Count]);

                ok(c2.invoke(Count) instanceof Count);

            });

            it('should not conflict with more than one container', () => {

                let c1 = new Container();
                let c2 = new Container();
    
                @Service({ tags: ['counter'] })
                class CounterFactory {
                    i = 1;
                    create() {
                        return this.i++;
                    }
                }

                c1.add(CounterFactory);
                c2.add(CounterFactory);

                notEqual(c1.getDefinition(CounterFactory).namedService, true, `CounterFactory definition must be a non namedService`);
    
                equal(c1.getDefinition(CounterFactory).isFactory, true, `CounterFactory must be factory in container 1`);
                equal(c2.getDefinition(CounterFactory).isFactory, true, `CounterFactory must be factory in container 2`);
    
                deepEqual([ ...(c1 as any).instances.keys() ], []);
                deepEqual(c1.getByTag('counter'), [1]);
                deepEqual([ ...(c1 as any).instances.keys() ], [CounterFactory]);

                deepEqual([ ...(c2 as any).instances.keys() ], []);
                deepEqual(c2.getByTag('counter'), [1]);
                deepEqual([ ...(c2 as any).instances.keys() ], [CounterFactory]);
    
            });
    

        });

    });

    describe(`Async`, () => {
        it(`async arguments injection`, (done) => {

            let container = new Container();
            class Connection { constructor(public name = '') {} }
            class Model { constructor(@Inject() public connection: Connection) {} }

            container.set('connectionString', function connectionStringFactory() {
                return new Promise((resolve, reject) => {
                    setTimeout(() => resolve('yes'), 220);
                });
            });

            container.setFactory(Connection, function connectionFactory(connectionString: string) {
                return Promise.resolve(
                    new Connection(connectionString)
                );
            });

            throws(() => {
                container.invoke(Model);
            }, /not allowed/);

            container.invokeAsync(Model).then(model => {
                ok(model instanceof Model);
                ok(model.connection instanceof Connection);
                equal(model.connection.name, 'yes');
                done();
            }).catch(done);

        });

        it(`async properties injection`, (done) => {

            let container = new Container();

            class Connection { constructor(public name = '') {} }
            class Model { @Inject() public connection: Connection; }

            container.set('connectionString', function connectionStringFactory() {
                return new Promise((resolve, reject) => {
                    setTimeout(() => resolve('yes'), 220);
                });
            });

            container.setFactory(Connection, async function connectionFactory(connectionString: string) {
                return new Connection(connectionString);
            });

            Promise.all([
                container.invokeAsync(Model).then(model => {
                    ok(model.connection instanceof Connection);
                }),

                container.invokeAsync(Model).then(model => {
                    ok(model instanceof Model);
                    ok(model.connection instanceof Connection);
                    equal(model.connection.name, 'yes');
                })
            ])
            .then(done => undefined).then(done).catch(done);
        });

        it(`async function factory should works`, (done) => {
            let container = new Container();
            function delay(time: number) {
                return new Promise((resolve, reject) => setTimeout(resolve, time));
            }
            container.setFactory('connectionString', async function connectionFactory() {
                await delay(200);
                return 'hello';
            });

            container.invokeAsync('connectionString').then(conn => {
                equal(conn, 'hello');
                done();
            }).catch(done);
        });

        it(`async function private factory should works`, (done) => {
            let container = new Container();
            let i = 0;
            function delay(time: number) {
                return new Promise((resolve, reject) => setTimeout(resolve, time));
            }
            container.setFactory('connectionString', async function connectionFactory() {
                await delay(200);
                return 'hello ' + ++i;
            }, true);

            Promise.all([
                container.invokeAsync('connectionString'),
                container.invokeAsync('connectionString')
            ]).then(results => {
                deepStrictEqual(results, ['hello 1', 'hello 2']);
                done();
            }).catch(done);
        });
    });

    describe('Expression injection', () => {
        it('should resolve expression', () => {
            let container = new Container();
            container.setParameter('name', 'Masoud');

            equal( container.invoke('=invoke("name")'), 'Masoud' );
        });
    });

    describe(`Conflict`, () => {
        it(`should not conflict two class with same name`, () => {

            let A = {
                Hello: class Hello { user = 'A'; }
            };

            let B = {
                Hello: class Hello { user = 'B'; }
            };

            let container = new Container();
            equal( container.invoke(A.Hello).user , 'A' );
            equal( container.invoke(B.Hello).user , 'B' );
            equal( container.invoke(A.Hello).user , 'A' );
            container.invoke(A.Hello).user = 'Changed';
            equal( container.invoke(A.Hello).user , 'Changed' );
            equal( container.invoke(B.Hello).user , 'B' );
            
        });
    });

    describe('setAlias()', () => {
        it('should works and not cache service (Direct invoke)', () => {

            class Counter { public count: number = 10; }

            let container = new Container;

            // Direct invoke
            equal(container.invoke(Counter).count, 10);
            container.setAlias(Counter, { count: 12 });
            equal(container.invoke(Counter).count, 12);
        });

        it('should works and not cache service (Method injected mode)', async () => {

            class Counter { public count: number = 10; }
            
            class Controller {
                howMuch(@Inject() counter: Counter) {
                    return counter.count;
                }
            }

            let container = new Container;
            let howMuch = container.invokeLaterAsync(Controller, 'howMuch');

            equal(await howMuch(), 10);
            container.setAlias(Counter, { count: 12 }, 'setAlias not work for method injected service');
            equal(await howMuch(), 12);

        });

    });

    describe('ContainerInvokeOptions', () => {
        it('should works', (done) => {

            let container = new Container();

            
            class Request { id: number = 10; }
            
            class Numbers {
                num = 20
            }

            container.ignoreInvokeLaterDep(Request);

            class Controller {
                @Inject() index(numbers: Numbers, @Query('id') reqId: number, @Query() id: number, req: Request) {
                    return [numbers.num, reqId, id, req.id];
                }
            }
            
            function Query(name?: string): PropertyDecorator {
                return (...params: any[]) => {

                    if (!name) {
                        name = getParameters(params[0][params[1]])[params[2]];
                    }

                    Inject((invokeOptions: ContainerInvokeOptions) => {
                        return invokeOptions.invokeArguments[0][name];
                    })(...params);
                };
            }


            container.invokeLaterAsync(Controller, 'index')({ id: 12 }).then(result => {
                deepEqual(result, [20, 12,12,12]);
                done();
            });

        });
    });

});