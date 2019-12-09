import { Reflect } from '@azera/stack';

/**
 * TypeScript TypeDefinition storage
 */
export class TypeDefinition extends Array<string | (() => string)> {

    static REGEX_COMMENT = /\/[*]{2,}(?<comment>[\w\W]*)?[*]\//
    static REGEX_STAR_STRIPER = /^\s*[*][ \t\r]*/gm
    static REGEX_PARAM_TYPE = /^(?<type>[nbs])[A-Z]/
    static REGEX_COMMENT_AT = /^\@(?<name>[a-zA-Z]+)\s+(?<value>.*)/gm

    /**
     * Guess a parameter by from its name
     * 
     * @param param Function parameter name
     */
    public guessParamType(param: string) {
        let matched = TypeDefinition.REGEX_PARAM_TYPE.exec(param);
        if (matched) {
            switch (matched.groups!.type) {
                case "b": return 'boolean';
                case "n": return 'number';
                case "s": return 'string';
            }
        }
        return 'any';
    }

    /**
     * Parse a function comment
     * 
     * @param func Function string
     */
    public parseFuncComment(func: string): CommentCompileResult {
        let match = TypeDefinition.REGEX_COMMENT.exec(func);
        
        let result = {
            comment: undefined,
            param: {}
        } as CommentCompileResult;

        if (match) {
            let comment = match.groups!.comment.replace(/\r/g, "").trim().replace(TypeDefinition.REGEX_STAR_STRIPER, '');

            comment = comment.replace(TypeDefinition.REGEX_COMMENT_AT, (match, name, value: string) => {
                if (name == 'param') {
                    let parts = value.split(' ', 3);
                    result.param[ parts[0] ] = {
                        type: parts[1].replace(/[{}]/g,''),
                        description: parts[2]
                    }
                } else {
                    result[name] = value.replace(/[{}]/g,'');
                }
                return '';
            });
            
            result.comment = comment.trim();
        }
        
        return result;
    }

    public addFunction(reflect: ReturnType< typeof Reflect.reflect>) {
        let comment = this.parseFuncComment(reflect.toString);
        
        let typeDef = `declare function ${reflect.name}(${ reflect.parameters.map(p => `${p}: ${ comment.param[p] ? comment.param[p].type : this.guessParamType(p) }`).join(', ') }): ${ comment.return || 'any' }`
        
        // Comment
        if (comment.comment) {
            typeDef = ['/**', ' * ' + comment.comment.split("\n").join("\n * "), ...Object.keys(comment.param).map(p => {
                return ` * @param ${p} ${comment.param[p].description}`;
            }),' */'].join("\n") + "\n" + typeDef;
        }

        this.push(typeDef);
    }

    toString() {
        return this.map(item => typeof item == 'function' ? item() : item).join("\n").replace(/\bexport\s+/g, '').replace(/^import.*from.*(;|$)/gm, '');
    }

}

export interface CommentCompileResult {
    comment?: string
    param: {
        [name: string]: {
            type: string
            description?: string
        }
    }
    [key: string]: any
}