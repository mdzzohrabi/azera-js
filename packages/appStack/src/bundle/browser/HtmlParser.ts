/**
 * HTML Parser
 * Correct and Fast HTML Parser
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class HtmlParser {

    /**
     * Parsed HTML Nodes in tree structure
     */
    children: HTMLElement[] = [];

    /**
     * Parser cursor
     */
    cursor = 0;

    /**
     * HTML Content length
     */
    length = 0;

    /**
     * Original HTML Content
     */
    content: string = '';

    /**
     * Skip empty text, if true any empty text will ignored otherwise it assumes as a `text` node
     */
    skipEmptyText: boolean = true;

    /**
     * Tags without children (HTML Standards)
     */
    closedTags = {
        '!DOCTYPE': true,
        'meta': true,
        'input': true,
        'area': true,
        'base': true,
        'br': true,
        'frame': true,
        'hr': true,
        'img': true,
        'link': true,
        'param': true
    }

    /**
     * Raw HTML tags (Ignore children from parse)
     */
    rawContentTags = {
        'script': true,
        'style': true,
        'template': true
    }

    constructor(content?: string) {
        if (content) this.parse(content);
    }

    /**
     * Parse HTML
     * @param content HTML content
     */
    public parse(content: string) {
        if (typeof content != 'string') throw Error(`Content must be typeof string, but typeof ${typeof content} given`);
        this.content = content;
        this.length = content.length;
        this.cursor = 0;
        this.children = [];
        let node: HTMLElement;
        while (!this.end()) {
            if ( (node = this.parseTag()) !== undefined) {
                this.children.push(node);
            }
        }

        return this.children;
    }

    static END_OF_TAG_NAME = /\s|\/>|>|\n/;
    static END_OF_PROP_NAME = /\s|=|\/>|>/;
    static END_OF_PROP_VALUE = /\/>|>|\s/;

    /**
     * Read until terminate character from cursor
     * @param char Terminate character
     * @param read If true, string until terminate character will be read and return
     */
    readUntil(char: string, read?: boolean): string

    /**
     * Read until terminate regular-expression from cursor
     * @param char Terminate regular-expression
     * @param read If true, string until terminate regex will be read and return
     */
    readUntil(char: RegExp, read?: boolean): [string, string]
    readUntil(char: string | RegExp, read: boolean = true): any
    {
        let end = 0;
        let what = undefined;
        let isRegex = false;
        if (typeof char == 'string') {
            end = this.content.indexOf(char, this.cursor);
        } else {
            isRegex = true;
            char.lastIndex = 0;
            let result = char.exec(this.content.substring(this.cursor));
            if (result) {
                end = this.cursor + result.index;
                what = result[0];
            }
        }

        if (read) {
            let result = this.content.substring(this.cursor, end);
            this.cursor += result.length;

            if (isRegex) return [ result, what ];
            return result;
        } else {
            let len = (end - this.cursor);
            if (len > 0)
            this.cursor += (end - this.cursor);
        }
    }

    /**
     * Read from cursor in specified length and move cursor
     * @param length Length of read
     */
    read(length: number = 1) {
        let result = this.content.substr(this.cursor, length);
        this.cursor += length;
        return result;
    }

    /**
     * Move cursor
     * @param length Length of move
     */
    move(length: number = 1) {
        this.cursor += length;
    }

    /**
     * Look ahead of cursor without change the cursor
     * @param length Length of read
     */
    look(length: number) {
        if (length == 1) return this.content[this.cursor];
        return this.content.substr(this.cursor, length);
    }

    /**
     * Look ahead of cursor and move if equals to given string
     * @param expr String to look
     */
    lookAndMoveIfEqual(expr: string) {
        let len = expr.length;
        let next = this.content.substr(this.cursor, len);
        if (next == expr) {
            this.cursor += len;
            return true;
        }
        return false;
    }

    /**
     * Next character without change the cursor
     */
    nextChar() {
        return this.content[this.cursor];
    }

    /**
     * Parse quoted and double-quoted strings
     */
    parseQuotedString(): string {
        let quote = this.read();
        let result = this.readUntil(quote);
        this.move();
        return result;
    }

    /**
     * Return true when cursor is at the end of content
     */
    end(): boolean {
        return this.cursor >= this.length;
    }

    /**
     * Return HTMLNode stack from parent to child in string format,
     * used for debug and errors.
     * @param node HTML Node
     */
    getNodeStack(node?: HTMLElement): string {
        let parents = [];
        let p: HTMLElement | undefined = node;
        while (p) {
            let index = p.parent?.children?.indexOf(p) ?? -1;
            parents.push(p.tagName + ( p.attrs.class ? '.' + p.attrs.class.split(' ').join('.') : '' ) + (index > 0 ? `:nth(${ index })` : '') );
            p = p.parent;
        }
        return parents.reverse().join(' > ');
    }

    /**
     * Get current cursor line number
     */
    get line() {
        return this.content.substr(0, this.cursor).split(/\n/g).length + 1;
    }

    /**
     * Get current column in the current line based on cursor
     */
    get position() {
        return this.cursor - this.content.substr(0, this.cursor).lastIndexOf("\n");
    }

    /**
     * Skip white spaces
     */
    skipWhiteSpace() {
        while (this.cursor < this.length && this.content[this.cursor].trim() == "") { this.cursor++; }
    }

    /**
     * Start parsing an HTMLNode
     * @param parent Parent HTMLNode
     */
    parseTag(parent?: HTMLElement): HTMLElement {

        // Comment Node
        if (this.lookAndMoveIfEqual('<!--')) {
            let comment = this.readUntil('-->');
            this.move(3);
            return new HTMLElement('#comment', {}, [], comment, parent, Node.COMMENT_NODE);
        }

        this.readUntil('<', false);
        let content = undefined;
        this.move();
        let [tagName] = this.readUntil(HtmlParser.END_OF_TAG_NAME, true);
        
        let attrs: HTMLAttributes = {};
        let children: HTMLElement[] = [];

        if (tagName === '') {
            throw Error(`Invalid opened tag in ${this.getNodeStack(parent)}, line ${ this.line } position ${ this.position }`);
        } else if (tagName[0] == '/') {
            throw Error(`Invalid closed tag "${ tagName }" in ${this.getNodeStack(parent)}, line ${ this.line } position ${ this.position }`);
        }
        
        // Pre-defined non-content tags
        // if (this.closedTags.includes(tagName)) end = '/>';

        // // Short-closed tags
        // if (end == '/>') return { index: parent ? parent.children.length : 0, tagName, attrs: {}, children, parent };

        let elementType = HTMLElement;

        if (tagName in HtmlElements) elementType = HtmlElements[tagName as  keyof typeof HtmlElements];

        let node = new elementType(tagName, attrs, children, undefined, parent, Node.ELEMENT_NODE);
        
        // Parse content
        let overflow = 0;
        while ( !this.end() ) {
            overflow++;

            if (overflow > 900) throw Error(`Invalid HTML content, line: ${this.line}, position: ${this.position}`);

            this.skipWhiteSpace();
            
            // Parse tag attributes
            let [attrName, end] = this.readUntil(HtmlParser.END_OF_PROP_NAME, true);
            
            // Attributes found
            if (attrName) {
                // Valued attribute
                if (end==='=') {
                    
                    this.move();
                    let attrValue: any = undefined;
                    if (this.nextChar() == '"' || this.nextChar() == "'") {
                        attrValue = this.parseQuotedString();
                    } else {
                        let next: string;
                        [attrValue, next] = this.readUntil(HtmlParser.END_OF_PROP_VALUE, true);
                        if (next != '/>' && next != '>')
                            this.move();
                    }

                    attrs[attrName] = attrValue;
                } else {
                // Non-valued attribute
                    attrs[attrName] = attrName;
                }
            }

            // Skip white spaces and line-breaks
            this.skipWhiteSpace();

            // Short-closed tag
            if (this.lookAndMoveIfEqual('/>')) {
                break;
            // Implicit closed tags
            } else if (this.look(1) === '>' && tagName in this.closedTags) {
                this.move();
                break;
            // Close tag and parse children
            } else if (this.lookAndMoveIfEqual('>')) {
                
                let tagEnd = `</${ tagName }>`;
                let tagEndLen = tagEnd.length;
                
                if (tagName.toLowerCase() in this.rawContentTags) {
                    node.content = content = this.readUntil(tagEnd);
                    this.move(tagEndLen);
                    return node;
                }
                

                let overflow = 0;
                while (!this.end()) {
                    if (overflow++ > 9000) throw Error(`Invalid HTML content`);
                    
                    // Tag closed
                    if (this.look(tagEndLen) == tagEnd) {
                        this.move(tagEndLen);
                        break;
                    }
                    
                    let text = this.readUntil('<', true) as string | undefined;

                    if (text) {
                        if (this.skipEmptyText === true && text.trim() === "") text = undefined;
                        content = text;
                    }

                    // Tag closed
                    if (this.look(tagEndLen) === tagEnd) {
                        this.move(tagEndLen);
                        break;
                    }
                    
                    // Detect unclosed tags
                    if (this.look(2) === '</') {
                        // Ignore unwanted closed tags as raw text
                        if (true) {
                            let text = this.read(2) + this.readUntil('<', true) as string | undefined;
                            if (this.skipEmptyText === true && text?.trim() === "") text = undefined;
                            if (text) content = (content ?? '') + text;
                            continue;
                        } else {
                            break;
                        }
                    }
                    
                    let child = this.parseTag(node);
                    if (child !== undefined && child.tagName !== '') {    
                        if (content !== undefined) {
                            children.push(new HTMLElement('text', {}, [], content, node, Node.TEXT_NODE ));
                            content = undefined;
                        }
                        children.push(child);
                    }
                }
                
                break;
            }
        }

        node.content = content;

        return node;
        
    }

    public querySelectorAll = querySelectorAll;
}


