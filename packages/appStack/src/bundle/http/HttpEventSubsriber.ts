import { IEventSubscriber } from '../../EventManager';
import { getMeta } from '../../Metadata';
import { Header, Template } from './Decorators';
import { EVENT_HTTP_RESULT, HttpResultEvent, EVENT_HTTP_ERROR, HttpErrorEvent } from './Events';

export class HttpEventSubscriber implements IEventSubscriber {
    
    getSubscribedEvents() {
        return {
            [EVENT_HTTP_RESULT]: [ this.headerAnnotation, this.templateAnnotation, this.returnedResponse ],
            [EVENT_HTTP_ERROR]: this.errorHandler
        }
    }

    errorHandler(event: HttpErrorEvent) {
        if (event.request.headers['content-type']?.includes('application/json')) {
            event.response.status(500).json({ error: event.error.message || 'Unexpected error' });
        } else {
            event.response.status(500).end(event.error.message || 'Unexpected error');
        }
    }

    returnedResponse(event: HttpResultEvent) {
        if (event.defaultPrevented) return;
        let { result, response: res, request: req } = event;
        if ( result !== undefined && result !== null && typeof result != 'function' ) {
            if (result instanceof Error) {
                if (req.headers["content-type"]?.includes('application/json')) {
                    res.status(500).json({ error: result?.message ?? "Something wrong" });
                } else {
                    res.status(500).end(result?.message ?? "Something wrong");
                }
            } else  if (typeof result == 'string') {
                res.end(result);
            } else if (Buffer.isBuffer(result)) {
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