import { MessageTransport } from './transport/MessageTransport';
import { Message } from './Message';

/**
 * Message manager
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class MessageManager {

    public transports: MessageTransport[] = [];

    /**
     * Dispatch a message
     * @param message Message
     */
    public async dispatch<T extends Message>(message: T): Promise<boolean> {
        let result = false;
        for (let transport of this.transports) {
            if (transport.accept(message)) {
                result ||= await transport.send(message, {});
            }
        }
        return result;
    }

    /**
     * Wait for a message type
     * @param messageType Message type to wait
     */
    public waitForMessage<T extends Message>(messageType: { new(): T }) {
        let transport = this.transports.find(t => t.accept(messageType));
        if (transport) {
            return transport.waitForMessage();
        }
        throw Error(`No message transport handle this message type.`);
    }

}