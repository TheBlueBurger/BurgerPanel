<script setup lang="ts">
    import { ref, watch } from 'vue';
    let props = defineProps({
        default: {
            type: String,
            required: true
        },
        placeholder: {
            type: String
        },
        initialEditing: {
            type: Boolean,
            required: false,
            default: false
        },
        password: {
            type: Boolean,
            required: false,
            default: false
        },
        forceDisabled: {
            type: Boolean,
            required: false,
            default: false
        },
        modalMode: {
            type: Boolean,
            required: false,
            default: false
        },
        maxLength: {
            type: Number,
            required: false
        }
    });
    let disabled = ref(!props.initialEditing);
    let emits = defineEmits(["set"]);
    function set() {
        if(disabled.value || props.forceDisabled) return;
        emits("set", text.value);
        disabled.value = true;
    }
    let text = ref(props.default);
    function reset() {
        text.value = props.default;
        disabled.value = true;
    }
    watch(disabled, (newVal) => {
        if(props.modalMode && newVal) disabled.value = false;
    })
</script>
<template>
    <div id="textinput-root">
        <textarea @keydown.enter="set" :placeholder="props.placeholder" :disabled="disabled" v-model="text" :style="{
                width: Math.max((text || '').length * 1.05 + 1, 25) + 'ch'
            }" @input="e => {if(modalMode) $emit('set', text)}" :class="{
                'modal-mode': modalMode
            }" :maxlength="props.maxLength">
        </textarea>
        <div id="textinput-buttons">
            <button v-if="disabled && !modalMode" @click="() => {if(!props.forceDisabled) disabled = false}" :style="
            {
                cursor: props.forceDisabled ? 'not-allowed' : 'pointer'
            }
            " id="edit-btn">Edit</button>
            <button v-if="!disabled && !modalMode" @click="set" id="set-btn">Set</button>
            <button v-if="!disabled && !modalMode" @click="reset" id="cancel-btn">Cancel</button>
        </div>
    </div>
</template>
<style scoped>
textarea {
    overflow-y: scroll;
    max-width: 80vw;
    scrollbar-width: unset;
    padding: 4px 10px;
    border: none;
    border-radius: 10px;
    background-color: #3b3a3a80;
    color: #ffe677;
    font-size: 15px;
    font-family: 'Ubuntu Mono Regular', monospace;
    /* transition: all .1s ease-in-out; */
    margin-top: 5px;
}
textarea::-webkit-scrollbar {
    width: unset;
    height: unset;
    display: unset;
}
#textinput-buttons {
    margin-top: 5px;
    display: block;
}
#textinput-root {
    width: fit-content;
}
.modal-mode {
    border-radius: 10px;
    border-right: 1px solid #504f4f;
}
#edit-btn {
    background-color: #2c2b2b80;
    border: 1px solid #323131;
    color: #868686;
    border-radius: 10px;
    padding:5px 10px;
    border-left: none;
    display:block;
}
#edit-btn:hover {
    background-color: #515050;
    border: 1px solid #777777;
    border-left: none;
    color: #d0d0d0;
}
#set-btn {
    border-radius: 10px 0px 0px 10px;
    padding:5px 10px;
    border-left:none;
    border-right:none;
    display:inline-block;
}
#cancel-btn {
    padding: 5px 10px;
    border-radius: 0px 10px 10px 0px;
    border-left: none;
    display:inline-block;
}
/* the button for applying will only show once */
input {
    border-radius: 10px 0px 0px 10px;
    border: 0px;
    padding: 5px 10px;
    margin-right: 2px;
    color: #ffd069;
    border: 1px solid #504f4f;
    margin-right: 0;
    border-right: none;
}
input[disabled] {
    border-radius: 10px 0px 0px 10px;
    color: #868686;
    background-color: #2c2b2b80;
    border: 1px solid #323131;
    border-right: none;
}
input:focus {
    outline: none;
}
input::selection {
    background-color: #ffd069;
    color:black;
}
</style>