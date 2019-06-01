export interface IEngine {

    use(...params: Function[]): this;

    listen(port?: number, listener?: Function): any;

}