import * as _React from 'react';
import * as _ReactDOM from 'react-dom';
import * as _ReactRouter from 'react-router-dom';
import * as Locale from './i18n';
import * as Strings from './Strings';
import { TableConmponent } from './TableComponent';

/**
 * Portal
 * Portal library used by modules
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export namespace Portal {

    export const log = console.log;
    
    export let { i18n } = Locale;
    export const { camelCase, snakeCase, humanize } = Strings;
    export const Table = TableConmponent;
    
    // Export react
    export const React = _React;
    export const ReactDOM = _ReactDOM;
    export const Router = _ReactRouter;
    export const Component = React.Component;
    
    // Portal version
    export const VERSION = '1.0.0';

    // Modues api endPoint
    const MODULES_API = 'api/modules';

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

    /**
     * Bootstrap portal
     */
    export function loadPortal() {
        return fetch(MODULES_API).then(async res => {
            let response = await res.json() as ModuleApiResponse,
                { modules = [] } = response;
            
            // Load all modules
            await Promise.all(modules.map(loadModule));

            // Secure Portal Api
            lock(Portal, loadPortal, loadModule);
            // Object.freeze(routes);

            return Portal;
        }).catch(console.error);
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

    export interface RouteCollection { [route: string]: () => JSX.Element }

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
        PANEL_MENU: 'panel.menu',

        /** Main routes */
        ROUTES: 'routes.main',

        /** Portal content routes */
        ROUTES_DESKTOP: 'routes.desktop'
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
    
}

window['Portal'] = Portal;