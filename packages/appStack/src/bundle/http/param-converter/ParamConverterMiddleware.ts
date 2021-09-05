import { Container } from "@azera/container";
import { NextFn, Request, RequestInputContext, Response } from "..";
import { AbstractParamConverter } from "./ParamConverter";

export interface RequestDataMappedConverters {
    [name: string]: (value: any, container: Container) => any
}

export type RequestDataConverters = RequestDataMappedConverters | AbstractParamConverter | AbstractParamConverter[]

/**
 * Create a request parameters converter middleware
 * 
 * @param context Request context
 * @param converters Data converters
 */
export function createRequestDataConverterMiddleware(target: any, methodName: string, context: RequestInputContext, converters: RequestDataConverters) {
    if (typeof converters == 'function')
        converters = [converters];
    
    return function requestDataConverterMiddleware(container: Container, request: Request, response: Response, next: NextFn) {
        let promises: Promise<any>[] = [];

        for (let key in converters) {
            let converter: AbstractParamConverter | RequestDataMappedConverters[keyof RequestDataMappedConverters] = (converters as any)[key];
            switch (typeof key) {
                case 'number': {
                    let paramConverter = container.invoke<AbstractParamConverter>(converter);
                    // if (paramConverter.supports())
                    break;
                }
                case 'string':
                case 'function': {

                    break;
                }
            }

            // if (request[context][key]) {
            //     promises.push(
            //         Promise.resolve( converters[key]( request[context][key] ) )
            //         .then(value => request[context][key] = value)
            //     );
            // }
        }

        Promise.all(promises).then(() => next()).catch(next);
    }
}