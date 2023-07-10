<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
let visible = ref(false);
let currentX = ref(0);
let currentY = ref(0);
let checkElementInterval = -1;
onUnmounted(() => {
    clearInterval(checkElementInterval);
})
function show(e: MouseEvent) {
    if(visible.value) return;
    visible.value = true;
    let screenX = window.innerWidth;
    let screenY = window.innerHeight;
    // hide it until it exists
    currentX.value = 0;
    currentY.value = screenY + 10;
    checkElementInterval = setInterval(() => {
        if(items.value) clearInterval(checkElementInterval);
        else return;
        console.log({
            screenX,
            screenY,
            divWidth: items.value?.clientWidth,
            divHeight: items.value?.clientHeight,
            items: items?.value
        });
        // now calc if its too big to fit in the screen
        let {clientX, clientY} = e;
        // let cornerX = clientX + items.value.clientWidth;
        // let cornerY = clientY + items.value.clientHeight;
        // if(cornerX > screenX) {
        //     clientX = clientX - cornerX + screenX;
        // }
        // if(cornerY > screenY) {
        //     clientY = clientY - cornerY + screenY;
        // }
        console.log(`Math.min(${screenX}-${items.value?.clientWidth} -> ${screenX-items.value?.clientWidth}, ${clientX}) -> ${Math.min(screenX-items.value?.clientWidth, clientX)}`)
        clientX = Math.min(screenX-items.value?.clientWidth, clientX);
        clientY = Math.min(screenY-items.value?.clientHeight, clientY);
        currentX.value = clientX;
        currentY.value = clientY;
    })
}
let props = defineProps({
    createOnCursor: {
        default: false,
        type: Boolean
    }
});
function hide() {
    visible.value = false;
}
defineExpose({
    show,
    hide
});
let dropdownElem = ref();
function hideIfNotInside(e: MouseEvent) {
    let composedPath = e.composedPath();
    let found = composedPath.some(el => {
        return el == dropdownElem.value;
    });
    if(!found) hide();
}
let items = ref(null as HTMLDivElement | null);
</script>

<template>
    <div class="dropdown-container" v-if="visible" @click="hideIfNotInside" @auxclick="hideIfNotInside">
        <div id="dropdown" ref="dropdownElem">
            <div id="dropdown-items" v-if="visible" ref="items" :style="props.createOnCursor ? {
                position: 'fixed',
                top: currentY + 'px',
                left: currentX + 'px'
            } : {}">
                <slot />
            </div>
        </div>
    </div>
</template>

<style scoped>
.dropdown-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
}
#dropdown-items {
    position: fixed;
    background-color: rgb(51, 51, 51);
    border-radius: 3px;
}
</style>