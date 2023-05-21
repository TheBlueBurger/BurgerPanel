import event from "./event";

export async function showInfoBox(title: string, description: string): Promise<{
    type: "OK" | "CLOSE"
}> {
    event.emit("default-modalbox-show", {
        title,
        description
    });
    return await event.awaitEvent("default-modalbox-done");
}