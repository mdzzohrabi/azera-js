export interface AuthenticationProvider<T> {

    /** Provider name */
    readonly authenticationName: string;

    /** Get user by credentials */
    getUser(credentials: T): boolean

}