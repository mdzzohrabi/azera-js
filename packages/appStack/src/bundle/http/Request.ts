import { Request as BaseRequest } from 'express-serve-static-core';

export abstract class Request implements BaseRequest {}
export interface Request extends BaseRequest {}