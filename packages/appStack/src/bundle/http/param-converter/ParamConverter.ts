import { Request } from "..";

export interface ParamConverterConfiguration {
    paramName: string
    paramType: Function
    methodName: string
    controller: Function | object
    value: any
    request: Request
}

export abstract class AbstractParamConverter {
    public abstract supports(config: ParamConverterConfiguration): boolean
    public abstract apply(config: ParamConverterConfiguration): any
}