import { MessageTransport } from './MessageTransport';
import { Message } from '../Message';

export class MemoryTransport extends MessageTransport<Message, Message> {
    
    static get protocol() { return 'memory:' };
    
    private messages: Message[] = [];

    private onMessage: Function | undefined;
    
    async send(message: Message, extra: object) {
        this.messages.push(message);
        this.onMessage ? this.onMessage() : null;
        return true;
    }
    
    async *waitForMessage() {
        let self = this;
        while (true) {
            if (this.messages.length > 0) yield this.messages.pop()!;
            else await new Promise(resolve => {
                self.onMessage = () => {
                    self.onMessage = undefined;
                    resolve();
                }
            });
        }
    }
    
    async ack(message: Message) {
        let index = this.messages.indexOf(message);
        index <= 0 && this.messages.splice(index, 1);
    }
}