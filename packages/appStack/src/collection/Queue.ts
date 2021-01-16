/**
 * Queue collection
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class Queue<T> extends Array<T> {

    /**
     * Get next value from queue (first item in array)
     */
    public next(): T | undefined {
        if (this.length === 0) return;
        let item = this[0];
        this.splice(0, 1);
        return item;
    }

    /**
     * Add item to queue
     */
    public add = this.push;
    
}