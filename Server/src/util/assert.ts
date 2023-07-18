export default function assert(condition: boolean, message?: string): asserts condition is true {
    if(!condition) throw new Error(message ?? "Server assertion failed");
}