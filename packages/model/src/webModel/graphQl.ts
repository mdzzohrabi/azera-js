import { WebModel, Action, WebModelOptions } from "./baseModel";
import * as s from "string";
import Axios from "axios";
import { Optional } from "@azera/util/types";
// import gql from "graphql-tag";

export type GraphQlModelOptions = {
    gqlType?: string;
    gqlInput?: string;
    gqlSection?: string;
    fields: string[];
} & WebModelOptions;

/**
 * GraqhQL Web Client Model
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class GraphQlModel<T = any> extends WebModel<T, GraphQlModelOptions> {

    private ResultField = {
        [Action.ALL]: 'all',
        [Action.ONE]: 'one',
        [Action.CREATE]: 'create',
        [Action.DELETE]: 'delete',
        [Action.UPDATE]: 'update'
    };

    sendRequest <R>(data: any, action: Action): Promise<R> {
        return Axios.post(this.options.endPoint,  this.prepareQuery(data, action) ).then( response => {
            return response.data['data']['result'];
        }).then( result => this.ResultField[ action ] ? result[ this.ResultField[ action ] ] : result );
    }

    initOptions(options: GraphQlModelOptions): GraphQlModelOptions {
        return Object.assign({
            gqlType:        s(options.name).humanize().toString(),
            gqlInput: 'I' + s(options.name).humanize().toString(),
            gqlSection:     s(options.name).underscore().toString()
        } as Optional<GraphQlModelOptions> , super.initOptions(options));
    }

    fields(): string[];
    fields(fields?: string[]): this;
    fields(fields?)
    {
        if ( !fields ) return this.options.fields;

        this.options.fields = fields;
        return this;
    }

    protected prepareQuery(data, action: Action): { query: string, variables: any } {
        let { gqlSection, fields, idField, gqlInput } = this.options;

        let Query = (query: string, inputs?: string, type = 'query') => `${ type } ${ inputs ? `(${inputs}) ` : '' }{ result: ${ gqlSection } { ${query} } }`;
        let Mutation = (query: string, inputs: string) => Query(query, inputs, `mutation`);
        let Request = (query, variables = {}) => ({ query, variables });

        switch (action) {
            case Action.ALL:
                return Request( Query(`all { ${ fields.join(', ') } }`) );
                case Action.ONE:
                return Request( Query(`one (id: $id) { ${ fields.join(', ') } }`, `$id: String!`) );
            case Action.DELETE:
                return Request( Mutation(`delete (id: $id) { ok, error }`, `$id: String!`), { id: data[ idField ] });
            case Action.UPDATE:
                return Request( Mutation(`update (id: $id, data: $data) { ok, error }`, `$id: String!, $data: ${ gqlInput }!`), {
                    id: data[ idField ],
                    data: data
                });
            case Action.CREATE:
                return Request( Mutation(`create (data: $data) { ok, error }`, `$data: ${ gqlInput }!`), {
                    data: data
                });
        }
    }
    
}