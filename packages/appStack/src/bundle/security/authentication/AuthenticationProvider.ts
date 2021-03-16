/**
 * Authentication provider
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export abstract class AuthenticationProvider<T> {

    /** Provider name */
    abstract readonly authenticationName: string;

    /** Try to verify a context extracted from signed token */
    abstract verify(context: T, options?: any): Promise<boolean>
    
    /** Try to authenticate (get context) based on given request */
    abstract authenticate(request: any, options?: any): Promise<T | null>

}