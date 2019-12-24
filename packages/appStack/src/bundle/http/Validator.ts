import * as check from 'express-validator';
import { Middleware } from './Middleware';
import { Request } from './Request';
import { Response } from './Response';

export function Check(name: string, config?: (config: check.ValidationChain) => any) {
    return function validatorDecorator(...args: any[]) {
        let validator = check.check(name);
        config && config(validator);
        Middleware([ validator ])(...args);
    }
}

export function ErrorOnInvalidate() {
    return function errorOnInvalidate(...args: any) {
        Middleware([
            function errorOnInvalidate(req: Request, res: Response, next: Function) {
                const errors = check.validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(422).json({ errors: errors.array() });
                } else { next() }
            }
        ])(...args);
    }
}

export const httpValidator = check;