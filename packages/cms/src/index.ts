import { CliBundle, enableSourceMap, HttpBundle, Kernel, TwigBundle, TypeORMBundle } from "@azera/stack";
import { ApiBundle } from './bundle/api/ApiBundle';
import { GraphBundle } from './bundle/graph/GraphBundle';
import { AssetsBundle } from './bundle/assets/AssetsBundle';
import { ModelBundle } from './bundle/model/ModelBundle';
import { PortalBundle } from './bundle/portal/PortalBundle';

enableSourceMap();

new Kernel(undefined, [ new HttpBundle, new CliBundle, new TwigBundle, new TypeORMBundle, new ApiBundle, new ModelBundle, new GraphBundle, new AssetsBundle, new PortalBundle ])
    // Run
    .bootAndRun(__dirname + '/../config.json', 'cli')
    // Catch exceptions
    .catch(err => {
        console.error(err);
    });
    
// Kernel.createWebApp(9095, class IndexController {

//     ['GET /']() {
//         return { name: 'Hello world' };
//     }

// }).then(kernel => {
//     kernel.container.invoke(EventManager).on(HttpBundle.EVENT_LISTEN, port => {
//         console.log('Web Server started')
//     });
//     kernel.bootAndRun();//__dirname + '/../config.json');
// });

// createMicroKernel([
//     '$env',
//     Kernel,
//     function microApp(env: string, kernel: Kernel, param :string)
//     {
//         console.log(env, kernel.rootDir, param);
//     }
// ]).run('hello');