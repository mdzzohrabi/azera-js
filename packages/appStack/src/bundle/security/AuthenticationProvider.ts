import { Request } from '../http';

export abstract class AuthenticationProvider<T> {

    /** Provider name */
    abstract readonly authenticationName: string;

    abstract verify(context: T): Promise<boolean>
    
    abstract authenticate(request: Request): Promise<T | null>

}