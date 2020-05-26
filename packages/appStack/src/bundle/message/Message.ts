/**
 * Message object
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class Message<T = any> {

    constructor(public content: T) { }

}