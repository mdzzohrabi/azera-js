import { Inject, Service } from '../..';


export class Request {
    id = 12;
}

@Service({
    methods: {
        logoutAction: [ Request ]
    }
})
export class HomeController {
 
    indexAction(@Inject() request: Request) {
        return request.id;
    }

    @Inject() loginAction(request: Request) {
        return request.id;
    }

    signUpAction( @Inject() request: Request, hello ) {
        return [ hello, request.id ];
    }

    @Inject() logoutAction(request: Request) {
        return request.id;
    }

}
