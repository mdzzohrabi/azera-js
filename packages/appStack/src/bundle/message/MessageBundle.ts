import { Container, Inject } from '@azera/container';
import { forEach } from '@azera/util';
import * as url from 'url';
import { Bundle } from '../../Bundle';
import { ConfigSchema } from '../../ConfigSchema';
import { Kernel } from '../../Kernel';
import { MessageManager } from './MessageManager';
import { AMQPTransport } from './transport/AMQPTransport';
import { MailTransport } from './transport/MailTransport';
import { MemoryTransport } from './transport/MemoryTransport';
import { MessageTransport } from './transport/MessageTransport';
import { MessageTransportOptions } from './transport/MessageTransportOptions';

/**
 * Message bundle
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class MessageBundle extends Bundle {

    getServices = () => [ AMQPTransport, MemoryTransport, MailTransport ];

    @Inject() init(container: Container, config: ConfigSchema) {

        config
            .node('message', { description: 'Message bundle configuration' })
            .node('message.transports', { description: 'Transports', type: 'object' })
            .node('message.transports.*', { description: 'Transport', type: 'object' })
            .node('message.transports.*.transport', { description: 'Transport DSN, e.g: `amqp://localhost/channel/queue`', type: 'string' })
            .node('message.transports.*.types', { description: 'Transport message types to send', type: 'array' })
            .node('message.transports.*.types.*', { description: 'Transport message type to send', type: 'string' })

        container
            .autoTag(MessageTransport, ['message.transport'])
            .addPipe(MessageManager, async messageManager => {
                let providers = container.findByTag<typeof MessageTransport>('message.transport');
                let transports: { [name: string]: { transport: string, types: string[] } } = container.getParameter('config', {})?.message?.transports || {};
                let kernel = await container.invokeAsync(Kernel);

                forEach(transports, (transport, name) => {
                    // Message types
                    let types: Function[] = (transport.types ?? []).map(type => kernel.use(type));

                    // Transport options
                    let options: MessageTransportOptions = url.parse(transport.transport);
                        options.sendTypes = types;
                        options.receiveTypes = types;

                    // Transport provider
                    let transportProvider = providers.find(provider => provider.service?.protocol == options.protocol)?.service;

                    if (!transportProvider) {
                        throw Error(`Transport provider for protocol "${options.protocol}" not provided`);
                    }

                    let object = new (transportProvider as any)({ ...options, name });

                    if ('container' in object) {
                        object.container = container;
                    }
                    messageManager.transports.push(object);
                });                
            })
        ;

    }
}