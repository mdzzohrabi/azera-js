import { Bundle, ConfigSchema, ConnectionManager, Container, forEach, Inject, Kernel } from '@azera/stack';
import { PortalModelController } from './controller/PortalModelController';
import { ModelDataSource, ModelSelectQuery } from './dataSource/ModelDataSource';
import { Model } from './Model';
import { ModelManager } from './ModelManager';

export class ModelBundle extends Bundle {

    static bundleName = 'Model';

    getServices = () => [ PortalModelController ];

    @Inject() async init(container: Container, config: ConfigSchema, kernel: Kernel) {

        config
            .node('models', { description: 'Api Models' })
            .node('models.*', { description: 'Api Model', type: 'object' })
            .node('models.*.fields', { description: 'Model Fields', type: 'array' })
            .node('models.*.fields.*', { description: 'Field', type: 'object' })
            .node('models.*.fields.*.name', { description: 'Field name', type: 'string' })
            .node('models.*.fields.*.type', { description: 'Field type', type: 'string', default: 'string' })
            .node('models.*.fields.*.length', { description: 'Field length', type: 'number' })
            .node('models.*.fields.*.primary', { description: 'Primary', type: 'boolean', default: false })
            .node('models.*.collection', { description: 'Database collection/table name', type: 'string' })
            .node('models.*.dataSource', { description: 'Datasource name', type: 'string', default: 'main' })
        ;

        // Model manager pipe
        container.addPipe(ModelManager, function modelManagerPipe(modelManager, container) {
            let models: Model[] = container.getParameter('config', {}).models || [];

            forEach(models, (model, name) => {
                modelManager.addModel(Object.assign({ name, lock: true }, model));
            });
        });

        // Model data source factory
        container.setFactory(ModelDataSource, function modelDataSourceFactory() {
            return new ModelDataSource(
                container.invoke(ModelManager),
                container.invoke(ConnectionManager)
            );
        });

        if (kernel.hasBundle('Api'))
            await this.initApiBundle(container);
    }

    async initApiBundle(container: Container) {

        let { ApiManager } = await import('../api/ApiManager');
        let apiManager = container.invoke(ApiManager);

        apiManager
            .addDeclaration(() => {
                let models = container.invoke(ModelManager).toArray().map(model => `'${model.name}'`);
                if (models.length == 0) models.push('string');
                return `type ModelName = ${ models.join(' | ') }`;
            })
            .addDeclaration(`interface ModelSelectQuery {
                fields?: string[]
                where?: any[]
            }`)
            .addFunction(function findAll(modelName: string, query?: ModelSelectQuery) {
                /**
                 * Get a model
                 * @param modelName {ModelName} Model name
                 * @param query {ModelSelectQuery} Select query
                 * @return Promise<any[]>
                 */
                return container.invoke(ModelDataSource).select(modelName, query);
            });
    }


}