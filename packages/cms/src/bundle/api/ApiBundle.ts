import { Bundle, Container, Inject, Kernel, Request, Response } from '@azera/stack';
import { compileFunction, createContext } from 'vm';
import { ApiManager } from './ApiManager';
import { ApiMiddlewareFactory } from './middleware/ApiMiddleware';

export class ApiBundle extends Bundle {

    static bundleName = "api";

    getServices() {
        return [ApiMiddlewareFactory];
    }

    init(@Inject() container: Container, @Inject() manager: ApiManager) {

        manager.addFunction({
            name: 'sum',
            invoke : (one: number, two: number) => {
                return one + two;
            }
        })
        .addScript(`
        function s(name: string) {

        }
        `)
        .addFunction(`
        /**
         * Min between two numbers
         * @return {number}
         */
        function min(nOne, nTwo) { return nOne > nTwo ? nTwo : nOne; }`)
        .addFunction(function avg(one: number, two: number) {
            
            /**
             * Average two number
             * Example: avg(5,10) => returns 7.5
             * 
             * @param one {number} Number one
             * @param two {number} Number two
             * @return {number}
             */

            return (one + two) / 2
        })
        .addFunction(function getKernel() {
            /**
             * Get application kernel
             * @return {Kernel}
             */
            return container.invoke(Kernel);
        })
        .addFunction(function send(message: string) {
            (container.getParameter('http.res') as Response).send(message);
        })
        .addFunction(function sendJSON(message: string) {
            (container.getParameter('http.res') as Response).json(message);
        })
        .addMethod({
            name: 'hello',
            public: true,
            endPoint: '/hello',
            script: `
            send("Hello Api Method")
            `
        })
        ;
    }

    async run( @Inject() container: Container, command: string ) {

        // let manager = container.invoke(ApiManager);
       
        // let result = { a: 1, b: 2 }
        // console.time('Eval');
        // for (let i = 0; i < 100000; i++) eval('result.a += result.b; this');
        // console.timeEnd('Eval');
        // console.log(result.a);

        // // result.a = 2;
        // // let script = new Script('a += b');
        // // script.createCachedData();
        
        // // console.time('VM');
        // // for (let i = 0; i < 100000; i++) script.runInContext(result);
        // // console.timeEnd('VM');
        // // console.log(result.a);
        
        // result.a = 3;
        // let fn = compileFunction('a += b; this',[], { parsingContext: createContext(Object.assign(result, manager.getContext())) });
        // console.time('VM2');
        // for (let i = 0; i < 100000; i++) fn();
        // console.timeEnd('VM2');
        // console.log(result.a);

    }

}