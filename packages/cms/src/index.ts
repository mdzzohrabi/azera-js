import { Bundle, CliBundle, Container, HttpBundle, Inject, Kernel, TwigBundle, enableSourceMap, TypeORMBundle, EventManager, Request, Response } from "@azera/stack";

enableSourceMap();

class TestBundle extends Bundle {

    init( @Inject() container: Container, @Inject() kernel: Kernel ) {
        container.setParameter('logger.metas', { env: kernel.env });
    }
}

let kernel = new Kernel(undefined, [ new HttpBundle, new CliBundle, new TwigBundle, new TypeORMBundle, new TestBundle ]);

kernel.bootAndRun(__dirname + '/../config.json', 'cli').catch(err => {
    console.error(err);
});

Kernel.createWebApp(9095, class IndexController {

    ['GET /']() {
        return { name: 'Hello world' };
    }

}).then(kernel => {
    kernel.container.invoke(EventManager).on(HttpBundle.EVENT_LISTEN, port => {
        console.log('Web Server started')
    });
    kernel.bootAndRun();//__dirname + '/../config.json');
});

// createMicroKernel([
//     '$env',
//     Kernel,
//     function microApp(env: string, kernel: Kernel, param :string)
//     {
//         console.log(env, kernel.rootDir, param);
//     }
// ]).run('hello');