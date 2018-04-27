export function describeClass(testCase: Function) {
    let proto = testCase.prototype;
    console.log(Object.keys( Object.create(testCase.prototype) ));
    for (let method in proto) {
        console.log(method);
    }
    describe(testCase.name, () => {
        if ( proto.before ) before(proto.before.bind(testCase));
    });
}

export function TestCase(): ClassDecorator {
    return (target) => {
        describeClass(target);
    }
}