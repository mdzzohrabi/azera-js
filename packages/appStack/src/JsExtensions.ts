declare interface AlsoCallback<T> {
    (value: T): any
}

declare interface LetCallback<T, R> {
    (value: T): R
}

declare interface Extensions {
    also(this: this, func: AlsoCallback<this>): this
    let<R>(this: this, func: LetCallback<this, R>): R
}

declare interface String extends Extensions {}
declare interface Function extends Extensions {}
declare interface Number extends Extensions {}
declare interface Object extends Extensions {}
declare interface Array<T> extends Extensions {}

// Extension methods
let extensions = {
    also<T>(this: T, func: AlsoCallback<T>) {
        func(this);
        return this;
    },

    let<T, R>(this: T, func: LetCallback<T, R>) {
        return func(this);
    }
}

// Define extension methods
Object.keys(extensions).forEach(methodName => {
    [String, Number, Function, Object, Array].forEach(base => {
        Object.defineProperty(base.prototype, methodName, {
            enumerable: false,
            configurable: false,
            writable: false,
            value: extensions[methodName as keyof typeof extensions]
        });
    });
});