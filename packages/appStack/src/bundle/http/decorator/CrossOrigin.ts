// import { createDecorator, Middleware, NextFn, Request, Response } from "@azera/stack";

import { createDecorator } from "../../../decorator/Metadata";
import { NextFn, Response } from "../Response";
import { Middleware } from "./Middleware";
import { Request } from '../Request';
import { SecFetchModes } from "../Types";

/**
 * Http Controller Cross-Origin Headers
 * 
 * @decorator
 */
export const CrossOrigin = createDecorator(function (
    fetchMode: SecFetchModes = 'no-cors',
    allowOrigin: string = '*',
    allowHeaders: string = '*', allowMethods: string = '*', vary: string = 'Origin'
) {
    Middleware([
        function crossOriginDecorator(req: Request, res: Response, next: NextFn) {
            res.header('Sec-Fetch-Mode', fetchMode)
            res.header('Access-Control-Allow-Origin', allowOrigin)
            res.header('Access-Control-Allow-Headers', allowHeaders)
            res.header('Access-Control-Allow-Methods', allowMethods)
            res.header('Vary', vary);
            next();
        }
    ])(this.target, this.propName);
}, 'http:cross_origin');