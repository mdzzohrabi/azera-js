export interface IHttpConfig {
    web: {
        forks?: number,
        port?: number,
        host?: string,
        routes?: {
            [route: string]: IHttpConfigRouteObject | any[]
        }
    }
}

export interface IHttpConfigRouteObject {
    controller?: string,
    type?: 'static' | 'controller'
    method?: string
    resource?: string
    rate_limiter?: {
        name: string,
        key: string,
        message?: string
        tokens?: number
    }[]
}

export type RouteMethods = 'get' | 'post' | 'put' | 'delete' | 'options' | 'use'

export interface IHttpRouteHandlerObject {
    handler: Function
    method: RouteMethods
    middlewares: any[]
}