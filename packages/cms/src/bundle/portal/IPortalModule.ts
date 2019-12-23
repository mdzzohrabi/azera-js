export interface IPortalModule {
    getPortalModules(...params: any[]): { [entry: string]: string }
}