import { GraphQlExtension } from './GraphQlExtension';
import { GraphQlSchemaBuilder } from '../GraphQlSchemaBuilder';

export class CoreGraphQlExtension extends GraphQlExtension {

    build(schema: GraphQlSchemaBuilder) {

        // schema.directive('upper', {
        //     resolver: function upperDirective(next, src, args, context) {
        //         console.log('ASd');
                
        //         return next().then(value => {
        //             if (typeof(value) == 'string') return value.toUpperCase();
        //             return value;
        //         })
        //     }
        // });

        schema.add('Query', {
            description: 'Expressions',
            fields: {
                if: {
                    type: 'Query',
                    description: 'If condition',
                    parameters: {
                        cond: 'Boolean'
                    },
                    resolver: function ifField(parent: any, args: { cond: boolean }) {
                        if (args.cond) {
                            return {};
                        } else { return undefined; }
                    },
                }
            }
        })
    }

}