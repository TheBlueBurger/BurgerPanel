<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue';
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
</script>

<template>
    <div id="dropdown" ref="dropdownElem" @mouseleave="hide">
        <div id="dropdown-items" v-if="visible" :style="props.createOnCursor ? {
            position: 'absolute',
            top: currentY + 'px',
            left: currentX + 'px'
        } : {}">
            <slot />
        </div>
    </div>
</template>

<style scoped>
#dropdown-items {
    position: absolute;
    background-color: rgb(51, 51, 51);
    border-radius: 3px;
}
</style>