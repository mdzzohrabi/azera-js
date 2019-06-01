import { Response as BaseResponse } from 'express';

export abstract class Response implements BaseResponse {}
export interface Response extends BaseResponse {}