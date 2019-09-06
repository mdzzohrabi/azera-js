import { Bundle, CliBundle, Container, HttpBundle, Inject, Kernel, TwigBundle, createMicroKernel, TypeORMBundle } from "@azera/stack";

class TestBundle extends Bundle {

    init( @Inject() container: Container, @Inject() kernel: Kernel ) {
        container.setParameter('logger.metas', { env: kernel.env });
    }
}

let kernel = new Kernel('dev', [ new HttpBundle, new CliBundle, new TwigBundle, new TypeORMBundle, new TestBundle ]);

kernel.bootAndRun(__dirname + '/../config.json', 'cli').catch(err => {
    console.error(err);
});

// createMicroKernel([
//     '$env',
//     Kernel,
//     function microApp(env: string, kernel: Kernel, param :string)
//     {
//         console.log(env, kernel.rootDir, param);
//     }
// ]).run('hello');