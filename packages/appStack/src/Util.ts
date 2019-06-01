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
    flatObject(object: any, join: string = '.') {


    }

}