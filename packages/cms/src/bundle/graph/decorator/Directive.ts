import { Tag } from '@azera/stack';
import { DocumentNode } from 'graphql';

export interface DirectiveClass {
    directiveName: string
    typeDef: DocumentNode
}

export function Directive(options: { name: string, typeDef: DocumentNode }) {
    return function (target: Function) {

        // Declare tag
        Tag('graphql.directive')(target);

        Object.assign(target, {
            directiveName: options.name,
            typeDef: options.typeDef
        })

    }
}