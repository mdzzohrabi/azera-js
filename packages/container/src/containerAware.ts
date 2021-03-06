import { Container } from ".";
import { setDefinition } from "./decorators";
import { IInternalDefinition, Constructor } from "./types";

//@ts-ignore
export function ContainerAware <TBase extends Constructor>(extend: TBase = undefined) {

    extend = extend || class {} as any;

    let _class = class ContainerAware extends extend {
        container?: Container;
    };

    setDefinition(_class, {
        properties: {
            container: 'serviceContainer'
        },
        inherited: true
    } as Partial<IInternalDefinition>);

    return _class;
}