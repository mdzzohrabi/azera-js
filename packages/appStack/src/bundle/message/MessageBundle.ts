import { Bundle } from '../../Bundle';
import { Inject, Container } from '@azera/container';
import { MessageTransport } from './transport/MessageTransport';
import { MessageManager } from './MessageManager';
import { ConfigSchema } from '../../ConfigSchema';
import * as url from 'url';
import { forEach } from '@azera/util';
import { Kernel } from '../../Kernel';
import { MessageTransportOptions } from './transport/MessageTransportOptions';
import { AMQPTransport } from './transport/AMQPTransport';
import { MemoryTransport } from './transport/MemoryTransport';

/**
 * Message bundle
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class MessageBundle extends Bundle {

    getServices = () => [ AMQPTransport, MemoryTransport ];

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
            .addPipe(MessageManager, messageManager => {
                let providers = container.findByTag<typeof MessageTransport>('message.transport');
                let transports: { [name: string]: { transport: string, types: string[] } } = container.getParameter('config', {})?.message?.transports || {};
                let kernel = container.invoke(Kernel);
                forEach(transports, (transport, name) => {
                    let types: Function[] = (transport.types ?? []).map(type => kernel.use(type));
                    let options: MessageTransportOptions = url.parse(transport.transport);
                        options.sendTypes = types;
                        options.receiveTypes = types;
                    let transportProvider = providers.find(provider => provider.service?.protocol == options.protocol)?.service;
                    if (!transportProvider) {
                        throw Error(`Transport provider for protocol "${options.protocol}" not provided`);
                    }
                    messageManager.transports.push(new (transportProvider as any)({ ...options, name }));
                });                
            })
        ;

    }
}