import { Message } from '../Message';
import { MessageTransportOptions } from './MessageTransportOptions';

/**
 * Message transport provide
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export abstract class MessageTransport<T = Message, R  = Message> {

    constructor(public options: MessageTransportOptions) {}

    static get protocol(): string {
        throw Error(`Message transport must to define its protocol`);
    }

    /**
     * Send a message
     * @param message Message to send
     * @param extra Extra message data
     */
    abstract send(message: T, extra: object): Promise<boolean>;

    /**
     * Send a message
     * @param message Message to send
     * @param extra Extra message data
     */
    abstract waitForMessage(): AsyncGenerator<R>;

    abstract ack(message: R): Promise<void>;

    accept(message: T | { new(): T }) {
        return this.options?.sendTypes?.find(t => message == t || message instanceof t) !== undefined;
    }

}