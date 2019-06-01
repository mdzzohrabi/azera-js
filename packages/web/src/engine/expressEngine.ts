import { Express } from 'express-serve-static-core';
import * as express from 'express';
import { IEngine } from '.';

export function expressEngine(): IEngine {
    let app = express();

    return app;
}