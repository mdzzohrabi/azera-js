import { WebApplication } from "../types";
import { Inject, Container } from "@azera/container";

/**
 * Application kernel
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class Kernel {

    @Inject() public container: Container;

    init(app: WebApplication) {

    }
}