import { Container } from "./container";
import { IInternalDefinition, Constructor } from "./types";
import { setServiceDefinition } from './util';

//@ts-ignore
export function ContainerAware <TBase extends Constructor>(extend: TBase = undefined) {

    extend = extend || class {} as any;

    let _class = class ContainerAware extends extend {
        container?: Container;
    };

    setServiceDefinition(_class, {
        properties: {
            container: 'serviceContainer'
        },
        inherited: true
    } as Partial<IInternalDefinition>);

    return _class;
}