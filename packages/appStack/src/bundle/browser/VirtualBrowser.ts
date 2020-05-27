import { runInNewContext, RunningScriptOptions } from 'vm';
import { HTMLElement, HtmlParser, Node, Events, Event, CustomEvent, HtmlElements } from "./HtmlParser";
import * as http from 'http';
import * as https from 'https';
import * as urlLib from 'url';
import { assert } from 'console';

export namespace VirtualBrowser {

    export class Location {

        public href?: string = '';
        public host?: string = '';
        public protocol?: string = '';
        public hostname?: string = '';
        public pathname?: string = '';
        public path?: string = '';
        public search?: string = '';
        public hash?: string = '';
        public query?: string | null = '';

        static from(url: string) {
            let parsed = urlLib.parse(url);
            let location = new Location();
            location.hash = parsed.hash;
            location.host = parsed.host;
            location.hostname = parsed.hostname;
            location.href = parsed.href;
            location.pathname = parsed.pathname;
            location.protocol = parsed.protocol;
            location.search = parsed.search;
            location.query = parsed.query;
            location.path = parsed.path;
            return location;
        }
    }

    class History {

        private _history: { url: string, state?: any, title?: string }[] = [];
        private _currentIndex = -1;

        constructor(private window: Window) {}

        public scrollRestoration: string = 'auto'

        public get length() {
            return this._history.length;
        }
        
        public get state() {
            return this._history[this._currentIndex]?.state;
        }

        public back() { this.go(-1); }
        public forward() { this.go(1); }

        public go(step: number = 0) {
            if (!this._history[ this._currentIndex + step ]) return;
            this._currentIndex += step;
            this.window.location = Location.from(this._history[this._currentIndex].url);
        }

        public pushState(state: any, title: string, url: string) {
            this._history.push({ title, state, url });
            this._currentIndex = this._history.length - 1;
            this.window.location = Location.from(url);
            this.window.dispatchEvent(new Event('popstate'));
        }
        
        public replaceState(state: any, title: string, url: string) {
            this._history[this._currentIndex] = { title, state, url };
            this.window.dispatchEvent(new Event('popstate'));
        }
    }

    class Navigator {
        userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36';
    }

    class DOMImplementation {
        constructor(private document: Document) {}
        public createHTMLDocument(title: string) {
            return new Document(new HtmlParser(`<!doctype html><html><head><title>${title}</title></head><body></body></html>`).children, this.document.window);
        }
    }

    class ScreenOrientation {
        constructor(
            public angle: number = 0,
            public type: string = "landscape-primary",
            public onchange?: Function
        ) {}
    }

    class Screen {
        constructor(
            public availHeight = 1050,
            public availLeft = 0,
            public availTop = 0,
            public availWidth = 1920,
            public colorDepth = 24,
            public height = 1080,
            public orientation = new ScreenOrientation,
            public pixelDepth = 24,
            public width = 1920
        ) {}
    }

    class MediaQueryList {
        constructor(
            public matches: boolean,
            public media: string,
            public onchange?: Function
        ) {}

        public addListener(listener: Function) {}
        public removeListener(listener: Function) {}
    }

    export let NodeHttpAgent: http.Agent;
    export let NodeHttpsAgent: https.Agent;

    class XMLHttpRequest extends Events {

        static OPEN_CONNECTIONS_VAR = '_xhrOpenConnections';

        static UNSENT = 0; // Client has been created. open() not called yet.
        static OPENED = 1; // open() has been called.
        static HEADERS_RECEIVED = 2; // send() has been called, and headers and status are available.
        static LOADING = 3; // Downloading; responseText holds partial data.
        static DONE = 4; // The operation is complete.

        public onreadystatechange?: Function;
        
        public onload?: Function;

        public onprogress?: Function;

        private _readyState: number = XMLHttpRequest.UNSENT;

        public get readyState() { return this._readyState; }

        public response?: ArrayBuffer | Buffer | Blob | string | object;

        public get responseText() {
            return this.response?.toString('utf8');
        }

        public responseType?: string;

        public status?: number;

        public statusText?: string;

        public headers: { [name: string]: string } = {};

        public timeout?: number;

        private _request?: http.ClientRequest;

