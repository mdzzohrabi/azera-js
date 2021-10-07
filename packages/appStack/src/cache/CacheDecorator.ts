import { getServiceDefinition } from '@azera/container';
import { CacheManager } from './CacheManager';

/**
 * Cache the result of method
 * 
 * @param key Cache key
 * @param duration Expire duration in Miliseconds
 * @param provider Cache provider name
 */
export function Cache(key: string | Function, duration?: number, provider?: string): MethodDecorator {
    return function methodCache(target: any, method: string, descriptor) {
        let originalAction = target[method];
        let service = getServiceDefinition(target);

        service.methods[method] = [ CacheManager, ...(service.methods[method] || []) ];

        // @ts-ignore
        descriptor.value = function (cache: CacheManager, ...deps: any[]) {           
            return cache.get(provider).memo(String(typeof key == 'function' ? key(...deps) : key), async () => {
                return originalAction.apply(this, deps);
            }, duration);
        };
    }
}