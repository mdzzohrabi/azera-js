import { ICacheProvider } from './ICacheProvider';
import { MemoryCacheProvider } from './MemoryCacheProvider';

/**
 * Cache manager
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class CacheManager {

    providers: { [name: string]: ICacheProvider } = {};

    constructor() {
        this.addProvider(new MemoryCacheProvider);
    }

    addProvider(provider: ICacheProvider) {
        this.providers[provider.name] = provider;
    }

    get(providerName: string = 'memory') {
        if (!this.providers[providerName]) throw Error(`No cache provider exists with name ${providerName}`);
        return this.providers[providerName];
    }

}