import * as check from 'express-validator';
import { Middleware } from './Middleware';
import { Request } from './Request';
import { Response } from './Response';
import { getMeta } from '../../Metadata';

export function Check(name: string, config?: (config: check.ValidationChain) => any) {
    return function validatorDecorator(...args: any[]) {
        let validator = check.check(name);
        config && config(validator);
        Middleware([ validator ])(...args);
    }
}

export function ErrorOnInvalidate() {
    return function errorOnInvalidate(target: any, methodName: string) {
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