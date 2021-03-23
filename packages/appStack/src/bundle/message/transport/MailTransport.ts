import { invariant } from "../../../helper/Util";
import { Message } from "../Message";
import { MessageTransport } from "./MessageTransport";
import { MessageTransportOptions } from "./MessageTransportOptions";
import type { Transporter } from 'nodemailer';

/**
 * Mail Transport Message Interface
 */
export class MailMessage extends Message {
    constructor(public from: string, public to: string, public subject: string, public text: string, public html: string) {
        super(html);
    }
}

/**
 * Mail Transport
 * 
 * @author Masoud Zohrabi <@mdzzohrabi>
 */
export class MailTransport extends MessageTransport {
    
    static get protocol() {
        return 'smtp:';
    }

    protected isTest: boolean = false;
    protected transport!: Transporter;
    
    constructor(options: MessageTransportOptions) {
        super(options);
        invariant(options.host, `Mail transport hostname not specified`);
        this.isTest = this.options.host == "test";
    }

    protected async getNodeMailer() {
        try {
            return await import(`nodemailer`);
        } catch {
            throw Error(`"nodemailer" required for MailTransport, please install it first by "yarn add nodemailer" command`);
        }
    }

    protected async createTestTransport() {
        let nodeMailer = await this.getNodeMailer();
        let testAccount = await nodeMailer.createTestAccount();
        return nodeMailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: testAccount
        })
    }

    protected async createTransport() {
        let [user, pass] = this.options.auth?.split(':') ?? [];

        return (await this.getNodeMailer()).createTransport({
            host: this.options.host!,
            port: Number(this.options.port!) ?? 587,
            secure: this.options.port == '465',
            auth: { user, pass }
        })
    }

    async send(message: MailMessage, extra: object): Promise<boolean> {
        let transport = this.transport ?? await (this.isTest ? this.createTestTransport() : this.createTransport());
        let info = await transport.sendMail(message);
        return true;
    }

    waitForMessage(): AsyncGenerator<Message<any>, any, unknown> {
        throw new Error("Mail transport does not support receive");
    }

    ack(message: Message<any>): Promise<void> {
        throw new Error("Mail transport does not support receive");
    }

}