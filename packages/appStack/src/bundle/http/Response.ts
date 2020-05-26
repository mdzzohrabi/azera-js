import * as express from 'express-serve-static-core';

export abstract class Response implements express.Response {}
export interface Response extends express.Response {}
export class NextFn implements express.NextFunction {}
export declare interface NextFn {
    (err?: any): void
}