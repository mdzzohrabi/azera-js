import * as http from "http";
import { Environment } from "../environment";
import { Router } from "./router";

/**
 * Web kernel
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class Kernel {

    constructor(
        public env: Environment,
        public router: Router
    ) { }

}