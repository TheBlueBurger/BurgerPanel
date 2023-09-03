export default new class EventEmitter {
    listeners: { [key: string]: ({callback: (...args: any[]) => void, i: number})[] } = {}; // this doesnt make any sense it is defined
    onceListeners: { [key: string]: ((...args: any[]) => void)[] } = {};
    private i = 0;
    // You might think "oh why arent these private?" but if they're private, vscode will scream at me because apparently its being used but not used at the same time?!?!?
    // edit: vscode has stopped being stupid
    constructor() {

    }
    on(event: string, callback: (...args: any[]) => void, removePromise?: Promise<unknown>) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        let id = this.i++;
        if(import.meta.env.DEV) console.log(`Adding event listener '${event}'`)
        this.listeners[event].push({
            i: id,
            callback //a
        });
        if(removePromise) removePromise.then(() => {
            this.listeners[event] = this.listeners[event].filter(e => e.i != id);
            if(import.meta.env.DEV) console.log(`Event handler '${event}' removed after promise resolved, now has ${this.listeners[event].length} listener${this.listeners[event].length == 1 ? '' : 's'}`);
        });
    }
    emit(event: string, ...args: any[]) {
        if (typeof this.listeners[event] != "undefined") for (const callback of this.listeners[event]) {
            callback.callback(...args);
        }
        if (typeof this.onceListeners[event] != "undefined") for (const callback of this.onceListeners[event]) {
            callback(...args);
        }
        this.onceListeners[event] = [];
    }
    awaitEvent(event: string): Promise<any> {
        return new Promise((resolve) => {
            this.once(event, resolve);
        });
    }
    once(event: string, callback: (...args: any[]) => void) {
        if (!this.onceListeners[event]) {
            this.onceListeners[event] = [];
        }
        this.onceListeners[event].push(callback);
    }
    removeAllListeners(event: string, includeOnce: boolean = true) {
        this.listeners[event] = [];
        if(includeOnce) this.onceListeners[event] = [];
    }
}