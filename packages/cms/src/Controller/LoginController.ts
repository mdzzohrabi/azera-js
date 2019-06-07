import { Controller, Route, Request, Response } from '@azera/stack';

@Controller()
export class LoginController {

    @Route('/login') loginAction(req: Request, res: Response) {
        res.end('Login')
    }

    @Route('/logout') logoutAction(req: Request, res: Response) {
        res.end('Logout')
    }

}