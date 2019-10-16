import { Bundle, ConnectionManager, Container, Inject } from '@azera/stack';
import { ConfigSchema } from '@azera/stack/dist/ConfigSchema';
import { forEach } from '../../../../util';
import { ModelDataSource } from './dataSource/DataSourceManager';
import { Model } from './model/Model';
import { ModelManager } from './model/ModelManager';

export class ApiBundle extends Bundle {

    static bundleName = "api";

    init( @Inject() container: Container, @Inject() config: ConfigSchema ) {

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

        // Model manager factory
        container.setFactory(ModelManager, function modelManagerFactory() {
            let modelManager = new ModelManager();

            let models: Model[] = (container.getParameter('config') || {}).models || [];

            forEach(models, (model, name) => {
                modelManager.addModel(Object.assign({ name }, model));
            });

            return modelManager;
        });

        // Model data source factory
        container.setFactory(ModelDataSource, function modelDataSourceFactory() {
            return new ModelDataSource(
                container.invoke(ModelManager),
                container.invoke(ConnectionManager)
            );
        });

    }

    getServices = () => [
    ]

    async run( @Inject() modelDataSource: ModelDataSource, command: string ) {
        if (command == 'api') {

        let users = await modelDataSource.select('User');
        console.log(users);

        console.log(await modelDataSource.select('Project', { fields: ['Name'] }));

        console.log(
         await modelDataSource.getRepository('Project').find()
        )
        
        }

    }

}