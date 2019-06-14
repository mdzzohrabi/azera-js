import { Container, Inject } from '@azera/container';
import { Bundle } from '../../Bundle';
import { Kernel } from '../../Kernel';
import { SchemaValidator } from "../../objectResolver/SchemaValidator";
import { DumpProfilerCommand } from './Command/DumpProfilerCommand';
import { ConfigSchemaCommand } from './Command/ConfigSchemaCommand';

/**
 * Core bundle
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */ 
export class CoreBundle extends Bundle {

    static bundleName = 'Core';
    static version = '1.0.0';

    init( @Inject() config: SchemaValidator, @Inject() container: Container ) {

        let kernel = container.invoke(Kernel)!;

        config
        .node('config', { description: 'Config validator configuration', type: 'object' })
        .node('config.allowExtra', { type: 'boolean', description: 'Allow custom configuration node', default: false, validate: (value, info) => {
            config.allowExtra = value;
            return value;
        } });

        config
            .node('kernel', { description: 'Kernel' })
            .node('kernel.rootDir', { description: 'Application root directory path', type: 'string', default: kernel.rootDir })
            .node('kernel.cacheConfig', { description: 'Cache resolved configuration', type: 'boolean', default: true })
            .node('kernel.cacheDir', { description: 'Cache directory', default: '/cache', type: 'string' });

        // Configuration parameters
        config.node('parameters', {
            description: 'Container parameters',
            type: 'object'
        });

        config
        .node('services', { description: 'Container services', type: 'array|object' })
        .node('services.*', { description: 'Service', type: 'object|string', validate: function(service) {
                if (typeof service == 'string') return { service };
                return service;
            }
        })
        .node('services.*.tags', { description: 'Service tags', type: 'array', skipChildren: true })
        .node('services.*.service', { description: 'Service name', type: 'string' })
        .node('services.*.imports', { description: 'Service imports', type: 'array' })
        .node('services.*.private', { description: 'Service singleton or shared', type: 'boolean' })
        ;

    }

    getServices() {
        return [ DumpProfilerCommand, ConfigSchemaCommand ];
    }

    boot( @Inject() container: Container ) {

        let { services, kernel: kernelConfig } = container.get('config') || { services: {}, kernel: {} };
        let kernel = container.invoke(Kernel)!;

        // Kernel configuration
        if ( kernelConfig ) {

            // Root directory
            if ( kernelConfig.rootDir )
                container.setParameter(Kernel.DI_PARAM_ROOT, kernelConfig.rootDir);

            }

        // Configuration services
        if (services) {
            kernel.profiler.start('core.services');
            Object.keys(services).forEach(serviceName => {
                let service = services[serviceName];

                // Added services
                if (!service || typeof service == 'string') {
                    container.add( kernel.use(serviceName) );
                } else {
                    service.service = kernel.use(service.service);
                    container.set(serviceName, service);
                }

            });
            kernel.profiler.end('core.services');
        }   

    }

}