import { Agent, ClientRequest, RequestOptions } from 'http';
import * as net from 'net';
import { Url, parse as parseUrl, format as formatUrl } from 'url';
import { invariant } from '../Util';

export class ProxyAgent extends Agent {

    private proxy!: Url;

    constructor(proxyAddress: string) {
        super();
        this.proxy = parseUrl(proxyAddress);
        invariant(this.proxy, `an Http(s) proxy server must be defined for ProxyAgent`);
    }

    addRequest(request: ClientRequest, options: RequestOptions) {
        let { proxy } = this;
        let proxySocket = net.connect({ host: proxy.hostname || proxy.host, port: Number(proxy.port) || 80 });

        let path = parseUrl(request.path);

        // @ts-ignore
        request.path = formatUrl({
            ...path,
            protocol: 'http:',
            port: options.port,
            hostname: options.host || options.hostname
        });

        request.onSocket(proxySocket);
    }

}