import { Controller, Middleware, Route, Inject, Response, Request, Template, Header } from '@azera/stack';
import { LoginController } from './LoginController';

@Controller('/admin', {
    children: [ LoginController ]
})
@Header('Area', 'Admin')
@Middleware([
    
    ( req: Request, res: Response, next: Function ) => {
        res.header('Enginess', 'Azera AppStack');
        next();
    }

])
export class IndexController {

    @Middleware('/') engineHeader( req: Request, res: Response, next: Function ) {
        res.header('Engine', 'Azera AppStack'); 
        next();
    }

    ['/']( @Inject() res: Response ) {
        res.render('index.html.twig', {
            name: 'World'
        });
    }

    ['POST /native']( req: Request, res: Response ) {
        res.render('index.html.twig', {
            name: 'World'
        })
    }

    @Header('Controller', 'Template annotated')
    @Header('User', 'Users')
    @Template('index.html.twig')
    ['/template']() {

        return { name: 'Masoud' }
    }

    ['/array_to_json']() {
        return {
            name: 'Masoud'
        }
    }

}