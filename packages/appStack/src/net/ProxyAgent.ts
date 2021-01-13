import { EventEmitter } from 'events';
import * as http from 'http';
import * as net from 'net';
import { format as formatUrl, parse as parseUrl, Url } from 'url';
import { invariant } from '../Util';
import { HttpProxyAgent } from 'http-proxy-agent'
import { HttpsProxyAgent } from 'https-proxy-agent'

export class ProxyAgent extends EventEmitter {

    static from(url: string, https = false) {
        if (https) return new HttpsProxyAgent(url);
        return new HttpProxyAgent(url);
    }

    private proxy!: Url;

    constructor(proxyAddress: string) {
        super();
        this.proxy = parseUrl(proxyAddress);
        invariant(this.proxy, `an Http(s) proxy server must be defined for ProxyAgent`);
    }

    addRequest(request: http.ClientRequest, options: http.RequestOptions) {
        let { proxy } = this;
        let proxySocket = net.connect({ host: String(proxy.hostname || proxy.host), port: Number(proxy.port) || 80 });

        let isSecure = options.protocol == 'https:';

        let path = parseUrl(request.path);
        
        if (isSecure) {
            let payload = `CONNECT ${options.host}:443 HTTP/1.1\r\n`;

            if (options.headers) {
                let headers: { [name: string]: string } = { ...options.headers } as any;
                
                for (let name in Object.keys(headers)) {
                    if (headers[name]) {
                        payload += `${name}: ${headers[name]}\r\n`;
                    }
                }
            }

            // @ts-ignore
            request.path = formatUrl({
                ...path,
                protocol: 'https:',
                port: isSecure ? 443 : options.port,
                hostname: options.host || options.hostname
            });

            proxySocket.write(`${payload}\r\n`);
            proxySocket.once('data', buffer => {
                if (buffer.toString('utf8').includes('Connection established')) {
                    request.onSocket(proxySocket);
                }            
            });
        }
        else {
            // @ts-ignore
            request.path = formatUrl({
                ...path,
                port: options.port,
                hostname: options.host || options.hostname
            });

            request.onSocket(proxySocket);
        }
    }

}