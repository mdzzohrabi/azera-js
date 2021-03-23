import { invariant } from '../helper/Util';
import { CacheProvider } from './CacheProvider';

/**
 * Cache manager
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class CacheManager {

    constructor(providers: CacheProvider[] = []) {
        invariant(Array.isArray(providers), `Providers must be an array of CacheProvider class`);
        providers.forEach(p => this.addProvider(p));
        if (providers.length > 0) this.defaultProvider = providers[0].name;
    }

    /**
     * Default cache provider name
     */
    defaultProvider?: string;

    /**
     * Cache providers
     */
    providers: { [name: string]: CacheProvider } = {};

    /**
     * Define a cache provider
     * @param provider Provider
     */
    addProvider(provider: CacheProvider) {
        this.providers[provider.name] = provider;
    }

    /**
     * Get a cache provider
     * @param providerName Provider name
     */
    get(providerName?: string): CacheProvider {
        if (!providerName) {
            providerName = this.defaultProvider;
            if (!providerName) throw Error(`Cache manager has no default provider, please set defaultProvider for CacheManager`);
        } 
        if (!this.providers[providerName]) throw Error(`No cache provider exists with name ${providerName}`);
        return this.providers[providerName];
    }

}