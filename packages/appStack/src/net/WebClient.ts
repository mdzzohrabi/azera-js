import * as http from 'http';
import * as https from 'https';
import { ProxyAgent } from './ProxyAgent';

export interface WebClientRequestOptions extends http.RequestOptions {
    body?: any
}

export interface WebClientGraphqlOptions extends WebClientRequestOptions {
    body: {
        operationName?: string,
        query?: any,
        mutation?: any,
        variables?: any
    }
}

/**
 * Web client
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class WebClient {

    defaults: WebClientRequestOptions = {};
    proxyAddress?: string;

    /**
     * Set proxy for web client requests
     * @param proxyAddress Proxy server address
     */
    setProxy(proxyAddress?: string) {
        this.proxyAddress = proxyAddress;
        if (proxyAddress)
            this.defaults.agent = this.createProxyAgent(proxyAddress) as any;
        else
        this.defaults.agent = http.globalAgent;
    }

    /**
     * Create a proxy agent
     * @param proxyAddress Proxy server address
     */
    createProxyAgent(proxyAddress: string) {
        return new ProxyAgent(proxyAddress);
    }

    /**
     * Make an web request
     * @param url Destination url
     * @param options Request options
     */
    request(url: string, options?: WebClientRequestOptions): Promise<http.IncomingMessage> {
        return new Promise((resolve, reject) => {
            options = { ...this.defaults, ...options };
            let request: http.ClientRequest;
            if (url.startsWith('https:')) {
                if (this.proxyAddress) options['agent'] = ProxyAgent.from(this.proxyAddress, true) as any;
                request = https.request(url, options || {}, resolve);
            } else {
                if (this.proxyAddress) options['agent'] = ProxyAgent.from(this.proxyAddress, false) as any;
                request = http.request(url, options || {}, resolve);
            }
            request.on('error', reject);
            if (options?.body) {
                let body = typeof options.body == 'string' ? options.body : JSON.stringify(options.body);
                request.write(body);
            }
            request.end();
        });
    }

    /**
     * Make an web request and return its content buffer
     * @param url Destination url
     * @param options Request options
     */
    requestBuffer(url: string, options?: WebClientRequestOptions): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            this.request(url, options).then(res => {
                let chunks: Buffer[] = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });
            }).catch(reject);
        });
    }

    /**
     * Make an web request and return its content json
     * @param url Destination url
     * @param options Request options
     */
    async requestJson<T = any>(url: string, options?: WebClientRequestOptions): Promise<T> {
        if (!options) options = {};
        if (!options.headers) options.headers = {};
        options.headers['Content-Type'] = 'application/json';
        let buffer = await this.requestBuffer(url, options);
        
        return JSON.parse(buffer.toString('utf8'));
    }

    /**
     * Make an graphql request and returns data
     * @param url End-point url
     * @param options Request options
     */
    async requestGraphQl<T = any>(url: string, options?: WebClientGraphqlOptions): Promise<T> {
        options = options || {
            body: {}
        };
        return this.requestJson<{ data: T }>(url, { method: 'POST' , ...options }).then(response => response.data);
    }

}