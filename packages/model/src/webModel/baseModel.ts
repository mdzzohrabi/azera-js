import { Optional, AllowExtra } from "@azera/util/types";

export type WebModelOptions = {
    endPoint: string;
    name: string;
    idField?: string;
}

export type ResultResponse = {
    ok: boolean;
    error?: string;
}

export enum Action {
    CREATE, UPDATE, DELETE, ONE, ALL
} 

/**
 * Web Model
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export abstract class WebModel<T = any, O = WebModelOptions, D = AllowExtra<Optional<T>>> {

    protected DEFAULTS: Optional<WebModelOptions> = {
        idField: 'id'
    };

    constructor(protected options: O) {
        this.options = this.initOptions(options);
    }

    protected initOptions(options: O): O {
        return Object.assign({}, this.DEFAULTS, options);
    }

    abstract sendRequest<R>(data: D, action: Action): Promise<R>;

    validate(data: D, action: Action) {}
    handleError(error: Error) { throw error; }

    create<R = ResultResponse> (data: D): Promise<R> {
        return this._sendRequest <R>(data, Action.CREATE);
    }

    update<R = ResultResponse>(data: D): Promise<R> {
        return this._sendRequest<R>(data, Action.UPDATE);
    }

    delete<R = ResultResponse>(id) {
        return this._sendRequest<R>({ id } as any, Action.DELETE);
    }

    findOne(id) {
        return this._sendRequest<T>({ id } as any, Action.ONE);
    }

    findAll() {
        return this._sendRequest<T[]>({} as D, Action.ALL);
    }

    private _sendRequest <R>(data: D, action: Action): Promise<R> {  
        return new Promise(( resolve, fail ) => {
            this.validate(data, action);
            this.sendRequest <R>(data, action)
                .then( resolve )
                .catch( fail );
        }).catch( this.handleError ) as Promise<R>;
    }
}