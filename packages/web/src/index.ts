/**
 * Typescript project main file
 */
import { Http } from "./http";
import { Kernel } from "./http/kernel";
import { WebApplication } from "./types";

class App extends Kernel {
    init(app: WebApplication) {
        console.log('Init', this.container ? 'Has container' : 'No Container');

        app.get('/', (req, res) => {
            res.end("Test application");
        });

    }
}

Http.from(App).listen(80, () => {
    console.log('Application started');
});

Http.from(app => {

    console.log('ASd');

    app.get('/', (req,res) => {
        res.end('OK');
    });

}).listen(81, () => console.log('Applicaton 2 started'));