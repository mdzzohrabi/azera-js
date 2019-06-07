import { Controller, Middleware, Route, Inject, Response, Request } from '@azera/stack';
import { LoginController } from './LoginController';

@Controller('/admin', {
    children: [ LoginController ]
})
export class IndexController {

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