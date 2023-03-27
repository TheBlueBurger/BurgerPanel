export default new class EventEmitter {
    listeners: { [key: string]: ((...args: any[]) => void)[] } = {}; // this doesnt make any sense it is defined
    onceListeners: { [key: string]: ((...args: any[]) => void)[] } = {};
    // You might think "oh why arent these private?" but if they're private, vscode will scream at me because apparently its being used but not used at the same time?!?!?
    constructor() {
    }
    on(event: string, callback: (...args: any[]) => void) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }
    emit(event: string, ...args: any[]) {
        if (typeof this.listeners[event] != "undefined") for (const callback of this.listeners[event]) {
            callback(...args);
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