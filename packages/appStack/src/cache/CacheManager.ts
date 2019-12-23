import { ICacheProvider } from './ICacheProvider';
import { MemoryCacheProvider } from './MemoryCacheProvider';

/**
 * Cache manager
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class CacheManager {

    defaultProvider?: string;

    providers: { [name: string]: ICacheProvider } = {};

    constructor() {
        this.addProvider(new MemoryCacheProvider);
    }

    addProvider(provider: ICacheProvider) {
        this.providers[provider.name] = provider;
    }

    get(providerName?: string) {
        if (!providerName) {
            providerName = this.defaultProvider;
            if (!providerName) throw Error(`Cache manager has no default provider, please set defaultProvider for CacheManager`);
        } 
        if (!this.providers[providerName]) throw Error(`No cache provider exists with name ${providerName}`);
        return this.providers[providerName];
    }

}