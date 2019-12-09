import { Controller, HttpBundle, Middleware, Request, Response, Inject, Container } from '@azera/stack';
import { readFile } from 'fs';

@Controller('/portal')
@Middleware([
    HttpBundle.static(__dirname + '/../public'),
])
export class PortalController {
 
    indexHtml!: string   

    /**
     * Return Portal modules url
     */
    ['/api/modules'](@Inject() container: Container) {

        let modules = container.getByTag<any>('portal.module');

        return {
            modules: modules.filter(module => 'moduleAssetPath' in module).map(module => module.moduleAssetPath)
        }
    }


    ['/*'](req: Request, response: Response) {
        if (false && this.indexHtml) response.send(this.indexHtml);
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