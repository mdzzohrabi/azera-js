/**
 * Pool collection
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class Pool<T> {

    /**
     * Current pool size
     */
    public get size(): number { return this.availableCounter + this.inProgressCounter; }

    /**
     * Number of available items
     */
    protected availableCounter: number = 0;

    /**
     * Number of in-progress items
     */
    protected inProgressCounter: number = 0;

    /**
     * Collection of available items
     */
    protected availableList: T[] = [];

    /**
     * Collection of in progress items
     */
    protected inProgressList: T[] = [];

    /**
     * Defered acquire list
     */
    protected deferedList: Function[] = [];

    constructor(
        /**
         * Build a new item
         */
        protected build: () => Promise<T>,

        /**
         * Maximum number of pool size
         */
        public max: number = 10,

        /**
         * Acquire timeout
         */
        public timeout: number = 10000
    ) {}

    /**
     * Defered acquire when an item be avaiable with specified timeout
     */
    protected deferAquire(): Promise<T> {
        return new Promise((resolve, reject) => {
            let deferResoler = async () => {
                clearTimeout(timeOut);
                return resolve(await this.acquire())
            };
            let timeOut = setTimeout(() => {
                let index = this.deferedList.indexOf(deferResoler);
                if (index >= 0) {
                    this.deferedList.splice(index, 1);
                    reject(Error(`Acquire timeout`));
                }
            }, this.timeout);
            this.deferedList.push(deferResoler);
        });
    }

    /**
     * Aquire an avaiable item or build new one
     */
    public async acquire(): Promise<T> {
        if (this.availableCounter > 0) {
            this.availableCounter--;
            this.inProgressCounter++;
            let item = this.availableList.pop()!;
            this.inProgressList.push(item);
            return item;
        }

        if (this.inProgressCounter == this.max) {
            return this.deferAquire();
        }

        let newItem = await this.build();
        this.inProgressList.push(newItem);
        return newItem;
    }

    public async canRelease(item: T) {
        return true;
    }

    /**
     * Release in-progress item to be used by others
     * @param item Item to release
     */
    public async release(item: T): Promise<boolean> {
        if (!await this.canRelease(item)) return false;
        let inProgressIndex = this.inProgressList.indexOf(item);
        if (inProgressIndex < 0) {
            return false;
        }
        this.inProgressList.splice(inProgressIndex, 1);
        this.availableList.push(item);
        this.availableCounter++;
        // Response to defered acquire queue
        this.deferedList.pop()?.call(this);
        return true;
    }

}