        public open(method: string, url: string, async: boolean = true, user?: string, password?: string) {
            // @ts-ignore
            if (!globalThis[XMLHttpRequest.OPEN_CONNECTIONS_VAR]) {
                // @ts-ignore
                globalThis[XMLHttpRequest.OPEN_CONNECTIONS_VAR] = 0;
            }
            // @ts-ignore
            globalThis[XMLHttpRequest.OPEN_CONNECTIONS_VAR]++;
            this.addEventListener('loadend', () => {
                // @ts-ignore
                globalThis[XMLHttpRequest.OPEN_CONNECTIONS_VAR]--;
                setTimeout(() => {
                    // @ts-ignore
                    if (globalThis[XMLHttpRequest.OPEN_CONNECTIONS_VAR]==0 && globalThis['dispatchEvent']) {
                        globalThis['dispatchEvent'](new Event('XHRComplete') as any);
                    }    
                });
            });

            let content: Buffer[] = [];
            let isHttps = url.startsWith('https:');
            
            this._request = (isHttps ? https : http).request({ ...urlLib.parse(url), agent: isHttps ? NodeHttpsAgent : NodeHttpAgent, auth: user ? `${user}:${password}` : undefined, method }, async res => {
                this._readyState = XMLHttpRequest.OPENED;
                this.onreadystatechange && this.onreadystatechange();
                res.on('data', buffer => {                  
                    content.push(buffer);
                    this.onprogress && this.onprogress(buffer);
                    this.dispatchEvent(new CustomEvent('progress', buffer));
                });
                res.on('end', () => {
                    this.headers = res.rawHeaders as any;
                    this.status = res.statusCode;
                    this.statusText = res.statusMessage;
                    this.response = Buffer.concat(content);
                    this._readyState = XMLHttpRequest.DONE;
                    this.onreadystatechange && this.onreadystatechange();
                    this.onload && this.onload();
                    this.dispatchEvent(new Event('load'));
                    this.dispatchEvent(new Event('loadend'))
                });
                res.on('error', err => {
                    this.dispatchEvent(new CustomEvent('error', err))
                    this.dispatchEvent(new Event('loadend'))
                });
            });
        }
        
        public getAllResponseHeaders() {
            return this.headers;
        }
        
        public getResponseHeader(name: string) {
            return this.headers[name];
        }
        
        public setRequestHeader(key: string, value: string) {
            assert(this._request, 'XMLHttpRequest not opened yet, please call open() first');
            this._request?.setHeader(key, value);
        }
        
        public send(data?: any) {
            assert(this._request, 'XMLHttpRequest not opened yet, please call open() first');
            if (data) {
                if (typeof data == 'object' && !Buffer.isBuffer(data)) data = JSON.stringify(data);
                this._request?.write(data);
            }
            this._request?.end();
            this._readyState = XMLHttpRequest.LOADING;
            this.onreadystatechange && this.onreadystatechange();
            this.dispatchEvent(new Event('loadstart'));
        }

    }

    export function qualifyUrl(url: string, location: Location) {
        let base = location.protocol + '//' + location.hostname;
        if (url.startsWith('/') || (!url.match(/^\w+\:/))) {
            url = base + url;
        } else if (url.startsWith('./')) {
            url = base + location.pathname + url.substr(1);
        }
        return url;
    }

    export function isExternalUrl(url: string, location: Location) {
        return Location.from(url).hostname != location.hostname;
    }

    export function getResource(url: string, location?: Location): Promise<Buffer> {

        if (location) {
            url = qualifyUrl(url, location);
        }       

        return new Promise((done, reject) => {
            let content: Buffer[] = [];
            let isHttps = url.startsWith('https:');
            
            let req = (isHttps ? https : http).request({ ...urlLib.parse(url), agent: isHttps ? NodeHttpsAgent : NodeHttpAgent, method: 'GET' }, async res => {
                res.on('data', buffer => content.push(buffer));
                res.on('end', () => { done(Buffer.concat(content)) });
                res.on('error', reject);
            });

            req.end();
        });
    }
    
    export class Window extends Events {

        public Node = Node;

        public document!: Document;

        public console = console;

        public window = this;

        public top = this;

        public self = this;

        public setTimeout = setTimeout;

        public globalThis = this;

        public history = new History(this);

        private _location!: Location;

        public get location() {
            return this._location;
        }

        public set location(url: string | Location) {
            if (typeof url == 'string') {
                if (!this._location || this._location.href != url) {
                    this._location = Location.from(url);
                    this.history.pushState(undefined, this.document.title, url);
                    this.dispatchEvent(new Event('hashchange'));
                }
            }
        }

        public navigator = new Navigator;

        public screen = new Screen;

        public XMLHttpRequest = XMLHttpRequest;

