import { HashMap } from '@azera/stack';

export interface ApiFunction {
    name: string
    invoke(...params: any[]): any
}