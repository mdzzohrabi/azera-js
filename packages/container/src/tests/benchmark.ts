import { hrtime } from 'process';
import { Container, Inject, Service } from '..';
import * as typedi from 'typedi';

type PromiseType<T> = T extends Promise<infer U> ? U : T;
const defaultRepeat = 100;
const now = () => hrtime.bigint()
const nowMs = () => Number(hrtime.bigint() / BigInt(1000000))
const $benchmark = async (name: string, execute: Function, repeat: number = defaultRepeat) => {
    let startTime = now();
    for (let i = 1; i <= repeat; i++) {
        await execute();
    }
    let time = Number((now() - startTime)) / 1000000;
    return { name, time, repeat, fast: '-' };
}
// const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time));
const benchmark = async (groupName: string, tests: { [name: string]: Function }, repeat: number = defaultRepeat) => {
    console.log('🔶', groupName);
    let results: PromiseType<ReturnType<typeof $benchmark>>[] = [];
    for (let test in tests) {
        if (test.endsWith(':before')) continue;
        if (tests[test + ':before']) await tests[test + ':before']();
        results.push( await $benchmark(test, tests[test], repeat) );
    }

    let bestTest = results.reduce((prev, test) => prev && test.time > prev.time ? prev : test);
    results.sort((a, b) => a.time - b.time).forEach(test => {
        let rate = (test.time / bestTest.time);
        test.fast = (test == bestTest ? 'Base line' : ((rate > 3) ? '⚠️  ' : '') + rate.toFixed(2) + 'x slower') + ` (≈ ${(1000/test.time).toFixed(2)} opr/s)`;
    })

    console.table(results);
    console.log('✔️', ` Best time = `, bestTest.name, `\n`);
}

const useProfiler = (target: any) => {
    let profiles: { name: string, startTime: number, endTime: number, time: number }[] = [];
    let baseTarget = target;
    do {
        let keys = Object.getOwnPropertyNames(target);
        for (let key of keys) {
            // Method
            if (typeof baseTarget[key] == 'function') {
                let method: Function = baseTarget[key];
                                
                baseTarget[key] = function () {
                    let startTime = nowMs();
                    let result = method.apply(this, arguments);
                    let endTime = nowMs();
                    profiles.push({ name: key, startTime, endTime, time: endTime - startTime });
                    return result;
                }
            }
        }
    } while (target = Object.getPrototypeOf(target))
    return profiles;
}

// @ts-ignore
const summarizeProfile = (profiles: ReturnType<typeof useProfiler>) => {
    return profiles.reduce<{ name: string, totalTime: number, calls: number }[]>((result, item) => {
        let group = result.find(g => g.name == item.name);
        if (group === undefined) {
            group = { name: item.name, calls: 0, totalTime: 0 };
            result.push(group);
        }
        group.calls++;
        group.totalTime += item.time;
        return result;
    }, []);
}

async function runTest() {
    {
        // Initial
        @Service()
        @typedi.Service()
        class Book { public title!: string }

        @Service({ private: true })
        @typedi.Service({ transient: true })
        class BookTransient { public title!: string }

        let container = new Container();
        
        await benchmark('Class constructor', {
            'new Class'() {
                return new Book();
            },

            // 'new Class (with variable alias and spread parameters)'() {
            //     let $service = Book;
            //     let $args: any[] = [];
            //     return new ($service as any)(...$args);
            // },

            'Container.invoke (Private)'() {
                return container.invoke(BookTransient);
            },

            'TypeDI (Transient)'() {
                return typedi.Container.get(BookTransient)
            }
        }, 10000)

        await benchmark('Class constructor (Shared)', {
            'Container.invoke'() {
                return container.invoke(Book);
            },

            'TypeDI'() {
                return typedi.Container.get(Book)
            }
        }, 10000)
    }

    {
        class BookFinder {}

        // Initial
        class Book {
            findOne(id: number) {
                return id;
            }

            getBookFinder(@Inject() finder: BookFinder) {
                return finder;
            }
        }

        let container = new Container({}, { bookId: 12 });
        let book = new Book();
        let bookService = container.invoke(Book);
        let findOne = container.invokeLater(Book, 'findOne');
        let getBookFinder = container.invokeLater(Book, 'getBookFinder');

        await benchmark('Method call', {
            'native method call'() {
                book.findOne(90);
            },

            'native method call (apply)'() {
                book.findOne.apply(book, [90]);
            },

            'Container.invoke'() {
                container.invoke(bookService,'findOne', 90);
            },

            'Container.invoke (with Dependency)'() {
                container.invoke(bookService,'getBookFinder');
            },

            'Container.invokeLater'() {
                findOne(90);
            },

            'Container.invokeLater (with Dependency)'() {
                getBookFinder();
            }
        }, 10000)
    }
}

runTest();