import { Server, createServer } from "http";
import { Request, Response } from "./http";

export class WebServer extends Server {

    constructor() {
        super((req, res) => this.requestHandler(req, res));
    }

    private requestHandler(request: Request, response: Response) {
    }

}

let server = new WebServer();