<script setup lang="ts">
import { onMounted, onUnmounted, provide, Ref, ref, watch } from "vue";
import type { Server } from "../../Share/Server.js";
import type { AuthS2C } from "../../Share/Auth.js";
import { User } from "../../Share/User";
import EventEmitter from "./util/event";
import "./style.css";
import Navbar from "./components/Navbar.vue";
import { Config } from "../../Share/Config";
import { _knownSettings } from "./util/config";
import { useRouter } from "vue-router";
import { ServerStatuses } from '../../Share/Server';
import event from "./util/event";
let router = useRouter();
let events = ref(EventEmitter);
let knownSettings = ref(_knownSettings) as Ref<{ [key in keyof Config]: any }>
let notifications = ref([] as string[]);
let notificationQueue: string[] = [];
function createNotification(text: string) {
  console.log("Creating notification", text);
  if (notifications.value.length != 0) return notificationQueue.push(text);
  console.log("Pushing", text, "to", notifications.value)
  notifications.value.push(text);
  setTimeout(() => {
    notifications.value = [];
    let nextNotification = notificationQueue.shift();
    console.log("next notification", nextNotification)
    if (nextNotification && nextNotification != text) {
      setTimeout(createNotification, 250, nextNotification);
    }
  }, 5000);
}
events.value.on("createNotification", createNotification);
events.value.on("knownSettingsUpdated", (settings: any) => {
  knownSettings.value = settings;
});
provide("knownSettings", knownSettings);
provide("events", events);
let queuedPackets: any[] = [];
events.value.on("sendPacket", (data: any) => {
  if (!connected.value) {
    queuedPackets.push(data);
    return;
  }
  ws.value.send(JSON.stringify(data));
});
let API_URL: string;
if (import.meta.env.PROD) {
  API_URL = location.protocol + "//" + location.host
} else {
  API_URL = "http://localhost:3001"
}
let connected = ref(false);
// Connect with WS
let ws: Ref<WebSocket> = ref() as Ref<WebSocket>;
provide("ws", ws);
let servers = ref([] as Server[]);
provide("servers", servers);
let debugMessage: Ref<AuthS2C> = ref() as Ref<AuthS2C>;
let lastID = ref(null) as Ref<string | null>;
let pingInterval: number;
onMounted(() => {
  pingInterval = setInterval(() => { // if we're using cloudflare, we need to ping in order to make cloudflare not explode
    if (connected.value) {
      events.value.emit("sendPacket", {
        type: "ping"
      });
    }
  }, 30_000);
});
onUnmounted(() => {
  clearInterval(pingInterval);
});
function initWS() {
  ws.value = new WebSocket(API_URL.replace("http", "ws"));
  ws.value.addEventListener("open", () => {
    console.log("open event: connected with readystate " + ws.value.readyState)
    events.value.emit("connected");
    if (localStorage.getItem("token")) {
      token.value = localStorage.getItem("token") || "";
      login();
    } else {
      showLoginScreen.value = true;
    }
    connected.value = true;
  });
  ws.value.addEventListener("close", () => {
    connected.value = false;
    loginStatus.value = null;
    setTimeout(() => {
      initWS();
    }, 1000);
  });
  ws.value.addEventListener("message", (e) => {
    let data = JSON.parse(e.data);
    events.value.emit("packetRecieved", data);
    if (data.emitEvent) {
      events.value.emit(data.type, data);
      if (data.emits) {
        for (let emit of data.emits) {
          events.value.emit(emit, data);
        }
      }
    }
    if (data.type == "auth") { // TODO: Fix this absolute mess
      let authPacket = data as AuthS2C;
      if (authPacket.success) {
        if (!authPacket.user) {
          console.log("User doesn't exist, but login was successful. Probably already authenticated.");
          return;
        }
        queuedPackets.forEach(queuedPacket => {
          ws.value.send(JSON.stringify(queuedPacket));
        });
        loginStatus.value = authPacket.user;
        console.log("Logged in as " + authPacket.user.username);
        localStorage.setItem("token", token.value);
        servers.value = authPacket.servers as any;
        debugMessage.value = authPacket;
        if (lastID.value != authPacket.user._id) createNotification("Welcome, " + authPacket.user.username + "!");
        lastID.value = authPacket.user._id;
        if(authPacket.statuses) serverStatuses.value = authPacket.statuses;
      }
    } else if (data.type == "error") {
      alert("Error: " + data.message);
    }
  });
}

initWS();
function login() {
  ws.value.send(
    JSON.stringify({
      type: "auth",
      token: token.value,
    })
  );
}
let token = ref("");
let loginStatus: Ref<User | null> = ref() as Ref<User | null>;
provide("loginStatus", loginStatus);

function logout() {
  localStorage.removeItem("token");
  events.value.emit("logout");
  servers.value = [];
  loginStatus.value = null;
  ws.value.send(
    JSON.stringify({
      type: "logout",
    })
  );
  showLoginScreen.value = true;
}
events.value.on("requestLogout", () => {
  logout();
});// i dont know wdym so mabe
let users = ref(new Map<string, User>());
provide("users", users);

let loginMsg = ref("");
events.value.on("loginFailed", (data: AuthS2C) => {
  console.log("Login failed: " + data.message)
  loginMsg.value = data.message as string;
  showLoginScreen.value = true;
});
events.value.on("getLoginStatus", () => {
  events.value.emit("getLoginStatus-resp", loginStatus.value)
});
events.value.on("yourUserEdited", newUser => {
  loginStatus.value = newUser.user;
});
let showLoginScreen = ref(false);
router.beforeEach(async guard => {
  // Logs in with the token provided in the ?useToken= query
  if (guard.query.useToken) {
    console.log("Using token from query.");
    if (loginStatus.value?.username) {
      console.log("Already logged in, ignoring token.")
      return;
    }
    console.log("Checking if connected...")
    console.time();
    if (!connected.value) await events.value.awaitEvent("connected");
    console.timeEnd();
    console.log("Readystate is", ws.value.readyState)
    console.log("Connected, logging in...");
    token.value = guard.query.useToken as string;
    login();
    console.log("Token used, removing from query.");
    router.push({
      path: guard.path,
      hash: guard.hash,
      query: { ...guard.query, useToken: undefined }
    });
    console.log("DONE");
  }
});

let serverStatuses = ref({} as ServerStatuses);
provide("statuses", serverStatuses);
provide("setServerStatuses", (v: any) => serverStatuses.value = v);
event.on("getAllServers", data => {
  serverStatuses.value = data.statuses;
});
</script>

<template>
  <Navbar :events="events" :login-status="loginStatus" @logout="logout" />
  <span v-if="!connected">Connecting to server...</span>
  <div v-else-if="loginStatus?.username">
    <RouterView></RouterView>
    <div class="notification" v-for="notification in notifications">
      {{ notification }}
    </div>
  </div>
  <div v-else>
    <form @submit.prevent="login" v-if="!loginStatus && showLoginScreen">
      <input type="password" placeholder="Token" v-model="token" class="login-token-input" />
      <p v-if="loginMsg">{{ loginMsg }}</p>
      <button type="submit">Login</button>
    </form>
    <p v-else>Logging in...</p>
  </div>
</template>