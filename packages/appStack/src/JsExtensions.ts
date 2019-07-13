declare interface AlsoCallback<T> {
    (value: T): any
}

declare interface Extensions {
    also(this: this, func: AlsoCallback<this>): this
}

declare interface String extends Extensions { }
declare interface Function extends Extensions { }
declare interface Number extends Extensions { }
declare interface Object extends Extensions { }

let extensions = {
    also<T>(this: T, func: AlsoCallback<T>) {
        func(this);
        return this;
    }
}

Object.keys(extensions).forEach(methodName => {
    [String, Number, Function, Object].forEach(base => {
        (base.prototype as any)[methodName] = (extensions as any)[methodName];
    });
})

let d = new Date;
d.toLocaleString
