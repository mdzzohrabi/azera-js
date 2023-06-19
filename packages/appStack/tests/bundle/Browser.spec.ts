import { deepStrictEqual, ok, strictEqual } from "assert";
import { HTMLElement, HtmlParser, parseSelector } from "../../src/browser/HtmlParser";
import { VirtualBrowser } from "../../src/browser/VirtualBrowser";
import { readFileSync } from 'fs';
import { runInNewContext } from "vm";
import { assert } from "chai";

describe('Browser Bundle -> HTMLParser', () => {

    it('should parse simple html', () => {
        let parser = new HtmlParser(`
        <html>
            <head><title>My Simple HTML</title></head>
            <body>
                <button id="sumit">Submit</button>
            </body>
        </html>
        `);

        strictEqual( parser.querySelectorAll('title').length, 1 );
        strictEqual( parser.querySelectorAll('title')[0].textContent, 'My Simple HTML');
        strictEqual( Object.keys(parser.querySelectorAll('title')[0].attributes).length, 0);
    });

    it('should parse advaned html', () => {
        let html = readFileSync(__dirname + '/../fixture/html_fixture_1.html').toString('utf-8');
        let parser = new HtmlParser(html);

        strictEqual( parser.querySelectorAll('title').length, 1 );
        strictEqual( parser.querySelectorAll('title')[0].textContent, 'Dave Raggett&#39;s Introduction to HTML');
        strictEqual( Object.keys(parser.querySelectorAll('title')[0].attributes).length, 0);

        strictEqual( parser.querySelectorAll('style').length, 1 );
        strictEqual( parser.querySelectorAll('p').length, 105 );
        strictEqual( parser.querySelectorAll('h2').length, 11 );
    });

    it('parseSelector() should works properly', () => {
        let selector = parseSelector('img.thumb#thumb1.circle[ lazy = "true" ]');
        assert.lengthOf(selector, 1, 'only one selector should be parsed');
        assert.equal(selector[0].name, 'img');
        assert.equal(selector[0].id, 'thumb1');
        assert.deepEqual(selector[0].class, ['thumb', 'circle']);
        assert.deepEqual(selector[0].attr, [
            {value: 'true', name: 'lazy', op: '=' }
        ])
    })

});

describe('Browser Bundle -> VirtualBrowser', () => {

    it('HTMLCollection', () => {
        let img1 = new HTMLElement('img', { name: 'adImage' });
        let img2 = new HTMLElement('img');

        let collection = new VirtualBrowser.HTMLCollection([img1, img2]);

        strictEqual(collection.length, 2);
        strictEqual(collection['adImage' as any], img1);
    });

    it('sandbox eval', () => {
        let context = { a: 2 } ;
        runInNewContext('a = 3', context);
        strictEqual(context.a, 3);
        runInNewContext('b = 4', context);
        strictEqual((context as any)['b'], 4);
        runInNewContext('function hello() {}', context);
        strictEqual(typeof (context as any)['hello'], 'function');
    })

    it('should works', async () => {
        let window = await VirtualBrowser.loadFile(__dirname + '/../fixture/html_fixture_1.html');
        
        strictEqual( window.document.title , 'Dave Raggett&#39;s Introduction to HTML' );
        strictEqual( window.document.querySelector('img[ name = "adBanner" ]').getAttribute('width'), '48' );
        strictEqual( window.document.querySelectorAll('img').length, 8 );
        window.document.querySelector('img[name="adBanner"]').remove();
        strictEqual( window.document.querySelector('img[name="adBanner"]'), undefined );
        strictEqual( window.document.querySelectorAll('img').length, 7 );

        await window.waitForLoad();

        strictEqual(window.eval('document.title'), 'Dave Raggett&#39;s Introduction to HTML');
        window.eval('__test = 12');
        strictEqual(window.eval('__test'), 12);

        ok( typeof window.eval('gotoAd') == 'function' , 'gotoAd function declared in inline script must exists in Window scope' );

        deepStrictEqual(
            [ ...window.eval('adImages') ],
            ["hosts/csail.gif", "hosts/ercim.gif", "hosts/keio.gif"]
        )
    });

});