import { getDefinition } from '@azera/container/build/decorators';
import { CacheManager } from './CacheManager';

export function Cache(key: string, duration?: number, provider: string = 'memory'): MethodDecorator {
    return function methodCache(target: any, method: string, descriptor) {
        let originalAction = target[method];
        let service = getDefinition(target);

        service.methods[method] = [ CacheManager, ...(service.methods[method] || []) ];

        // @ts-ignore
        descriptor.value = function (cache: CacheManager, ...deps: any[]) {
            return cache.get(provider).memo(key, async () => {
                return originalAction(...deps);
            }, duration);
        };
    }
}