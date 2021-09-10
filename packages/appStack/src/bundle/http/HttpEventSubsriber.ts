import { IEventSubscriber } from '../../event/EventManager';
import { getMeta } from '../../decorator/Metadata';
import { Header, Template } from './decorator/Decorators';
import { EVENT_HTTP_RESULT, HttpResultEvent, EVENT_HTTP_ERROR, HttpErrorEvent } from './Events';

/**
 * Http event-subscriber
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class HttpEventSubscriber implements IEventSubscriber {
    
    getSubscribedEvents() {
        return {
            // Http action result event listeners
            [EVENT_HTTP_RESULT]: [ this.headerAnnotation, this.templateAnnotation, this.returnedResponse ],

            // Http error
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

    /**
     * Optimize the action result
     * 
     * @param event Event
     * @returns 
     */
    returnedResponse(event: HttpResultEvent) {
        if (event.defaultPrevented) return;
        let { result, response: res, request: req } = event;
        if ( result !== undefined && result !== null && typeof result != 'function' ) {
            // Error
            if (result instanceof Error) {
                if (req.headers["content-type"]?.includes('application/json')) {
                    res.status(500).json({ error: result?.message ?? "Something wrong" });
                } else {
                    res.status(500).end(result?.message ?? "Something wrong");
                }
            // String
            } else  if (typeof result == 'string') {
                res.end(result);
            // Buffer
            } else if (Buffer.isBuffer(result)) {
                res.end(result);
            // JSON
            } else {
                res.json(result);
            }
        }
    }

    /**
     * Template decorated action
     * @param event Event
     * @returns 
     */
    templateAnnotation({ defaultPrevented, preventDefault, controller, action, response, result }: HttpResultEvent) {
        if (defaultPrevented) return;

        let template = getMeta(Template, controller, action);

        if (template && response.writable) {
            preventDefault();
            response.render(template, result);
        }
    }

    /**
     * Header decorated action
     * @param event Event
     * @returns 
     */
    headerAnnotation({ defaultPrevented, response, controller, action }: HttpResultEvent) {
        if (defaultPrevented || response.headersSent) return;

        // Controller headers (Hierarchial)
        while (controller) {
            let classHeaders = getMeta(Header, controller);
            if (Array.isArray(classHeaders)) {
                classHeaders.forEach(item => response.setHeader(item.key, item.value));
            }
            
            controller = controller.parentController;
        }
        
        // Action headers
        let actionHeaders = getMeta(Header, controller, action);
        
        if (Array.isArray(actionHeaders)) {
            actionHeaders.forEach(item => response.setHeader(item.key, item.value));
        }
    }


}