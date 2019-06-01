function checkExpression(expr: string) {
    try {
        eval(expr);
        return true;
    } catch (e) {
        return false;
    }
}

export default {
    arrowFunction: checkExpression(`() => null`),
    class: checkExpression(`class test {}`),
    async: checkExpression(`async function () {}`)
};