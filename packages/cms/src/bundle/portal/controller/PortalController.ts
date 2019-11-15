import { Controller, HttpBundle, Middleware, Request, Response, Inject } from '@azera/stack';
import { readFile } from 'fs';

@Controller('/portal')
@Middleware([
    HttpBundle.static(__dirname + '/../public'),
])
export class PortalController {
    

    ['/api/modules']() {
        return {
            modules: []
        }
    }

    indexHtml!: string

    ['/*'](@Inject() response: Response) {
        if (this.indexHtml) response.send(this.indexHtml);
        else {
            readFile(__dirname + '/../public/index.html', (err, buffer) => {
                if (buffer) {
                    this.indexHtml = buffer.toString('utf8');
                    response.send(this.indexHtml);
                }
            });
        }
    }

}