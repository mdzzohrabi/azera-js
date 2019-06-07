import { Bundle } from '../../Bundle';
import { Inject, Container } from '@azera/container';
import { SchemaValidator } from '../../ObjectResolver';
import { Kernel } from '../../Kernel';
import { DumpProfilerCommand } from './Command/DumpProfilerCommand';

/**
 * Core bundle
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */ 
export class CoreBundle extends Bundle {

    static bundleName = 'Core';
    static version = '1.0.0';

    init( @Inject() config: SchemaValidator ) {

        config
            .node('kernel', { description: 'Kernel' })
            .node('kernel.cacheConfig', { description: 'Cache resolved configuration', type: 'boolean', default: true })
            .node('kernel.cacheDir', { description: 'Cache directory', default: '/cache', type: 'string' });

        // Configuration parameters
        config.node('parameters', {
            description: 'Container parameters',
            type: 'object'
        });

        config
        .node('services', { description: 'Container services' })
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
        return [ DumpProfilerCommand ];
    }

    boot( @Inject() container: Container ) {

        let { services } = container.get('config') || { services: {} };
        let kernel = container.invoke(Kernel)!;

        // Configuration services
        if (services) {
            kernel.profiler.start('core.services');
            Object.keys(services).forEach(serviceName => {
                let service = services[serviceName];

                // Added services
                if (!service) {
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