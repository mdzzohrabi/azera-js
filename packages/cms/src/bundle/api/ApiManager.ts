
import { HashMap, Inject, Reflect } from '@azera/stack';
import * as ts from 'typescript';
import * as vm from 'vm';
import { ApiFunction } from './ApiFunction';
import { TypeDefinition } from './TypeDefinition';

/**
 * ApiManager
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class ApiManager {

    /** TypeScript definition types */
    @Inject() typeDefs!: TypeDefinition;

    /** Api context functions */
    public functions: HashMap<Function> = {};

    /** Context scripts collection */
    public scripts: string[] = [];

    /** ApiCollection */
    public apiMethods: ApiMethod[] = [];

    /**
     * Add declaration to TypeScript declaration storage
     * 
     * @param declaration Declaration string
     */
    addDeclaration(declaration: string) {
        this.typeDefs.push(declaration);
        return this;
    }

    addScript(script: string) {
        let result = ts.transpileModule(script, {
            compilerOptions: {
                module: ts.ModuleKind.AMD
            }
        });

        this.scripts.push(result.outputText);

        return this;
    }

    addFunction<F extends string>(func: F): this
    addFunction<F extends Function>(func: F): this
    addFunction<F extends ApiFunction>(func: F): this
    addFunction(func: any): this {

        if (typeof func == 'string') {
            let _func = eval(`let __script = ${func}; __script`);
            let parsed = Reflect.reflect(_func);
            parsed.toString = func;
            this.typeDefs.addFunction(parsed);
            this.functions[parsed.name] = _func;
        }
        else if (typeof func == 'function') {
            let parsed = Reflect.reflect(func);
            this.typeDefs.addFunction(parsed);
            this.functions[parsed.name] = func;
        } else {
            this.functions[func.name] = func.invoke;
        }

        return this;
    }

    addMethod(method: ApiMethod) {
        this.apiMethods.push(method);
    }

    /**
     * Get VM Context
     */
    getContext() {
        let context = {} as any;
        Object.assign(context, this.functions);
        return vm.createContext(context, {
            name: 'ApiManager'
        });
    }

    /**
     * Compile an script as a function
     * 
     * @param script Script to complie
     */
    compileFunction(script: string) {
        return vm.compileFunction(script, [], {
            parsingContext: this.getContext()
        })
    }

    /**
     * Run an script
     * 
     * @param script Script to run
     */
    run(script: string) {
        return vm.runInNewContext(script, this.getContext(), {
            displayErrors: true
        })
    }

}

export interface ApiMethod {
    name: string
    script: string
    public: boolean
    description?: string
    endPoint?: string
    $invoke?: Function
}