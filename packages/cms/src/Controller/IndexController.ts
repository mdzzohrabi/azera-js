import { Controller, Middleware, Route, Inject, Response, Request } from '@azera/stack';
import { LoginController } from './LoginController';

@Controller('/admin', {
    children: [ LoginController ]
})
export class IndexController {

    @Middleware('/') engineHeader( req: Request, res: Response, next: Function ) {
        res.header('Engine', 'Azera AppStack'); return next();
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

    ['/array_to_json']() {
        return {
            name: 'Masoud'
        }
    }

}