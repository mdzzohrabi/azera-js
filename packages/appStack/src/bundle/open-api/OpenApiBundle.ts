import { Inject } from "@azera/container";
import { ConfigSchema } from '../../config/ConfigSchema';
import { Bundle } from '../../bundle/Bundle';

/**
 * OpenApi specification generator bundle
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class OpenApiBundle extends Bundle {
    static bundleName = 'OpenApi';
    static version = '1.0.0';

    @Inject() init(config: ConfigSchema) {
        // config
        //     .node('open_api', { description: 'OpenApi specification generator' })
        //     .node('open_api.apps', { description: 'Applications' })
        //     .node('open_api.apps.*', { description: 'Application' })
        //     .node('open_api.apps.*.title', { description: 'Application title' })
        //     .node('open_api.apps.*.version', { description: 'Application version' })
        //     .node('open_api.apps.*.paths', { description: 'Paths' })
        //     .node('open_api.apps.*.paths.*', { description: 'Path' }) // Path Object
        //     .node('open_api.apps.*.paths.*.summary', { description: 'Path summary' })
        //     .node('open_api.apps.*.paths.*.description', { description: 'Path description' })
        //     // .node('open_api.apps.*.paths.*.servers', { description: 'Path summary' })
        //     // .node('open_api.apps.*.paths.*.parameters', { description: 'Path description' })
        //     .node('open_api.apps.*.paths.*.*', { description: 'Path method (get, post, delete, ...)' }) // Operation Object
        //     .node('open_api.apps.*.paths.*.*.tags', { description: 'A list of tags for API documentation control. Tags can be used for logical grouping of operations by resources or any other qualifier.', type: 'array' })
        //     .node('open_api.apps.*.paths.*.*.operationId', { description: 'Unique string used to identify the operation. The id MUST be unique among all operations described in the API. The operationId value is case-sensitive. Tools and libraries MAY use the operationId to uniquely identify an operation, therefore, it is RECOMMENDED to follow common programming naming conventions.' })
        //     .node('open_api.apps.*.paths.*.*.summary', { description: 'A short summary of what the operation does.' })
        //     .node('open_api.apps.*.paths.*.*.description', { description: 'A verbose explanation of the operation behavior. CommonMark syntax MAY be used for rich text representation.' })
        //     .node('open_api.apps.*.paths.*.*.externalDocs', { description: 'Additional external documentation for this operation.' })
        //     .node('open_api.apps.*.paths.*.*.deprecated', { description: 'Declares this operation to be deprecated. Consumers SHOULD refrain from usage of the declared operation. Default value is false.', type: 'boolean' })
        //     .node('open_api.apps.*.paths.*.*.responses', { description: 'Responses' })
        //     .node('open_api.apps.*.paths.*.*.responses.*', { description: 'Response code' })
        //     .node('open_api.apps.*.paths.*.*.responses.*.description', { description: 'Response description' })
        //     .node('open_api.apps.*.paths.*.*.responses.*.content', { description: 'Response description' })
        // ;

        config.node('open_api', node => {
            node
            .withDescription('Open-Api specificaion generator')
            .isObject({
                apps: node => node.withDescription('Applications').isNamedKeyObject({
                    title: node => node.withDescription('Application title').isString(),
                    version: node => node.withDescription('Application version').isString(),
                    paths: node => node.withDescription('Paths').isNamedKeyObject({
                        summary: node => node.withDescription('Path summary'),
                        description: node => node.withDescription('Path description'),
                        '*' : node => node.withDescription('Path methods').isObject({
                            tags: node => node.withDescription('A list of tags for API documentation control. Tags can be used for logical grouping of operations by resources or any other qualifier.').isArray()
                        })
                    })
                })
            })
        })

    }
}