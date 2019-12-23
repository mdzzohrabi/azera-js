
import { HashMap, Inject, Kernel, Reflect } from '@azera/stack';
import { promises as fs } from 'fs';
import * as vm from 'vm';
import * as workerThread from 'worker_threads';
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

    /** Cache directory */
    @Inject('=invoke("Kernel").resolvePath("./" + invoke("$config").kernel.cacheDir)') cacheDir!: string;

    @Inject() kernel!: Kernel;

    /** Api context functions */
    public functions: HashMap<Function> = {};

    /** Context scripts collection */
    public scripts: string[] = [];

    /** ApiCollection */
    public apiMethods: ApiMethod[] = [];

    /** Workers */
    public workers: Worker[] = [];
   
    /** Running workers */
    public runningWorkers: { name: string, worker: workerThread.Worker }[] = [];

    /** Context variables */
    public context: { [name: string]: any } = {}

    /**
     * Add declaration to TypeScript declaration storage
     * 
     * @param declaration Declaration string
     */
    addDeclaration(declaration: string | (() => string | Promise<string>)) {
        this.typeDefs.push(declaration);
        return this;
    }

    addDeclarationFile(declaration: string) {
        this.typeDefs.push(async () => {
            const buffer = await fs.readFile(this.kernel.resolvePath(declaration));
            return buffer.toString('utf8');
        });
        return this;
    }

    async addScript(script: string) {
        let ts = await import('typescript');
        let result = ts.transpileModule(script, {
            compilerOptions: {
                module: ts.ModuleKind.AMD,
                declaration: true
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
        return this;
    }

    /**
     * Get VM Context
     */
    getContext(context: any = {}) {
        Object.assign(context, this.functions, this.context);
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

    addContext(name: string, value: any) {
        this.context[name] = value;
        return this;
    }

    /**
     * Run an script
     * 
     * @param script Script to run
     */
    run(script: string, variables: any = {}) {
        script = `(async function apiMethodInvoker() { ${script} })()`;
        return vm.runInNewContext(script, this.getContext(variables), {
            displayErrors: true,
            timeout: 3000            
        })
    }

    addWorker(worker: Worker) {
        this.workers.push(worker);
    }

    async runWorker(worker: Worker) {
        let scriptTmpFile = this.cacheDir + `/worker-${worker.name}.js`;
        if (!await fs.stat(this.cacheDir)) {
            await fs.mkdir(this.cacheDir, { recursive: true });
        }

        if (typeof worker.script === 'string') {
            
        }

        await fs.writeFile(scriptTmpFile, worker.script);

        let thread = new workerThread.Worker(scriptTmpFile, {
            workerData: {},
        });

        thread.on('message', message => {
            console.log('New Message from worker', message);           
        })

        setTimeout(() => {
            thread.postMessage('Masoud')
        }, 2000);

    }

}

export interface Worker {
    name: string
    script: string
}

export interface ApiMethod {
    name: string
    description?: string
    endPoint?: string
    public: boolean
    debug?: boolean
    lastRun?: number
    lastRunDelay?: number
    script: string
    $invoke?: Function
}