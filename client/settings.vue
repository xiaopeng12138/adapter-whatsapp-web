<template>
  <k-comment class="WhatsAppWeb" v-if="data" :type="type">
    <template v-if="data.status === 'offline'">
      <p>WhatsApp-Web client offline</p>
    </template>
    <template v-else-if="data.status === 'error'">
      <p>{{ data.message }}</p>
    </template>
    <template v-else-if="data.status === 'init'">
      <p>Initializing WhatsApp-Web client</p>
    </template>
    <template v-else-if="data.status === 'continue'">
      <p>Login……</p>
    </template>
    <template v-else-if="data.status === 'success'">
      <p>Connent to WhatsApp-Web Successful</p>
    </template>
    <template v-else-if="data.status === 'qrcode'">
      <p v-if="data.message">{{ data.message }}</p>
      <img class="qrcode" :src="data.image" />
    </template>
  </k-comment>
</template>

<script lang="ts" setup>
import { inject, computed, ref } from "vue";
import { Schema, store, send, message } from "@koishijs/client";

defineProps<{
  data: any;
}>();

const local: any = inject('manager.settings.local')
const config: any = inject('manager.settings.config')
const current: any = inject('manager.settings.current')

const data = computed(() => {
  if (local.value.name !== 'koishi-plugin-adapter-whatsapp-web') return
  return store.WhatsAppWeb
});

const type = computed(() => {
  if (!data.value) return;
  if (data.value.status === "init") return;
  if (data.value.status === "error") return "error";
  if (data.value.status === "success") return "success";
  return "warning";
});

const invalid = computed(() => {
  if (!data.value?.device?.startsWith("qdvc:")) return true;
  const [device] = data.value.device.slice(5).split(",");
  if (device) {
    try {
      JSON.parse(atob(device));
    } catch {
      return true;
    }
  }
});
</script>

<style lang="scss" scoped>
.WhatsAppWeb {
  img {
    display: block;
    margin: 1rem 0;
  }

  .qrcode {
    width: 200px;
    image-rendering: pixelated;
  }

  .link {
    position: absolute;
    margin: 1rem 0;
    line-height: 1.7;
    right: 0;
    margin-right: 1.5rem;
  }

  .action {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    margin: 1rem 0;

    &.input {
      gap: 1rem 1rem;
    }

    .el-input {
      width: 200px;
    }

    .el-button {
      display: inline-block;
      text-align: initial;
      height: auto;
      white-space: normal;
      padding: 4px 15px;
      line-height: 1.6;
    }

    .el-button + .el-button {
      margin-left: 0;
    }

    iframe {
      border: none;
    }
  }
}
</style>
