import { WebApplication } from "../types";
import { Inject, Container } from "@azera/container";

export class Kernel {

    @Inject('serviceContainer') container: Container;

    init(app: WebApplication) {

    }

}