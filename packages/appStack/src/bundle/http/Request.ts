import { is } from '@azera/util';
import { Request as BaseRequest } from 'express';

export abstract class Request implements BaseRequest {}
export interface Request extends BaseRequest {}

export function isHttpRequest(value: any): value is Request {
    return is.Object(value) && 'params' in value && 'query' in value;
}