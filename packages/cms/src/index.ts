import { Bundle, Container, Controller, HttpBundle, Inject, Kernel, Request, Response, Route, CliBundle, Command, Service, TwigBundle, Middleware, ObjectResolver } from "@azera/stack";

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

    @Middleware('/middle') engineHeader( req: Request, res: Response, next: Function ) {
        console.log('Engine header middleware');
        res.header('Engine', 'Azera AppStack');
        next();
    }

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

class GetTaggedServicesCommand extends Command {
    name: string = 'di:tag <tag>';
    description: string = 'Find services by tag';
    async run( @Inject() container: Container, tag: string ) {

        let services = container.findByTag(tag);

        if (services.length == 0) console.log(`No services found for tag "${ tag }"`);

        let i = 0;
        services.forEach(service => {
            console.log(`${ ++i } : ${ service.name } (${ typeof service.service == 'function' ? service.service.name : '?' })`);
        });

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
    imports: [ DumpParametersCommand, GetTaggedServicesCommand, IndexController ]
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

let config = {
    env: 'env://NODE_ENVIRONMENT',
    $imports : [

    ]
}

let resolver = new ObjectResolver();

console.log( resolver.resolve(config) );

// console.log(kernel.dumpParameters(), kernel.container.findByTag('http.middleware'));
