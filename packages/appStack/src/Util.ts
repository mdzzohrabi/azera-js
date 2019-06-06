import { existsSync } from 'fs';
import { dirname } from 'path';

/**
 * Get node package directory
 */
export function getPackageDir(pkgName?: string) {
    let dir: string;
    if (!pkgName) dir = (<any>require.main).filename;
    else dir = require.resolve(pkgName, { paths: (<any>require.main).paths });

    while ( !existsSync(dir + '/package.json') ) {
        dir = dirname(dir);
    }

    return dir;
}

export async function asyncEach<T>(items: T[], _func: (value: T) => any) {
    let len = items.length;
    for (let i = 0; i < len ; i++)
        await _func(items[i]);
}

export async function serialize(items: Function[]) {
    return await asyncEach(items, async func => await func());
}

export class Util {

    /**
     * Flatten an nested object
     * ```json
     * {
     *  "http": {
     *      "port": 9090
     *  }
     * }
     * ```
     * will be flatten as :
     * ```json
     * {
     *  "http.port": 9090
     * }
     * ```
     * @param object Object
     * @param join Join character
     */
    static flatObject(object: any, join: string = '.') {


    }

}