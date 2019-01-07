/**
 * Typescript project main file
 */
import { Http } from "./http";
import { Controller } from "./http/controller";
import { Kernel } from "./http/kernel";
import { WebApplication } from "./types";

class App extends Kernel {
    init(app: WebApplication) {
        console.log('Init', this.container ? 'Has container' : 'No Container');
    }
}

Http.from(App).listen(80, () => {
    console.log('Application started');
});