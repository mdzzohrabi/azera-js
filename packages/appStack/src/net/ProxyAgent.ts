import { EventEmitter } from 'events';
import * as http from 'http';
import * as net from 'net';
import { URL } from 'url';
import { invariant } from '../helper/Util';
import { HttpProxyAgent } from 'http-proxy-agent'
import { HttpsProxyAgent } from 'https-proxy-agent'

/**
 * Net ProxyAgent
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class ProxyAgent extends EventEmitter {

    static from(url: string, https = false) {
        if (https) return new HttpsProxyAgent(url);
        return new HttpProxyAgent(url);
    }

    private proxy!: URL;

    constructor(proxyAddress: string) {
        super();
        invariant(proxyAddress, `an Http(s) proxy server must be defined for ProxyAgent`);
        if (!proxyAddress.match(/\:[\\\/]/)) proxyAddress = 'http://' + proxyAddress;
        this.proxy = new URL(proxyAddress);
    }

    addRequest(request: http.ClientRequest, options: http.RequestOptions) {
        let { proxy } = this;
        let proxySocket = net.connect({ host: String(proxy.hostname || proxy.host), port: Number(proxy.port) || 80 });

        let isSecure = options.protocol == 'https:';

        let path = new URL(request.path);
        
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
            request.path = Object.assign(path, {
                protocol: 'https:',
                port: isSecure ? 443 : options.port,
                hostname: options.host || options.hostname
            }).toString();

            proxySocket.write(`${payload}\r\n`);
            proxySocket.once('data', buffer => {
                if (buffer.toString('utf8').includes('Connection established')) {
                    request.onSocket(proxySocket);
                }            
            });
        }
        else {
            // @ts-ignore
            request.path = Object.assign(path, {
                port: options.port,
                hostname: options.host || options.hostname
            }).toString();

            request.onSocket(proxySocket);
        }
    }

}