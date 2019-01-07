export type Optional<T> = { [P in keyof T]+?: T[P]; }

export type Map<V = any> = { [key: string]: V };

export type Constructor<T> = { new (...params: any[]): T };

export type Callback<T> = (value: T) => void;

export type ErrorHandler = (error: Error) => void;

export type AllowExtra<T> = { [K in keyof T]: T[K] } & { [key: string]: any };