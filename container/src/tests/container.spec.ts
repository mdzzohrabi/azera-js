import { ok, equal, deepEqual, notEqual, fail, ifError, throws } from "assert";
import { isFactory, isService, isDefinition, getDependencies, Container, ServiceNotFoundError } from "../container";
import { Inject, getDefinition, Service, Tag, emitTypes } from "../decorators";
import { IDefinition, IServices, Factory, IFactory } from "../types";
import { ContainerAware } from "../containerAware";

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
                } as IDefinition
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

                @Inject('$$command') commands: ICommand[];

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

            } as IServices);


            equal( container.findByTag('command').length, 2);

            let console = container.get<{ commands: Function[] }>('console');
            equal( console.commands.length , 2);

            let app = container.get<ConsoleApp>('consoleClass');
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

        it('# Runtime injection - Class method invoke', () => {

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


        it('# Type Factory', () => {

            let container = new Container;

            class Logger {}

            @Service({ private: true })
            class Monolog extends Logger { }

            class App {
                constructor( @Inject() public logger: Logger ) { }
            }

            ok( container.invoke(App).logger instanceof Logger );

            container.setFactory(Logger, function () {
                return 'Hello';
            });

            equal( container.invoke(Logger), 'Hello' );

            class LoggerF implements IFactory {
                @emitTypes() create( mongoLog: Monolog ) {
                    console.log('Hello World');
                    return 'asd';
                }
            }

            container.setFactory(Logger, LoggerF);

            console.log(container.invoke(Logger));

            ok( container.invoke(Logger) instanceof Monolog );

        });
    });

});