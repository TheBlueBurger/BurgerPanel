<script setup lang="ts">
import { onMounted, onUnmounted, provide, Ref, ref, watch } from "vue";
import type { Server } from "../../Share/Server.js";
import type { AuthS2C } from "../../Share/Auth.js";
import { User } from "../../Share/User";
import EventEmitter from "./util/event";
import sendRequest from "./util/request";
import "./style.css";
import Navbar from "./components/Navbar.vue";
import { Config } from "../../Share/Config";
import { _knownSettings } from "./util/config";
import { RouteLocationNormalized, useRouter } from "vue-router";
import { ServerStatuses } from '../../Share/Server';
import event from "./util/event";
import type {RequestResponses} from "../../Share/Requests";
import titleManager from "./util/titleManager";
import Modal from "./components/Modal.vue";
import { showInfoBox } from "./util/modal";

let router = useRouter();
let events = ref(EventEmitter);
event.once("reload", () => {
  location.reload();
})
let knownSettings = ref(_knownSettings) as Ref<{ [key in keyof Config]: any }>
let notifications = ref([] as string[]);
let notificationQueue: string[] = [];
function createNotification(text: string) {
  if (notifications.value.length != 0) return notificationQueue.push(text);
  notifications.value.push(text);
  setTimeout(() => {
    notifications.value = [];
    let nextNotification = notificationQueue.shift();
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
    console.log("Not connected, putting request in queue...")
    queuedPackets.push(data);
    return;
  }
  ws.value.send(JSON.stringify(data));
});
let API_URL: string;
if (import.meta.env.PROD) {
  API_URL = location.origin
} else {
  API_URL = "http://localhost:3001"
}
let connected = ref(false);
// Connect with WS
let ws: Ref<WebSocket> = ref() as Ref<WebSocket>;
provide("ws", ws);
let servers = ref([] as Server[]);
provide("servers", servers);
let lastID = ref(null) as Ref<string | null>;
let pingInterval: number;
onMounted(() => {
  pingInterval = setInterval(() => { // if we're using cloudflare, we need to ping in order to make cloudflare not explode
    if (connected.value) {
      sendRequest("ping")
    }
  }, 30_000);
  if(location.protocol == "http:" && !localStorage.getItem("ignore-unsecure-connection")) {
    showInfoBox("HTTP Warning", "You are connecting over HTTP. Traffic will not be encrypted! You are recommended to use HTTPS for the best security\nYou will not be shown this warning again.");
    localStorage.setItem("ignore-unsecure-connection", "1");
  }
});
onUnmounted(() => {
  clearInterval(pingInterval);
  ws.value.close();
});
function initWS() {
  ws.value = new WebSocket(API_URL.replace("http", "ws"));
  ws.value.addEventListener("open", () => {
    connected.value = true;
    console.log("open event: connected with readystate " + ws.value.readyState)
    events.value.emit("connected");
    queuedPackets = [];
    if (localStorage.getItem("token")) {
      token.value = localStorage.getItem("token") || "";
      login(true);
    } else {
      showLoginScreen.value = true;
    }
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
    events.value.emit(data.r, data);
    events.value.emit(data.n, data);
    if (data.emits) {
      for (let emit of data.emits) {
        events.value.emit(emit, data);
      }
    }
  });
}

initWS();
async function login(usingToken: boolean = false) {
  let authResp: void | RequestResponses["auth"];
  if(usingTokenLogin.value || usingToken) {
    authResp = await sendRequest("auth", {
      token: token.value
    }).catch((err) => {
      loginMsg.value = err;
      showLoginScreen.value = true;
    });
  } else {
    authResp = await sendRequest("auth", {
      username: loginUsername.value,
      password: loginPassword.value
    })
  }
  if(!authResp) {
    showLoginScreen.value = true;
    return;
  }
  if (!authResp.user) {
    console.log("User doesn't exist, but login was successful. Probably already authenticated.");
    return;
  }
  loginStatus.value = authResp.user;
  console.log("Logged in as " + authResp.user.username);
  localStorage.setItem("token", authResp.user.token);
  if(authResp.servers) servers.value = authResp.servers;
  if (lastID.value != authResp.user._id) createNotification("Welcome, " + authResp.user.username + "!");
  lastID.value = authResp.user._id;
  if (authResp.statuses) serverStatuses.value = authResp.statuses;
  queuedPackets.forEach(queuedPacket => {
  console.log("Sending queued request", queuedPacket)
    ws.value.send(JSON.stringify(queuedPacket));
  });
}
let token = ref("");
let loginStatus: Ref<User | null> = ref() as Ref<User | null>;
provide("loginStatus", loginStatus);

function logout() {
  localStorage.removeItem("token");
  events.value.emit("logout");
  servers.value = [];
  loginStatus.value = null;
  sendRequest("logout");
  showLoginScreen.value = true;
}
events.value.on("requestLogout", () => {
  logout();
});
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
function gotoSetup(_currentRoute?: RouteLocationNormalized) {
  let currentRoute = _currentRoute ?? router.currentRoute.value;
  if (currentRoute.name == "userSetup") return;
  let shouldHaveCB = currentRoute.name ? currentRoute.name.toString() != "userSetup" : true;
  router.push({
    name: "userSetup",
    query: {
      cb: shouldHaveCB ? currentRoute.fullPath : undefined
    }
  })
}
router.beforeEach(async (guard, fromGuard) => {
  if(guard.path != fromGuard.path) {
    if(typeof guard.meta.title == "string") titleManager.setTitle(guard.meta.title);
    else titleManager.resetTitle();
  }
  if (guard.name != "userSetup" && loginStatus.value?.setupPending) {
    gotoSetup(guard);
  }
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
    showLoginScreen.value = false;
    login(true);
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
event.on("serverStatusUpdate", d => {
  serverStatuses.value[d.server] = {
    status: d.status
  }
})
event.on("getAllServers", data => {
  serverStatuses.value = data.d.statuses;
});
watch(loginStatus, l => {
  if (l?.setupPending) {
    setTimeout(() => gotoSetup(), 100); // i know this is stupid
  }
});
let usingTokenLogin = ref(false);
let loginUsername = ref("");
let loginPassword = ref("");
</script>

<template>
  <Navbar />
  <Modal :__is-default-modal="true" />
  <div v-if="loginStatus?.username">
    <RouterView></RouterView>
    <div class="notification" v-for="notification in notifications">
      {{ notification }}
    </div>
  </div>
  <div v-else id="login-div">
      <span v-if="!connected">Connecting to server...</span>
      <form @submit.prevent="login(false)" v-else-if="!loginStatus && showLoginScreen">
        <h1>Login</h1>
        <br/>
        <div v-if="usingTokenLogin">
          <input type="password" placeholder="Token" v-model="token" class="login-token-input" />
        </div>
        <div v-else>
          <input type="text" placeholder="Username" v-model="loginUsername">
          <input type="password" placeholder="Password" v-model="loginPassword">
        </div>
        <p v-if="loginMsg">{{ loginMsg }}</p>
        <button type="submit">Login</button>
        <br/>
        <a href="#" @click.prevent="usingTokenLogin = !usingTokenLogin">Log in with {{ usingTokenLogin ? "username and password" : "token" }} instead</a>
      </form>
    <p v-else>Logging in...</p>
  </div>
</template>
