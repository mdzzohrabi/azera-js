export function wait(timeout: number) {
    return new Promise((done, fail) => {
        setTimeout(done, timeout);
    });
}