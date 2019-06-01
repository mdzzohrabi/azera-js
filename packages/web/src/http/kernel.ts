import { WebApplication } from "../types";
import { Inject, Container } from "@azera/container";
import { IEngine } from '../engine';

/**
 * Application kernel
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class Kernel {

    /**
     * Kernel Dependency Injection Container
     *
     * @type {Container}
     * @memberof Kernel
     */
    @Inject() public container: Container;

    /**
     * Server engine
     *
     * @type {IEngine}
     * @memberof Kernel
     */
    @Inject('engine') public engine: IEngine;

    /**
     * Kernel Attributes
     *
     * @type {{ [key: string]: any }}
     * @memberof Kernel
     */
    @Inject('kernel.attributes') public attr: { [key: string]: any } = {};

    init(app: WebApplication) {
    }
}