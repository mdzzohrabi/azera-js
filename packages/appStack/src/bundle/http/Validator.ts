import { is } from '@azera/util';
import * as check from 'express-validator';
import { getMeta } from '../../decorator/Metadata';
import { DeSerialize, isISerializable } from '../../helper/Serialize';
import { Middleware } from './Middleware';
import { Request } from './Request';
import { Response } from './Response';

/**
 * Create check validator by type
 * 
 * @param propName Property name
 * @param type Validator type
 */
export function createCheckValidatorByType(checker: check.ValidationChain, type: Function) {
    switch (type) {
        case Number: checker.isNumeric().toInt(); break;
        case String: checker.toString(); break;
        case Boolean: checker.isBoolean().toBoolean(); break;
        case Array: checker.isArray().toArray(); break;
        case Date: checker.isDate().toDate(); break;
    }

    if (isISerializable(type)) {
        checker.customSanitizer(value => DeSerialize(value, type));
    }

    return checker;
}

/**
 * Controller action request validator decorator
 * Example :
 * ```
 * class BookController {
 *      @Post('/book')
 *      @Check({
 *          name: name => name.notEmpty()
 *      })
 *      newBook(req: Request) {
 *      }
 * }
 * ```
 */
export function Check(properties: { [name: string]: (config: check.ValidationChain) => any }): any
export function Check(name: string, config?: (config: check.ValidationChain) => any): any
export function Check(name: any, config?: any)
{
    return function validatorDecorator(...args: any[]) {
        if (is.String(name)) {
            let validator = check.check(name);
            config && config(validator);
            Middleware([ validator ])(...args);
        }
        else if (is.Object(name)) {
            let validators = [];
            for (let prop in name) {
                let validator = check.check(prop);
                if (typeof (name as any)[prop] == 'function') {
                    (name as any)[prop](validator);
                }
                validators.push(validator);
            }
            Middleware(validators)(...args);
        }
    }
}

/**
 * Throw http error on request validation error
 */
export function ErrorOnInvalidate(): MethodDecorator & ClassDecorator {
    return function errorOnInvalidate(target: any, methodName?: any) {
        let decoratedHeaders = getMeta('http:header', target, methodName);
        Middleware([
            function errorOnInvalidate(req: Request, res: Response, next: Function) {
                const errors = check.validationResult(req);
                if (!errors.isEmpty()) {

                    if (Array.isArray(decoratedHeaders)) {
                        decoratedHeaders.forEach(header => res.header(header.key, header.value));
                    }

                    return res.status(422).json({ errors: errors.array() });
                } else { next() }
            }
        ])(target, methodName);
    }
}

export const httpValidator = check;