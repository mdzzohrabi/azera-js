import { Request as BaseRequest } from 'express';

export abstract class Request implements BaseRequest {}
export interface Request extends BaseRequest {}