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

    /**
     * Add services to container
     * @param params Services
     */
    getServices(...params: any[]): Function[] | Promise<Function[]> {
        return [];
    }

    get bundleName() {
        return (this.constructor as any).bundleName || this.constructor.name;
    }

}