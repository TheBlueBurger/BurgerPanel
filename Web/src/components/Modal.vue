<script setup lang="ts">
import { ComputedRef, Ref, computed, onMounted, onUnmounted, ref } from 'vue';
import event from '../util/event';
import { ConfirmButtonType, ModalData, ModalInput } from '../util/modal';
import TextInput from './TextInput.vue';

let props = defineProps({
    modalID: {
        type: String
    },
    buttonType: {
        type: String,
        default: "OK"
    },
    confirmButtonRight: {
        type: Boolean,
        default: true
    },
    __isDefaultModal: {
        type: Boolean,
        default: false
    },
    reversedButtonColors: {
        type: Boolean,
        default: false
    },
    grayNo: {
        type: Boolean,
        default: false
    },
    whiteButtons: {
        type: Boolean,
        default: true
    }
});
let e = defineEmits(["close-btn-clicked", "done-clicked"]);
let defaultModalData: Ref<ModalData | undefined> = ref();
let defaultModalShow = ref(false);
let shouldShow = computed(() => {
    if (!props.__isDefaultModal) return true;
    return defaultModalShow.value;
});
let inputResponses = ref({}) as Ref<{
    [id: string]: string;
}>;
onMounted(() => {
    if (props.__isDefaultModal) event.on("default-modalbox-show", d => {
        if(defaultModalShow.value) {
            throw new Error(`Got request to show modal while modal is already showing! Old: ${JSON.stringify(defaultModalData.value)}. New: ${JSON.stringify(d)}`);
        }
        console.log("Creating (default) modal with data", d);
        inputResponses.value = {}
        defaultModalData.value = d;
        defaultModalShow.value = true;
        if(defaultModalData.value?.inputs) defaultModalData.value.inputs.forEach(input => {
            inputResponses.value[input.id] = "";
        })
    });
});
onUnmounted(() => {
    if (props.__isDefaultModal) event.removeAllListeners("default-modalbox-show");
});
let noShouldBeGray = computed(() => {
    if(props.__isDefaultModal) return !!defaultModalData.value?.grayNo;
    else return props.grayNo;
})
function closeModal() {
    if (props.__isDefaultModal) {
        defaultModalRespond("CLOSE");
    } else e("close-btn-clicked");
}
function defaultModalRespond(type: string) {
    defaultModalShow.value = false;
    event.emit("default-modalbox-done", {
        type,
        inputs: inputResponses.value
    });
}

function clicked(type: string) {
    if (props.__isDefaultModal) {
        defaultModalRespond(type);
    } else e("done-clicked", type);
}
let confirmButtonType: ComputedRef<ConfirmButtonType | undefined> = computed(() => {
    if (props.__isDefaultModal) return defaultModalData.value?.confirmButtonType;
    else return props.buttonType as ConfirmButtonType;
});
let shouldButtonsBeRight = computed(() => {
    if(!props.__isDefaultModal) return !!props.confirmButtonRight;
    else return !defaultModalData.value?.buttonsLeft;
});
let shouldButtonsBeReversedColors = computed(() => {
    if(!props.__isDefaultModal) return !!props.reversedButtonColors;
    else return !!defaultModalData.value?.reversedButtonColors;
});
let shouldButtonsBeWhiteLabeled = computed(() => {
    if(!props.__isDefaultModal) return !!props.whiteButtons;
    else return !!defaultModalData.value?.whiteLabels;
});
</script>

<template>
    <div id="blur" v-if="shouldShow">
        <div id="modal-container">
            <div id="modal">
                <div id="modal-content">
                    <div id="close-btn" @click="closeModal">
                        X
                    </div>
                    <div id="slot">
                        <div id="slot-slot" v-if="!__isDefaultModal">
                            <slot />
                        </div>
                        <div v-else>
                            <h1>{{ defaultModalData?.title }}</h1>
                            <pre v-if="defaultModalData?.description">{{ defaultModalData?.description }}</pre>
                            <div v-if="__isDefaultModal">
                                <div v-if="defaultModalData?.inputs" v-for="input in defaultModalData?.inputs">
                                    <div v-if="input.type == 'TextInput'">
                                        <div v-if="input.data.inputType != 'number'"><TextInput :placeholder="input.data.placeholder" @set="v => inputResponses[input.id] = v" :default="''" :initial-editing="true" :model-mode="true" /></div>
                                        <input v-else :type="input.data.inputType" :placeholder="input.data.placeholder" v-model="inputResponses[input.id]">
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div id="bottom-buttons" :class="
                        {
                            whiteButtons: shouldButtonsBeWhiteLabeled,
                            right: shouldButtonsBeRight
                        }
                        ">
                            <div id="done-btn">
                                <div v-if="confirmButtonType == 'OK'">
                                    <button :class='{
                                            "bg-green": !shouldButtonsBeReversedColors,
                                            "bg-red": shouldButtonsBeReversedColors
                                        }' @click="clicked('OK')">Ok</button>
                                </div>
                                <div v-else-if="confirmButtonType == 'CONFIRM'">
                                    <button :class='{
                                            "bg-green": shouldButtonsBeReversedColors && !noShouldBeGray,
                                            "bg-red": !shouldButtonsBeReversedColors && !noShouldBeGray,
                                            "bg-gray": noShouldBeGray
                                        }' @click="clicked('NO')">No</button>
                                    <button :class='{
                                            "bg-green": !shouldButtonsBeReversedColors,
                                            "bg-red": shouldButtonsBeReversedColors
                                        }' @click="clicked('YES')">Yes</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
#done-btn {
    margin-top: 5px;
}
#blur {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1040;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.05);
    backdrop-filter: blur(1px);
}

#modal-container {
    display: flex;
    flex-direction: column;
    border-radius: 10px;
    width: fit-content;
    max-width: 1000px;
    padding: 10px;
    height: fit-content;
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    justify-content: center;
    background-color: #3d3c3c;
    margin: auto;
    z-index: 9999;
}

#modal * {
    height: fit-content;
    width: fit-content;
    flex-direction: column;
    white-space: pre-line; /* do not remove this or phones will break */
}

#close-btn {
    position: absolute;
    top: 0;
    right: 0;
    margin-top: 1px;
    margin-right: 3px;
    cursor: pointer;
    user-select: none;
}

#slot {
    margin-top: 5px;
    min-width: 300px;
    min-height: 50px;
    max-height: 95vh;
    overflow-y: auto;
}

.right {
    right: 0;
    float: right;
}

.bg-red {
    background-color: #DD5656;
}

.bg-green {
    background-color: #77E080;
}

.bg-gray {
    background-color: #2c2b2b;
}

button {
    color: black;
    display: unset !important;
}

.whiteButtons button {
    color: white !important;
}
</style>