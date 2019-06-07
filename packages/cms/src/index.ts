import { Bundle, CliBundle, Container, HttpBundle, Inject, Kernel, TwigBundle } from "@azera/stack";

class TestBundle extends Bundle {

    init( @Inject() container: Container, @Inject() kernel: Kernel ) {
        container.setParameter('logger.metas', { env: kernel.env });
    }
}

let kernel = new Kernel('dev', [ new HttpBundle, new CliBundle, new TwigBundle, new TestBundle ]);

kernel.bootAndRun(__dirname + '/../app.config.yml', 'cli').catch(err => {
    console.error(err);
});