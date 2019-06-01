import { Kernel } from "./kernel";
import { is } from "@azera/util";
import { ok } from "assert";
import * as express from "express";
import { WebApplication } from "../types";
import { Container } from "@azera/container";
import { IEngine } from '../engine';
import { expressEngine } from '../engine/expressEngine';

export namespace Http {

    let container: Container;
    let engine   : IEngine;

    function getDefaultContainer(): Container {
        return new Container;
    }

    function getEngine() {
        return engine ? engine : expressEngine();
    }

    function buildKernel(kernelClass: Function, container?: Container) {
        ok( kernelClass.prototype instanceof Kernel, `kernel must be instance of Kernel` );

        // Create new di container
        container = new Container({
            kernel: kernelClass,
            engine: () => getEngine()
        });

        // Build kernel from container
        let kernel = container.get<Kernel>('kernel');

        kernel.init(app as any);

        return app;
    }

    export function from(handler: typeof Kernel | ((app: WebApplication) => void) ): IEngine {

        if ( !is.Function(handler) ) throw Error(`app must be a function`);

        if ( !(handler.prototype instanceof Kernel) )
        {          
            let kernel = class AnonymousKernel extends Kernel {};
            kernel.prototype.init = handler as any;
            handler = kernel;
        }

        return buildKernel(handler as any);
    }

}