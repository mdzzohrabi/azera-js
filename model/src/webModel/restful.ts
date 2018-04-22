import { WebModel, Action } from "./baseModel";

class RestFulModel extends WebModel {
    sendRequest <T>(data: any, action: Action): Promise<T> {
        throw new Error("Method not implemented.");
    }
}
