import { Bundle, Container, Controller, HttpBundle, Inject, Kernel, Request, Response, Route, CliBundle, Command, Service, TwigBundle } from "@azera/stack";

class TestBundle extends Bundle {

    init( @Inject() container: Container, @Inject() kernel: Kernel ) {
        container.setParameter('logger.metas', { env: kernel.env });
    }
}

let kernel = new Kernel('dev', [ new HttpBundle, new CliBundle, new TwigBundle, new TestBundle ]);

@Controller()
class LoginController {

    @Route('/login') loginAction(req: Request, res: Response) {
        res.end('Login')
    }

    @Route('/logout') logoutAction(req: Request, res: Response) {
        res.end('Logout')
    }

}

@Controller('/admin', {
    children: [ LoginController ]
})
class IndexController {

    @Route('/') index( @Inject() res: Response ) {
        res.render('index.html.twig', {
            name: 'World'
        })
    }

    @Route('/native') index2( req: Request, res: Response ) {
        res.render('index.html.twig', {
            name: 'World'
        })
    }

}

class DumpParametersCommand extends Command {
    
    description: string = 'Dump container parameters';
    name: string = 'dump:parameters';
    
    async run( @Inject() kernel: Kernel ) {
        console.log(kernel.dumpParameters());       
    }

}

@Service({
    imports: [ DumpParametersCommand, IndexController ]
})
class RunKernel extends Command {
    name = 'web';
    description = 'Start web server';
    async run( @Inject() kernel: Kernel ) {
        kernel.run('web');
    }
}

kernel
    .loadParameters(__dirname + '/../app.config.json')
    .addService(RunKernel)
    .boot()
    .run('cli');

// console.log(kernel.dumpParameters(), kernel.container.findByTag('http.middleware'));
