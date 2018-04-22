import { Kernel } from "./kernel";
import { is } from "@azera/util";
import { ok } from "assert";
import * as express from "express";
import { WebApplication } from "../types";
import { Container } from "@azera/container";

export namespace Http {

    let container: Container;
    function getDefaultContainer(): Container {
        return container ? container : container = new Container;
    }

    function buildKernel(kernelClass: Function, container?: Container) {
        ok( kernelClass.prototype instanceof Kernel, `kernel must be instance of Kernel` );

        container = container || getDefaultContainer();
        container.set('kernel', kernelClass);

        let kernel = container.get<Kernel>('kernel');
        let app = express();

        kernel.init(app);

        return app;
    }

    export function from(handler: Function): WebApplication {

        if ( !is.Function(handler) ) throw Error(`app must be a function`);

        if ( handler.prototype instanceof Kernel ) {
            handler = buildKernel(handler as any);
        }

        let app = express();
        app.use(handler as any);
        
        return app;
    }

}