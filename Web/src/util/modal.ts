import event from "./event";
export type ModalInputData<T extends keyof ModalInput> = {
    id: string,
    type: T,
    data: ModalInput[T]
}
let currentModalID = 0;
export type ModalInput = {
    TextInput: {
        inputType: "text" | "password" | "number",
        placeholder: string,
        maxLength?: number;
    }
}
export type ConfirmButtonType = "OK" | "CONFIRM" | "OK_CANCEL";
export type ModalData = {
    title: string,
    description?: string,
    inputs?: ModalInputData<keyof ModalInput>[],
    confirmButtonType: ConfirmButtonType,
    buttonsLeft?: boolean,
    grayNo?: boolean,
    reversedButtonColors?: boolean,
    whiteLabels?: boolean
};
export type ModalResp = {
    type: "YES" | "NO" | "OK" | "CLOSE" | "CANCEL",
    inputs: {
        [id: string]: string
    }
}
export async function showInfoBox(title: string, description: string) {
    return await requestModal({
        title,
        description,
        confirmButtonType: "OK"
    })
}
export async function modalInput(title: string, inputs: ModalData["inputs"], description?: string, buttonType: ConfirmButtonType = "CONFIRM") {
    let modalResp = await requestModal({
        title,
        inputs,
        description,
        confirmButtonType: buttonType
    });
    if(["OK","YES"].includes(modalResp.type)) return modalResp;
}
export async function confirmModal(title: string, description: string, grayNo: boolean = false, reversedButtonColors: boolean = false, whiteButtons: boolean = false) {
    return (await requestModal({
        title,
        description,
        confirmButtonType: "CONFIRM",
        grayNo,
        reversedButtonColors,
        whiteLabels: whiteButtons
    })).type == "YES";
}
export async function requestModal(data: ModalData): Promise<ModalResp> {
    let id = currentModalID++;
    event.emit("default-modalbox-show", {
        ...data,
        id
    });
    return await event.awaitEvent("default-modalbox-done-" + id);
}