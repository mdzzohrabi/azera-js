import { RequestInputContext } from "../Request";
import { RequestDataConverters } from "./ParamConverterMiddleware";

/**
 * Request data converters decorator that makes a middleware to convert parameters
 * @param context Request context
 * @param converters Converters
 * @returns 
 */
 export function RouteRequestConverter(context: RequestInputContext, converters: RequestDataConverters): ClassDecorator | MethodDecorator | ParameterDecorator {
    return function routeRequestConverterDecorator(...args: any[]) {
        // Apply middleware
        // Middleware([
        //     [Container, createRequestDataConverterMiddleware(context, converters)]
        // ])(...args);
    }
}

/**
 * Convert request parameters
 * @param converters Parameter converters
 */
export function ParamConverter(converters: RequestDataConverters) {
    return RouteRequestConverter('params', converters);
}

/**
 * Convert request body
 * @param converters Parameter converters
 */
export function BodyConverter(converters: RequestDataConverters) {
    return RouteRequestConverter('body', converters);
}

/**
 * Convert request query
 * @param converters Parameter converters
 */
 export function QueryConverter(converters: RequestDataConverters) {
    return RouteRequestConverter('query', converters);
}
