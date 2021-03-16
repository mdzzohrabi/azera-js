import type * as twig from 'twig';

type twigAsClass<T = typeof twig> = { [name in keyof T]: T[name] };

export abstract class Twig implements twigAsClass { }
export interface Twig extends twigAsClass { }