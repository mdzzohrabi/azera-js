import { GraphQlModel } from "../webModel/graphQl";
import { deepEqual, equal } from "assert";
import { suite, test } from "mocha-typescript";
import { Action } from "../webModel/baseModel";

@suite(`GraphQL`)
class GraphQlModelTest extends GraphQlModel {

    constructor() {
        super({
            endPoint: `/api`,
            fields: ['id', 'name'],
            name: 'User'
        });
    }

    @test "fields()"() {
        deepEqual( this.fields(), ['id', 'name']);
    }

    @test "prepareQuery()"() {
        equal( this.prepareQuery({}, Action.ALL).query , `query { result: user { all { id, name } } }`);
        equal( this.prepareQuery({}, Action.ONE).query , `query ($id: String!) { result: user { one (id: $id) { id, name } } }`);
        equal( this.prepareQuery({}, Action.CREATE).query , `mutation ($data: IUser!) { result: user { create (data: $data) { ok, error } } }`);
        equal( this.prepareQuery({}, Action.UPDATE).query , `mutation ($id: String!, $data: IUser!) { result: user { update (id: $id, data: $data) { ok, error } } }`);
        equal( this.prepareQuery({}, Action.DELETE).query , `mutation ($id: String!) { result: user { delete (id: $id) { ok, error } } }`);
    }

}

// describe(`GraphQL Model`, () => {

//     let model: GraphQlModel;

//     before(() => {
//         model = new GraphQlModel({
//             endPoint: `/api`,
//             fields: ['id', 'name'],
//             name: 'User'
//         });
//     });

//     it('fields() should return fields', () => {
//         deepEqual( model.fields(), [ 'id', 'name']);
//     })

//     it('should prepare valid query', () => {
        
//     });

// });