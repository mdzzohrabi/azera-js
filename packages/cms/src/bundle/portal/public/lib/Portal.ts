import * as _React from 'react';
import * as _ReactDOM from 'react-dom';
import * as _ReactRouter from 'react-router-dom';
import * as Locale from './i18n';
import * as Strings from './Strings';
import { TableComponent } from './TableComponent';

/**
 * Portal
 * Portal library used by modules
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export namespace Portal {

    export const log = console.log;
    
    export let { i18n } = Locale;
    export const { camelCase, snakeCase, humanize } = Strings;
    export const Table = TableComponent;
    
    // Export react
    export const React = _React;
    export const ReactDOM = _ReactDOM;
    export const Router = _ReactRouter;
    export const Component = React.Component;
    
    // Portal version
    export const VERSION = '1.0.0';

    // Modues api endPoint
    const MODULES_API = '/portal/api/modules';

    /** Declared modules */
    export const $modules: IModule[] = [];

    /**
     * Load and execute a remote script
     * @param src Script url
     */
    export function loadScript(src: string) {
        return new Promise((resolve, reject) => {
            let script = document.createElement('script');
            script.onload = resolve;
            script.onerror = reject;
            script.type = 'text/javascript';
            script.src = src;
            script.async = false;
            document.head.appendChild(script);
        });
    }

    /**
     * Load a bundle script
     * @param bundle Bundle script url
     */
    export function loadModule(bundle: string) {
        return loadScript(bundle);
    }

    export type SeqFunc<T, V> = Promise<T> | ((param: V) => Promise<T> | T)

    export function runInSeq<A, B>(
        func1: SeqFunc<A, undefined>,
        func2?: SeqFunc<B, A>): Promise<B>
    export function runInSeq<A, B, C>(
        func1: SeqFunc<A, undefined>,
        func2?: SeqFunc<B, A>,
        func3?: SeqFunc<C, B>): Promise<C>
    export function runInSeq<A, B, C, D>(
        func1: SeqFunc<A, undefined>,
        func2?: SeqFunc<B, A>,
        func3?: SeqFunc<C, B>,
        func4?: SeqFunc<D, C>): Promise<D>
    export function runInSeq<A, B, C, D, E>(
        func1: SeqFunc<A, undefined>,
        func2?: SeqFunc<B, A>,
        func3?: SeqFunc<C, B>,
        func4?: SeqFunc<D, C>,
        func5?: SeqFunc<E, D>): Promise<E>
    export function runInSeq<A, B, C, D, E, F, G, H>(
        func1: SeqFunc<A, undefined>,
        func2?: SeqFunc<B, A>,
        func3?: SeqFunc<C, B>,
        func4?: SeqFunc<D, C>,
        func5?: SeqFunc<E, D>,
        func6?: SeqFunc<F, E>,
        func7?: SeqFunc<G, F>,
        func8?: SeqFunc<H, G>,
        ...funcs: Function[]): Promise<H>

    export function runInSeq(...funcs: any[]) {
        return new Promise((resolve, reject) => {

            let len = funcs.length, i = 0, error = false;

            function next(value?: any) {
                if (i == len) return resolve(value);
                let n = i++;
                Promise.resolve(typeof funcs[n] == 'function' ? funcs[n].call(this, value) : funcs[n]).then(result => next(result)).catch(reject);
            }

            next();

        });
    }

    /**
     * Bootstrap portal
     */
    export function loadPortal() {
        return runInSeq(
            // Retreive modules url
            fetch(MODULES_API).then(res => res.json() as Promise<ModuleApiResponse>),

            // Load modules
            ({ modules }) => Promise.all(modules.map(loadModule)),
            
            // Execute modules
            () => Promise.all($modules.map(module => module.module(Portal))),

            // Lock Portal
            () => lock(Portal, loadPortal, loadModule, hook, module),

            // Return Portal
            () => Portal
        ).catch(console.error);
    }
    
    function locked() { throw Error(`This method locked and cannot be invoked`); }

    /**
     * Lock a method in a context to prevent from invoke
     * @param context Context
     * @param func    Functions
     */
    function lock(context: object, ...func: Function[]) {
        func.forEach(f => context[f.name] = locked);
    }

    /**
     * Set page title
     * @param title Title
     */
    export function setTitle(title: string) {
        document.title = title;
    }

    /**
     * Modules api response interface
     */
    interface ModuleApiResponse {
        // Modules bundles path
        modules: string[]
    }

    export interface RouteCollection { [route: string]: (...params: any[]) => JSX.Element }

    export interface Menu {
        parent?: string
        icon?: string
        title?: string
        name?: string
        link?: string
        children?: Menu[]
    }

    /** Portal basic hooks */
    export const HOOKS = {
        /** Panel menu */
        PANEL_MENU: 'panel.menu' as 'panel.menu',

        /** Main routes */
        ROUTES: 'routes.main' as 'routes.main',

        /** Portal content routes */
        ROUTES_DESKTOP: 'routes.desktop' as 'routes.desktop'
    };

    /**
     * Defined hooks collection
     */
    let hooks: { [name: string]: Function[] } = {};

    /** Push a listener to portal panel menu hook */
    export function hook<T = Menu>(name: 'panel.menu', listener: (value: T) => void): void

    /** Push a new listener to main routes hook */
    export function hook<T = RouteCollection>(name: 'routes.main' | 'routes.desktop', listener: (value: T) => void): void
    
    /** Push a new hook */
    export function hook<T>(name: string, listener: (value: T) => void): void
    
    /** Portal panel menu hook */
    export function hook<T = Menu>(name: 'panel.menu', value?: T): T

    /** Main routes hook */
    export function hook<T = RouteCollection>(name: 'routes.main' | 'routes.desktop', value?: T): T

    /** Invoke a hook */
    export function hook<T>(name: string, value?: T): T
    export function hook<T>(name: string, value?: any) {
        hooks[name] = hooks[name] || [];
        if (typeof value == 'function') {
            hooks[name].push(value);
        } else {
            hooks[name].forEach(hooker => hooker(value));
        }
        return value;
    }

    interface IModule {
        name: string,
        module: (portal: typeof Portal) => void
    }

    export function module(name: IModule['name'], module: IModule['module']) {
        $modules.push({ name, module });
    }
    
    // Global scope
    ( window || {} )['defineModule'] = module;

}

type IPortal = typeof Portal;


declare global {
    const defineModule: IPortal['module'];
}