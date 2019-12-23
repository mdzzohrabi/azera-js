import { Bundle, CacheManager, Container, Inject, Kernel, Tag } from '@azera/stack';
import * as http from 'http';
import { IPortalModule } from '../portal/IPortalModule';
import { ApiManager } from './ApiManager';
import { ApiMiddlewareFactory } from './middleware/ApiMiddleware';
import { ApiPortalController } from './portal/ApiPortalController';

@Tag('portal.module')
export class ApiBundle extends Bundle implements IPortalModule {

    get moduleAssetPath() {
        return '/portal/api/apiPortalModule.js';
    }

    @Inject() getPortalModules() {
        let srcDir = './../src/bundle/api/portal/public';
        let distDir = './bundle/api/portal/public';

        return {
            [srcDir + '/apiPortalModule.tsx']: distDir,
            [srcDir + '/node_modules/monaco-editor/esm/vs/editor/editor.worker.js']: distDir,
            [srcDir + '/node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js']: distDir
        }
    }
 
    static bundleName = "Api";

    getServices() {
        return [ApiMiddlewareFactory, ApiPortalController];
    }

    @Inject() init(container: Container, manager: ApiManager) {

        let kernel = container.invoke(Kernel);

        manager
        .addDeclarationFile(__dirname + '/BaseDeclaration.d.ts')
        .addDeclarationFile('@azera/stack/dist/Logger.d.ts')
        .addDeclarationFile('@azera/stack/dist/cache/CacheManager.d.ts')
        .addDeclarationFile('@azera/stack/dist/cache/ICacheProvider.d.ts')
        .addDeclarationFile('@azera/stack/dist/cache/MemoryCacheProvider.d.ts')
        .addDeclaration(() => {
            return `interface Container {
                ${ container.names.map(service => `invoke(name: '${service}'): ${container.getDefinition(service).service?.name};`).join(`\n`) }
            }`
        })
        .addFunction(function getCache() {
            /**
             * Get in memory cache
             * @return {ICacheProvider}
             */
            return container.invoke(CacheManager).get('memory');
        })
        .addContext('get', container.invoke)
        .addContext('console', console)
        .addContext('kernel', kernel)
        .addContext('fetch', function fetch(uri: RequestInfo, options?: RequestInit): Promise<Response> {
            return new Promise((resolve, reject) => {

                let { body, headers, method } = options || {};
                let response: Response;

                let req = http.request(uri.toString(), { method, headers: headers as any }, res => {
                    let buffers: Buffer[] = [];
                    res.on('data', buffer => buffers.push(buffer));
                    res.on('end', () => {

                        let data = Buffer.concat(buffers);

                        response = {
                            body: data as any,
                            clone: () => ({ ...response }),
                            headers: res.headers as any,
                            json: async () => JSON.parse(data.toString('utf8')),
                            ok: true,
                            text: async () => data.toString('utf8'),
                            url: uri.toString(),
                            status: res.statusCode || 500,
                            statusText: res.statusMessage || '',
                            arrayBuffer: () => { throw Error(`Not implements`) },
                            blob: () => { throw Error(`Not implements`) },
                            bodyUsed: true,
                            formData: () => { throw Error(`Not implemented`) },
                            redirected: false,
                            trailer: null as any,
                            type: 'default'
                        };

                        resolve(response);

                    });
                    res.on('error', err => reject(err));
                })
                .on('error', err => reject(err));
                
                if (body) req.write(body);
                
                req.end();

            });
        })
        .addMethod({
            name: 'hello',
            public: true,
            endPoint: '/hello',
            script: `
            send("Hello Api Method")
            `
        })
        
        ;
    }

    async run( @Inject() container: Container, command: string ) {

        let manager = container.invoke(ApiManager);

        // manager.
        // runWorker({
        //     name: 'testWorker',
        //     script: `
        //     let thread = require('worker_threads').parentPort;
        //     console.log("Hello");
        //     thread.on('message', message => {
        //         console.log('New Message from parent');
                
        //     })
        //     `
        // })
       
        // let result = { a: 1, b: 2 }
        // console.time('Eval');
        // for (let i = 0; i < 100000; i++) eval('result.a += result.b; this');
        // console.timeEnd('Eval');
        // console.log(result.a);

        // // result.a = 2;
        // // let script = new Script('a += b');
        // // script.createCachedData();
        
        // // console.time('VM');
        // // for (let i = 0; i < 100000; i++) script.runInContext(result);
        // // console.timeEnd('VM');
        // // console.log(result.a);
        
        // result.a = 3;
        // let fn = compileFunction('a += b; this',[], { parsingContext: createContext(Object.assign(result, manager.getContext())) });
        // console.time('VM2');
        // for (let i = 0; i < 100000; i++) fn();
        // console.timeEnd('VM2');
        // console.log(result.a);

    }

}