/**
 * CSS-Selector parsing regular expression
 */
const SELECTOR_NODE_REGEX = /\s*(?=\S)(?<op>[\s+~,>]{1})?\s*(?<!\.)(?<name>(\*|[:a-zA-Z_]*[a-zA-Z0-9-_]*))(\#(?<id>[a-zA-Z_]*[a-zA-Z0-9-_]*))?(?<class>(\.[a-zA-Z_]+[a-zA-Z0-9-_]*)*)(?<attr>(\[[A-Za-z_]+[a-zA-Z0-9-_]*(([|^~|*$]?[=])[\w\W]+)?\])*)/gm;

const SELECTOR_ATTR_REGEX = /\[(?<name>[[A-Za-z_]+[a-zA-Z0-9-_]*)((?<op>[|^~|*$]?[=])(?<value>[\w\W]+))?\]/gm;

/**
 * Cached CSS-Selectors
 */
let cachedSelectors: { [selector: string]: any[] } = {};

/**
 * Convert CSS-Selector string to strcutured format
 * @param selector CSS Selector string
 */
function parseSelector(selector: string): CSSSelector[] {
    if (cachedSelectors[selector]) return cachedSelectors[selector];
    let selectors = [];
    let result: RegExpExecArray | null
    // Refresh Expression
    SELECTOR_NODE_REGEX.lastIndex = 0;
    let overflow = 0;
    while (result = SELECTOR_NODE_REGEX.exec(selector)) {
        if (overflow++ > 40) throw Error(`CSS Selector parse overflow for "${selector}"`);
        let node: CSSSelector = { ...result.groups };
        let attrs: { name: string, value?: string, op?: string }[] = [];
        if (result.groups?.attr) {
            let attrResult: RegExpExecArray | null;
            SELECTOR_ATTR_REGEX.lastIndex = 0;
            let overflow = 0;
            while (attrResult = SELECTOR_ATTR_REGEX.exec(result.groups.attr)) {
                if (overflow++ > 20) throw Error(`CSS selector attribute matcher overflow`);
                let { name, value, op } = attrResult.groups ?? {};
                attrs.push({
                    value: value ? (value[0] == "'" || value[0] == '"' ? value.substr(1, value.length - 2) : value) : undefined,
                    name, op
                })
            }
        }
        node.class = (<string>(node.class ?? '')).split('.').filter(c => !!c) as any;
        node.attr = attrs as any;
        if (node.name == '*') node.name = undefined;
        selectors.push(node);
    }
    cachedSelectors[selector] = selectors;
   
    return selectors;
}

/**
 * Find nodes based on CSS Selector (querySelectorAll)
 * @param selector CSS Selector
 * @param node Search in specific HTMLNode
 */
export function querySelectorAll(selector: string | CSSSelector[], node?: Node, first?: boolean): (Node & HTMLElement)[]
export function querySelectorAll(selector: string | CSSSelector[], nodes?: Node[], first?: boolean): (Node & HTMLElement)[]
export function querySelectorAll(this: Node, selector: string | CSSSelector[], nodes?: Node | Node[], first: boolean = false, _level = 0)
{
    let children: (Node | HTMLElement)[];
    let scope: Node;
    
    if (Array.isArray(nodes)) {
        scope = nodes[0]?.parentNode;
        children = nodes;
    }
    else if (nodes !== undefined) {
        scope = nodes;
        children = nodes.children;
    }
    else {
        scope = this;
        children = this.children;
    }

    let result: (Node | HTMLElement)[] = [];

    if (typeof selector == 'string') {
        selector = parseSelector(selector);
    }

    if (selector[0]?.name == ':scope') children = [scope];

    // No Children
    if (!children || !selector || children.length == 0) return result;

    let deep = true;
    let selectorLen = selector.length;

    for (let index = 0; index < selectorLen; index++) {
        let select = selector[index];
        let isLastSelector = index + 1 == selectorLen;

        // Chaning selector process
        if (index > 0) {
            // All type of children elements
            if (select.op === undefined) {
                children = [];
                result.forEach(item => {
                    children.push(...item.children);
                });
                result = [];
            // Only parent root children
            } else if (select.op === '>') {
                children = [];
                result.forEach(item => {
                    children.push(...item.children);
                });
                result = [];
                deep = false;
            // Check only next sibiling element
            } else if (select.op === '+') {
                children = [];
                result.forEach(child => {
                    let next = child.parentNode?.children.indexOf(child as any) ?? 0 + 1;
                    if (child.parentNode?.children[next]) children.push(child.parentNode.children[next]);
                });
                result = [];
            }
        }

        // Children selector matching
        for (let child of children) {

            if (select.name == ':scope' && _level == 0) {
                if (index == 0) result.push(child);
                break;
            }

            if (child instanceof HTMLElement) {
                let allOk = true;
                
                // Element tagName matching
                if (select.name) allOk = allOk && child.tagName == select.name;

                // Id matching
                if (allOk && select.id) allOk = allOk && child.attrs?.id == select.id;

                // Attributes matching
                if (allOk && select.attr && select.attr.length > 0) {
                    allOk = allOk && select.attr.every(attr => {
                        // @ts-ignore
                        if (!attr.value) return child['attrs'][attr.name];
                        // @ts-ignore
                        let childValue = (child['attrs'][attr.name] ?? null) as string;
                        if (!childValue) return false;
                        switch (attr.op) {
                            case '=': return childValue == attr.value;
                            case '^=': return childValue.startsWith(attr.value);
                            case '*=': return childValue.includes(attr.value);
                            case '$=': return childValue.endsWith(attr.value);
                            default: return false;
                        }
                    });
                }

                // Class matching
                if (allOk && select.class && select.class.length > 0) {
                    // @ts-ignore
                    allOk = allOk && select.class.every(className => child['classNames'].includes(className));
                }

                // Everything is ok then push element to result
                if (allOk) {
                    result.push(child);
                    if (first && isLastSelector) break;
                }


                // Deep finding
                if (deep) {
                    // @ts-ignore
                    result = result.concat( ...querySelectorAll.call(this, [ select ], child, first, _level + 1));
                }
            }
        }
    }
    
    return result;
}


export interface HTMLAttributes {
    [name: string]: any
}


export class Event {

    constructor(
        public type: string,
        eventInit?: { bubbles?: boolean, cancelable?: boolean, composed?: boolean }
    ) {
        let { bubbles = false, cancelable = false, composed = false } = eventInit || {};
        this.cancelable = cancelable;
        this.bubbles = bubbles;
        this.composed = composed;
    }

    public timeStamp = Date.now();
    public target: any;
    public readonly cancelable: boolean;
    public readonly bubbles: boolean;
    public readonly composed: boolean;
    private _isDefaultPrevented: boolean = false;

    public get isDefaultPrevented() {
        return this._isDefaultPrevented;
    }

    public preventDefault() {
        this._isDefaultPrevented = true;
    }

    public stopPropagation() {
        this._isDefaultPrevented = true;
    }

}


export class CustomEvent extends Event {
    constructor(public type: string, public detail: any) { super(type); }
}

export class Events {
    private _events: { [event: string]: Function[] } = {}

    public addEventListener(event: string, handler: Function) {
        if (!this._events[event]) this._events[event] = [];
        this._events[event].push(handler);
    }

    public removeEventListener(event: string, handler: Function) {
        if (!this._events[event]) return;
        let index = this._events[event].indexOf(handler);
        this._events[event].splice(index, 1);
    }

    public dispatchEvent(event: Event) {
        if (!this._events[event.type]) return;
        for (let handler of this._events[event.type]) {
            handler(event);
            if (event.isDefaultPrevented) break;
        }
    }
}


export abstract class Node extends Events {

    static ELEMENT_NODE	= 1 //	An Element node like <p> or <div>.
    static TEXT_NODE	= 3	// The actual Text inside an Element or Attr.
    static CDATA_SECTION_NODE	= 4	// A CDATASection, such as <!CDATA[[ … ]]>.
    static PROCESSING_INSTRUCTION_NODE =	7	// A ProcessingInstruction of an XML document, such as <?xml-stylesheet … ?>.
    static COMMENT_NODE	= 8	 // A Comment node, such as <!-- … -->.
    static DOCUMENT_NODE	= 9	 // A Document node.
    static DOCUMENT_TYPE_NODE	= 10 // 	A DocumentType node, such as <!DOCTYPE html>.
    static DOCUMENT_FRAGMENT_NODE	= 11 // 	A DocumentFragment node.

    public children: Node[] = [];

    private _ownerDocument: any;

    get ownerDocument() {
        if (this._ownerDocument) return this._ownerDocument;
        return this.parentNode?.ownerDocument;
    }

    set ownerDocument(document: any) {
        this._ownerDocument = document;
    }

    abstract get nodeName(): string
    abstract get parentNode(): Node
    abstract get parentElement(): Node

    abstract nodeType: number;
    
    get lastChild(): Node {
        return this.children[this.children.length - 1];
    }

    get firstChild(): Node {
        return this.children[0];
    }

    public appendChild(child: Node): Node {
        child['parent'] = this;
        this.children.push(child);
        return child;
    }

    private findChildIndex(child: Node, deep = true): [Node, number] | null {
        let index = this.children.indexOf(child);
        if (index >= 0) {
            return [this, index];
        } else if (deep) {
            for (let child of this.children) {
                let result = child.findChildIndex(child);
                if (result != null) {
                    return result;
                }
            }
        }
        return null;
    }
    
    public removeChild(child: Node) {
        let [parent, index] = this.findChildIndex(child) || [];
        if (!parent || index == null) return false;
        parent.children.splice(index, 1);
    }

    public replaceChild(newChild: Node, oldChild: Node) {
        let [parent, index] = this.findChildIndex(oldChild) || [];
        if (!parent || index == null) return false;
        parent.children[index] = newChild;
        newChild['parent'] = parent;
        oldChild['parent'] = undefined;
        return newChild;
    }

    public contains(child: Node): boolean {
        return this.findChildIndex(child) !== null;
    }

    public remove() {
        this.parentNode?.removeChild(this);
    }
    
    public insertBefore(child: Node, target: Node): Node {
        let index = this.children.indexOf(target);
        this.children = [ ...this.children.slice(0, index) , child , ...this.children.slice(index) ];
        child['parent'] = this;
        return child;
    }
    
    public querySelectorAll(selector: string): HTMLElement[] {
        return querySelectorAll.call(this, selector, this);
    }
    
    public querySelector(selector: string): HTMLElement {
        return querySelectorAll.call(this, selector, this, true)[0];
    }
    
    public getElementById(id: string) {
        return this.querySelector('#' + id);
    }
    
    public getElementsByTagName(tagName: string) {
        return this.querySelectorAll(tagName);
    }
    
    get childNodes() {
        return this.children;
    }
    
    public get nextSibling(): Node {
        let index = this.parentNode.children.indexOf(this);
        return this.parentNode.children[index + 1];
    }

    public get previousSibling(): Node {
        let index = this.parentNode.children.indexOf(this);
        return this.parentNode.children[index - 1];
    }
    
}

export class CSSStyleDeclaration {
    constructor(element: HTMLElement) {}
}

export class HTMLElement extends Node {

    constructor(
        public tagName: string,
        public attrs: HTMLAttributes = {},
        public children: HTMLElement[] = [],
        public content: string | undefined = undefined,
        public parent?: HTMLElement,
        public nodeType: number = Node.ELEMENT_NODE
    ) { super() }

    @Cache() get classNames(): string[] {
        return (this.attrs['class'] as string ?? '').split(' ').filter(className => !!className);
    }

    @Cache() get style() {
        return this.attrs['style'] || {};
    }

    get nodeName(): string {
        return this.tagName.toUpperCase();
    }

    get textContent() {
        return this.content + this.children.map(child => child.textContent).join('');
    }

    set textContent(text: string) {
        this.content = text;
        this.children = [];
    }
    
    get innerHTML(): string {
        return this.toString();
    }
    
    set innerHTML(html: string) {
        this.content = undefined;
        this.children = new HtmlParser(html).children.map(child => {
            child.parent = this;
            return child;
        });
    }

    get innerText(): string {
        return this.content + this.children.map(child => child.tagName == 'script' || child.tagName == 'style' ? '' : child.textContent).join('');
    }

    get isConnected() {
        return !!this.parentNode;
    }

    get attributes() {
        return this.attrs;
    }

    get parentNode() {
        return this.parent;
    }

    get parentElement() { return this.parent; }


    public setAttribute(name: string, value: any) {
        this.attrs[name] = value;
    }

    public getAttribute(name: string) {
        return this.attrs[name];
    }

    public hasAttribute(name: string) {
        return this.attrs[name] !== undefined;
    }

    public removeAttribute(name: string) {
        delete this.attrs[name];
    }

    public cloneNode(deep = true) {
        let clonedNode = Object.assign(new HTMLElement(this.tagName), this);
        return clonedNode;
    }

    public set onclick(handler: Function) {
        this.addEventListener('click', handler);
    }

    public get onclick() {
        return () => {
            this.dispatchEvent(new Event('click'));
        }
    }

    public toString() {

        if (this.nodeName == '#comment') return `<!--${this.content}-->`;
        
        return `<${this.tagName}${ this.attrs ? ' ' + Object.keys(this.attrs).map(key => `${key}="${this.attrs[key]}"`).join(' ') : '' }>${this.content ?? ''}${this.children.map(child => child.toString())}</${this.tagName}>`;
    }
}


export let HtmlElements = {
    div: class HTMLDivElement extends HTMLElement {},
    iframe: class HTMLIFrameElement extends HTMLElement {},
    a: class HTMLAnchorElement extends HTMLElement {},
    area: class HTMLAreaElement extends HTMLElement {},
    button: class HTMLButtonElement extends HTMLElement {},
    body: class HTMLBodyElement extends HTMLElement {},
    form: class HTMLFormElement extends HTMLElement {},
    input: class HTMLInputElement extends HTMLElement {},
    image: class HTMLImageElement extends HTMLElement {},
    html: class HTMLHtmlElement extends HTMLElement {},
    title: class HTMLTileElement extends HTMLElement {},
    style: class HTMLStyleElement extends HTMLElement {},
    link: class HTMLLinkElement extends HTMLElement {},
    span: class HTMSpanElement extends HTMLElement {},
    p: class HTMLParagraphElement extends HTMLElement {},
    table: class HTMLTableElement extends HTMLElement {},
    tr: class HTMLTableRowElement extends HTMLElement {},
    td: class HTMLTableCellElement extends HTMLElement {},
    label: class HTMLLabelElement extends HTMLElement {},
    select: class HTMLSelectElement extends HTMLElement {},
    textarea: class HTMLTextAreaElement extends HTMLElement {}
}

export interface CSSSelector {
    op?: string
    type?: string
    name?: string
    class?: string[]
    attr?: { name: string, value: string, op: string }[]
    id?: string
}

export function Cache(): MethodDecorator {
    return function cacheDecorator(target, prop, descr) {
        let cachedPropName = '_' + String(prop);
        if (descr.get) {
            let baseGetter = descr.get;
            descr.get = function cachedGetter() {
                if (this[cachedPropName]) return this[cachedPropName];
                return this[cachedPropName] = baseGetter.apply(this);
            } as any;

        } else {
            let baseMethod = target[prop] as Function;
            descr.value = function cachedMethod(...props) {
                if (this[cachedPropName]) return this[cachedPropName];
                return this[cachedPropName] = baseMethod.apply(this, props);
            } as any;
        }
    }
}