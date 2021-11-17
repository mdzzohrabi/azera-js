import { MessageTransport } from './MessageTransport';
import { Message } from '../Message';
import { MessageTransportOptions } from './MessageTransportOptions';
import type { Connection } from 'amqplib';

/**
 * AMQP transport provider
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class AMQPTransport extends MessageTransport<Message> {

    private _connection!: Connection;

    constructor(options: MessageTransportOptions) {
        super(options);
        if (!options.pathname) {
            throw Error(`Queue name must be defined to amqp transport`);
        }
    }

    public async getConnection() {
        if (this._connection) return this._connection;
        let amqp = await import('amqplib');
        return this._connection = await amqp.connect({
            hostname: this.options.hostname!,
            port: Number(this.options.port) ?? undefined,
        });
    }

    static get protocol() {
        return 'amqp:';
    }

    async send(message: Message, extra: object) {
        let conn = await this.getConnection();
        let channel = await conn.createChannel();
        await channel.assertQueue(this.options.pathname!);
        return channel.sendToQueue(this.options.pathname!, Buffer.from(JSON.stringify(message)) );
    }

    async *waitForMessage() {
        let conn = await this.getConnection();
        let channel = await conn.createChannel();
        await channel.assertQueue(this.options.pathname!);
        let onMessage: (message: any) => void
        channel.consume(this.options.pathname!, message => onMessage(message));

        while (true) {
            yield await new Promise(resolve => {
                onMessage = message => {
                    resolve(message);
                }
            }) as Promise<any>;
        }
    }

    async ack(message: any) {
        let conn = await this.getConnection();
        let channel = await conn.createChannel();
        await channel.assertQueue(this.options.pathname!);
        channel.ack(message);
    }

}