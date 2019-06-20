declare interface Object {
    also(this: this): this
}

Function.prototype.also = function alsoExtension() {
    return this
}

"asd".also()