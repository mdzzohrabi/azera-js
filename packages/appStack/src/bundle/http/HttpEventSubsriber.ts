import { IEventSubscriber } from '../../EventManager';
import { getMeta } from '../../Metadata';
import { Header, Template } from './Decorators';
import { EVENT_HTTP_RESULT, HttpResultEvent } from './Events';

export class HttpEventSubscriber implements IEventSubscriber {
    
    getSubscribedEvents() {
        return {
            [EVENT_HTTP_RESULT]: [ this.headerAnnotation, this.templateAnnotation, this.jsonResponse ]
        }
    }

    jsonResponse(event: HttpResultEvent) {
        if (event.defaultPrevented) return;
        let { result, response: res } = event;
        if ( result !== undefined && result !== null && typeof result != 'function' ) {
            if (typeof result == 'string') {
                res.end(result);
            } else {
                res.json(result);
            }
        }
    }

    templateAnnotation(event: HttpResultEvent) {
        if (event.defaultPrevented) return;

        let template = getMeta(Template, event.controller, event.action);

        if (template && event.response.writable) {
            event.preventDefault();
            event.response.render(template, event.result);
        }
    }

    headerAnnotation(event: HttpResultEvent) {
        if (event.defaultPrevented || event.response.headersSent) return;
       
        let controller = event.controller;
        
        while (controller) {
            let classHeaders = getMeta(Header, controller);
            if (Array.isArray(classHeaders)) {
                classHeaders.forEach(item => event.response.setHeader(item.key, item.value));
            }
            
            controller = controller.parentController;
        }
        
        let actionHeaders = getMeta(Header, event.controller, event.action);
        
        if (Array.isArray(actionHeaders)) {
            actionHeaders.forEach(item => event.response.setHeader(item.key, item.value));
        }

    }


}