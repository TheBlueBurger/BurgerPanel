<script setup lang="ts">
import { Ref, computed, onMounted, onUnmounted, ref } from 'vue';
import event from '../util/event';

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
    }
});
let e = defineEmits(["close-btn-clicked", "done-clicked"]);
let defaultModalData: Ref<{
    title: string,
    description: string
} | undefined> = ref();
let defaultModalShow = ref(false);
let shouldShow = computed(() => {
    if(!props.__isDefaultModal) return true;
    return defaultModalShow.value;
});
onMounted(() => {
    event.on("default-modalbox-show", d => {
    defaultModalData.value = d;
    defaultModalShow.value = true;
    });
});
onUnmounted(() => {
    if(props.__isDefaultModal) event.removeAllListeners("default-modalbox-show");
})
function closeModal() {
    if(props.__isDefaultModal) {
        defaultModalRespond("CLOSE");
    } else e("close-btn-clicked");
}
function defaultModalRespond(type: string) {
    defaultModalShow.value = false;
    event.emit("default-modalbox-done", {
        type
    })
}

function clicked(type: string) {
    if(props.__isDefaultModal) {
        defaultModalRespond(type);
    } else e("done-clicked", type);
}
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
                            <pre>{{ defaultModalData?.description }}</pre>
                        </div>
                    </div>
                    <div id="done-btn">
                        <div v-if="props.buttonType == 'OK' || __isDefaultModal">
                            <button :class='{
                                right: props.confirmButtonRight,
                                "bg-green": !reversedButtonColors,
                                "bg-red": reversedButtonColors
                            }' @click="clicked('OK')">Ok</button>
                    </div>
                    <div v-else-if="props.buttonType == 'CONFIRM'">
                        <button :class='{
                            right: props.confirmButtonRight,
                            "bg-green": !reversedButtonColors,
                            "bg-red": reversedButtonColors
                        }' @click="clicked('YES')">Yes</button>
                        <button :class='{
                            right: props.confirmButtonRight,
                            "bg-green": reversedButtonColors && !props.grayNo,
                            "bg-red": !reversedButtonColors && !props.grayNo,
                            "bg-gray": props.grayNo
                        }' @click="clicked('NO')">No</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    </div>
</template>

<style scoped>
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
  #modal {
    overflow-x: auto;
    display: flex;
    height: fit-content;
    width: fit-content;
    flex-direction: column;
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
    color: white;
  }
</style>