<script setup lang="ts">
import { ref } from 'vue';
let visible = ref(false);
let currentX = 0;
let currentY = 0;
function show(e: MouseEvent) {
    if(visible.value) return;
    visible.value = true;
    currentX = e.clientX;
    currentY = e.clientY;
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
</script>

<template>
    <div class="dropdown-container" v-if="visible" @click="hideIfNotInside" @auxclick="hideIfNotInside">
        <div id="dropdown" ref="dropdownElem">
            <div id="dropdown-items" v-if="visible" :style="props.createOnCursor ? {
                position: 'absolute',
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
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
}
#dropdown-items {
    position: absolute;
    background-color: rgb(51, 51, 51);
    border-radius: 3px;
}
</style>