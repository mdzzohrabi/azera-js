import { Container, Inject } from "@azera/container";
import { AuthenticationProvider } from "../../security";
import { MongoRepository } from "../MongoRepository";

/**
 * Mongo Authentication/Authorization Provider
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class MongoAuthProvider extends AuthenticationProvider<any> {

    authenticationName: string = 'mongo';

    @Inject() container!: Container;

    canAccept(request: any, options: any) {
        return typeof request == 'object' && typeof options == 'object' && typeof options.authRepository == 'string';
    }

    async verify(context: any, options: any): Promise<boolean> {
        if (!this.canAccept(context, options)) return false;
        return true;
    }

    async authenticate(request: any, options: any): Promise<any> {
        if (!this.canAccept(request, options)) return;        
        let  {authRepository, authKeys = ['username', 'password'], authFindMethod = 'findOne'} = options;
        
        let matchData: any = {};
        if (Array.isArray(authKeys)) {
            authKeys.forEach(key => matchData[key] = request[key] || (request.query && request.query[key]) || (request.body && request.body[key]));
        } else if (typeof authKeys == 'object') {
            Object.keys(authKeys).forEach(key => matchData[key] = authKeys[key] || request[key] || (request.query && request.query[key]) || (request.body && request.body[key]));
        } else {
            return;
        }

        let repository = await this.container.invokeAsync<MongoRepository<any>>(authRepository);
        return (repository as any)[authFindMethod](matchData);
    }

}