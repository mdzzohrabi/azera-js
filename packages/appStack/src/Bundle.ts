/**
 * Bundle
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class Bundle {

    /**
     * Bundle name
     */
    static bundleName: string;

    /**
     * Bundle version
     */
    static version: string;

    /**
     * Initialize bundle
     */
    init(...params: any[]) {}

    /**
     * Bootstrap module
     */
    boot(...params: any[]) {}

    /**
     * Desctruct bundle
     */
    destruct(...params: any[]) {}

    /**
     * Run
     * @param params Optional parameters
     */
    run(...params: any[]) {}

}