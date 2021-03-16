import { Inject } from "@azera/container";
import { ConfigSchema } from "../../config/ConfigSchema";
import { Bundle } from "../Bundle";
import { AssetManager } from "./AssetsManager";
import { FileAssetProvider } from "./provider/FileAssetProvider";

/**
 * Assets  bundle
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class AssetsBundle extends Bundle {

    static bundleName = "Assets";
    static version = "1.0.0";

    getServices = () => [ AssetManager, FileAssetProvider ]

    @Inject() init(config: ConfigSchema) {

        config
            .node('assets', { description: 'Assets bundle configuration' })
            .node('assets.storages', { type: 'array', description: 'Asset storages' })
            .node('assets.storages.*.name', { type: 'string', description: 'Storage name' })
            .node('assets.storages.*.description', { type: 'string', description: 'Storage description' })
            .node('assets.storages.*.provider', { type: 'string', description: 'Storage provider name' })
            .node('assets.storages.*.path', { type: 'string', description: 'Storage assets path', validate(value, info) { return info.resolvePath(value); } })
        
    }

}