        constructor(nodes: Node[], options: WindowOptions = {}) {
            super();

            let { url, loadScripts = true } = options;

            // Elements
            Object.values(HtmlElements).forEach(elementType => {
                // @ts-ignore
                this[elementType.name] = elementType;
            });

            // Window document
            this.document = new Document(nodes, this);

            // Window location
            this.location = url || '';

            setTimeout(() => {
                new Promise(async (done, reject) => {
                    try {
                        // Load scripts
                        if (loadScripts) {
                            let scripts = this.document.querySelectorAll('script');
                            for (let script of scripts) {
                                let scriptContent = script.innerText;
                                let filename;
                                if (script.hasAttribute('src')) {
                                    scriptContent = (await getResource(script.getAttribute('src'), this._location)).toString('utf8');
                                    filename = script.getAttribute('src');
                                }
                                this.eval(scriptContent, { filename });
                            }
                        }
                        done()
                    } catch (err) { reject(err) }
    
                })
                .then(() => {
                    // Document DOMContentLoaded
                    this.document.readyState = "complete";
                    this.document.dispatchEvent(new Event('DOMContentLoaded'));
                    this.dispatchEvent(new Event('DOMContentLoaded'));
                    // Window load
                    let winEvent = new Event('load');
                    this.dispatchEvent(winEvent);
                    if (!winEvent.isDefaultPrevented)
                        this.onload();
                })
                .catch(err => {
                    console.error(err); 
                });    
            })
        }

        eval(expr: string, options?: RunningScriptOptions) {
            return runInNewContext(expr, this, { displayErrors: true, ...options });
        }

        public noop() {}

        public onload() {}

        public addEventListener = (event: string, listener: Function) => {
            return super.addEventListener(event, listener);
        }

        private MEDIA_QUERY_REGEX = /(?<space>)\s+|(?<logic>and|or)|(?<type>[a-zA-Z]+)|\(((?<feature>(max-|min-)?(orientation|resolution|width|height))*\s*(:\s*(?<value>.*))?)?\)|(?<comma>,)|(?<invalid>.+)/g

        public matchMedia = (query: string): MediaQueryList => {
            let isOk = true;
            let result: RegExpExecArray | null;
            let lastLogic = 'and';
            this.MEDIA_QUERY_REGEX.lastIndex = 0;
            let overflow = 0;
            while (result = this.MEDIA_QUERY_REGEX.exec(query)) {
                if (overflow++ > 30) throw Error('Media query match overflow');
                let { space, logic, type, feature, value, comma, invalid } = result.groups ?? {};
                if (space) continue;

                if (invalid) {
                    return new MediaQueryList(false, 'not all', undefined);
                }

                if (logic) {
                    lastLogic = logic;
                    continue;
                }

                if (feature) {
                    let isFeatureOk = false;
                    switch (feature) {
                        case 'max-width': {
                            isFeatureOk = this.screen.width > parseInt(value);
                            break;
                        }
                        case 'max-height': {
                            isFeatureOk = this.screen.height > parseInt(value);
                            break;
                        }
                    }
                    if (lastLogic == 'and') {
                        isOk = isOk && isFeatureOk;
                    } else {
                        isOk = isOk || isFeatureOk;
                    }
                }

            }
            return new MediaQueryList(isOk, query, undefined);
        }
    }

    export class Document extends Node {

        public readyState = "loading";

        get nodeName(): string { return '#document'; }
        get parentNode(): Node | null { return null; }
        get parentElement(): Node | null { return null; }

        public implementation = new DOMImplementation(this);

        get ownerDocument() {
            return this;
        }

        get title() {
            return this.querySelector('title').innerText;
        }

        get body() {
            return this.querySelector('body');
        }

        get documentElement() {
            return this.querySelector('html');
        }

        public createElement(tagName: string) {
            return new HTMLElement(tagName, {}, [], undefined, this as any);
        }

        public createComment(comment: string) {
            return new HTMLElement('#comment', {}, [], comment, this as any);
        }

        public createDocumentFragment() {           
            return new HTMLElement('#document-fragment', {}, [], undefined, this as any, Node.DOCUMENT_FRAGMENT_NODE);
        }

        public nodeType = Node.DOCUMENT_NODE;

        constructor(
            public children: Node[] = [],
            public window: Window) {
                super();
                children.forEach(child => child.ownerDocument = this);
        }
    }

    export interface WindowOptions {
        url?: string,
        loadScripts?: boolean
    }

    export function load(content: string, options: WindowOptions = {}): Window {
        return new Window(new HtmlParser().parse(content), options);
    }

}