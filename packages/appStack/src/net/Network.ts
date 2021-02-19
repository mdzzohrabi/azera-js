import { is } from '@azera/util';
import * as net from 'net';
import { URL } from 'url';

/**
 * Make an network function over Proxy.
 * This method will wrap given function with overrided createConnection under proxy
 * 
 * @param proxy Proxy address
 * @param func Network function to wrap
 */
export function wrapCreateConnectionWithProxy(proxy: string, func: Function) {
    /**
     * Wrapped function
     * it will replace createConnection with overrided custom createConnection every time network function called
     */
    return function wrappedByProxy(this: any, ...params: any[]) {
        // Original createConnection
        let mainCreateConnection = net.createConnection;
        let {hostname: proxyHost, port: proxyPort} = new URL(proxy);
        // @ts-ignore
        net.createConnection = 
        /**
         * Custom createConnection
         * @param options createConnection options
         */
        function createConnectionThroughProxy(options: net.TcpNetConnectOpts, connectionListener?: () => void) {

            if (!is.Object(options)) {
                throw Error(`Invalid createConnection arguments`);
            }

            let queue: any[] = [];
            let onEvents: any[] = [];
            let established = false;
            
            // Create connection to proxy
            let connection = mainCreateConnection({ host: proxyHost!, port: Number(proxyPort), family: 0 }, () => {               
                // Data received from proxy (Check connection establish)
                mainOn.call(connection, 'data', (buffer: Buffer) => {
                    // Checking for connection establish
                    if ( !established && buffer.toString().includes('Connection established') ) {
                        established = true;
                        onEvents.forEach(e => mainOn.apply(connection, e));
                        connection.emit('connect');
                        queue.forEach(args => {
                            mainWrite.apply(connection, args);
                        });
                        queue = [];
                        onEvents = [];
                        connectionListener?.call(connection);
                    }
                });
                // Establish connection to target machine
                mainWrite.call(connection, `CONNECT ${options.host}:${options.port} HTTP/1.1\n\n`);
            });
            let mainOn = connection.on;
            // @ts-ignore
            connection.on = function on (...params: any[]) {              
                if (!established) {
                    onEvents.push(params);
                    return;
                }
                return mainOn.apply(this, params);
            }
            let mainWrite = connection.write;
            // @ts-ignore
            connection.write = function write(...args) {
                if (!established) {
                    queue.push(args);
                    return;
                }
                return mainWrite.apply(this, args);
            }

            return connection;
        }
        
        let result = func.apply(this, params);
        // @ts-ignore
        net.createConnection = mainCreateConnection;

        return result;
    }
}