import { Bundle, ConfigSchema, Inject } from '@azera/stack';
import { AssetManager } from './AssetManager';
import { LocalAssetProvider } from './provider/LocalAssetProvider';

/**
 * Assets bundle
 * 
 * @bundle
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class AssetsBundle extends Bundle {
    static bundleName = "Assets";

    getServices = () => [ AssetManager, LocalAssetProvider ]

    @Inject() init(config: ConfigSchema) {

        config
            .node('assets', { description: 'Assets bundle configuration' })
            .node('assets.storages', { type: 'array', description: 'Asset storages' })
            .node('assets.storages.*.name', { type: 'string', description: 'Storage name' })
            .node('assets.storages.*.description', { type: 'string', description: 'Storage description' })
            .node('assets.storages.*.provider', { type: 'string', description: 'Storage provider name' })
            .node('assets.storages.*.path', { type: 'string', description: 'Storage assets path', validate(value, info) { return info.resolvePath(value); } })
        
    }

    @Inject() run(assets: AssetManager) {
        // assets.delete('local', 'test.jpg').then(console.log).catch(console.error)
    }
}