import * as net from 'net';
import * as url from 'url';

export function wrapCreateConnectionWithProxy(proxy: string, func: Function) {
    return function wrappedByProxy(this: any, ...params: any[]) {
        let mainCreateConnection = net.createConnection;
        let {hostname: host, port} = url.parse(proxy);
        
        // @ts-ignore
        net.createConnection = function createConnectionThroughProxy(options: { family: number, host: string, port: number }) {
            let queue: any[] = [];
            let onEvents: any[] = [];
            let established = false;
            
            let connection = mainCreateConnection({ host, port: Number(port), family: 0 }, () => {
                mainOn.call(connection, 'data', (buffer: Buffer) => {
                    if ( buffer.toString().includes('Connection established') ) {
                        established = true;
                        onEvents.forEach(e => mainOn.apply(connection, e));
                        connection.emit('connect');
                        // @ts-ignore
                        // queue.forEach(buffer => connection.write(...buffer));
                    }
                });
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