export function createNamedFunction(name: string, func: Function) {
    return {
        [name]: func
    }[name];
}