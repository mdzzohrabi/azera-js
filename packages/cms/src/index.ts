import { Kernel } from "@azera/stack";
import { MongooseBundle } from "@azera/stack";
import { ApiBundle } from './bundle/api/ApiBundle';
import { AssetsBundle } from './bundle/assets/AssetsBundle';
import { GraphBundle } from './bundle/graph/GraphBundle';
import { ModelBundle } from './bundle/model/ModelBundle';
import { PortalBundle } from './bundle/portal/PortalBundle';

Kernel
    .enableSourceMap()
    .createFullStack([ new MongooseBundle, new ApiBundle, new ModelBundle, new GraphBundle, new AssetsBundle, new PortalBundle  ])
    .then(kernel => kernel.bootAndRun(__dirname + '/../app.config.yml', 'cli'))
    .catch(console.error);

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