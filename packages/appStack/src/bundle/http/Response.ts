import { Response as BaseResponse, NextFunction } from 'express';

export abstract class Response implements BaseResponse {}
export interface Response extends BaseResponse {}
export class NextFn implements NextFunction {}
export declare interface NextFn {
    (err?: any): void
}