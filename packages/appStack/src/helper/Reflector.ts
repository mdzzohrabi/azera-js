export namespace Reflector {

    /**
     * Create a named function
     * 
     * @param name Function name
     * @param func Function
     * @returns 
     */
    export function createNamedFunction(name: string, func: Function) {
        return {
            [name]: func
        }[name];
    }

}