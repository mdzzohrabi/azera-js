import { Bundle, Container, Controller, HttpBundle, Inject, Kernel, Request, Response, Route, CliBundle, Command, Service, TwigBundle, Middleware, ObjectResolver, serialize } from "@azera/stack";

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
    name: string = 'di:dump';
    
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

kernel.addService(RunKernel).bootAndRun(__dirname + '/../app.config.yml', 'cli').catch(err => {
    console.error(err);
});

// let config = {
//     $imports : __dirname + '/../app.config.yml'
// }

// let resolver = new ObjectResolver();

// resolver
//     .resolver(ObjectResolver
//         .schemaValidator()
//         .node('parameters', { description: 'Container parameters', type: 'object' })
//         .node('parameters.http.port', { type: 'number', description: 'Web server port', required: true })
//         .node('parameters.http.views', { type: 'string', description: 'Views directory', required: true })
//         .node('parameters.http.viewEngine', { description: 'Web server view engine', required: false })
//         .node('parameters.*', { description: 'Extra parameter' })
//         .node('routes', { type: 'object', description: 'Routes collection' })
//         .node('routes.**', { description: 'Route item' })
//         .resolver
//     )
//     .resolve(config)
//     .then(result => {

//         console.log(result)
        
//         kernel
//             .loadParameters(result.parameters)
//             .addService(RunKernel)
//             .boot()
//             .run('cli');

//     })
//     .catch(err => console.log(err))
// ;

// console.log(kernel.dumpParameters(), kernel.container.findByTag('http.middleware'));
