<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, Ref, ref } from "vue";
import type { AuthS2C } from "@share/Auth";
import { User } from "@share/User";
import { useUser } from "./stores/user";
import EventEmitter from "@util/event";
import sendRequest from "@util/request";
import "./style.css";
import Navbar from "@components/Navbar.vue";
import { RouteLocationNormalized, useRouter } from "vue-router";
import event from "@util/event";
import type { RequestResponses } from "@share/Requests";
import titleManager from "@util/titleManager";
import Modal from "@components/Modal.vue";
import { showInfoBox } from "@util/modal";
import { useServers } from "./stores/servers";

let router = useRouter();
let events = ref(EventEmitter);
event.once("reload", () => {
  location.reload();
});
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
const user = useUser();
events.value.on("createNotification", createNotification);
provide("events", events);
let servers = useServers();
events.value.on("serverStatusUpdate", (d) => {
  servers.statuses[d.server] = {status: d.status}
})
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
provide("API_URL", API_URL)
let connected = ref(false);
// Connect with WS
let ws: Ref<WebSocket> = ref() as Ref<WebSocket>;
provide("ws", ws);
let lastID = ref(null) as Ref<string | null>;
let pingInterval: number;
onMounted(() => {
  pingInterval = setInterval(() => { // if we're using cloudflare, we need to ping in order to make cloudflare not explode
    if (connected.value) {
      sendRequest("ping")
    }
  }, 30_000);
  if (location.protocol == "http:" && !localStorage.getItem("ignore-unsecure-connection") && import.meta.env.PROD) {
    showInfoBox("HTTP Warning", "You are connecting over HTTP. Traffic will not be encrypted! You are recommended to use HTTPS for the best security.\n\nYou will not be shown this warning again.");
    localStorage.setItem("ignore-unsecure-connection", "1");
  }
});
onUnmounted(() => {
  clearInterval(pingInterval);
  ws.value.close();
});
function initWS() {
  if(ws.value?.readyState == WebSocket.OPEN) return;
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
    user.user = undefined;
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
async function login(usingTokenOverride: boolean = false) {
  let authResp: void | RequestResponses["auth"];
  if (usingTokenLogin.value || usingTokenOverride) {
    authResp = await sendRequest("auth", {
      token: token.value
    }, false).catch((err) => {
      loginMsg.value = err;
      showLoginScreen.value = true;
    });
  } else {
    authResp = await sendRequest("auth", {
      username: loginUsername.value,
      password: loginPassword.value
    }, false).catch((err) => {
      loginMsg.value = err;
      showLoginScreen.value = true;
    })
  }
  if (!authResp) {
    showLoginScreen.value = true;
    return;
  }
  if (!authResp.user) {
    console.log("User doesn't exist, but login was successful. Probably already authenticated.");
    return;
  }
  user.user = authResp.user;
  console.log("Logged in as " + authResp.user.username);
  localStorage.setItem("token", authResp.user.token);
  let servers = useServers();
  if (authResp.servers) servers.addServers(authResp.servers);
  if (lastID.value != authResp.user._id) createNotification("Welcome, " + authResp.user.username + "!");
  lastID.value = authResp.user._id;
  if (authResp.statuses) servers.addStatuses(authResp.statuses);
  queuedPackets.forEach(queuedPacket => {
    console.log("Sending queued request", queuedPacket)
    ws.value.send(JSON.stringify(queuedPacket));
  });
  queuedPackets = [];
}
let token = ref("");

events.value.on("logout", () => {
  showLoginScreen.value = true;
});
let users = ref(new Map<string, User>());
provide("users", users);

let loginMsg = ref("");
events.value.on("loginFailed", (data: AuthS2C) => {
  console.log("Login failed: " + data.message)
  loginMsg.value = data.message as string;
  showLoginScreen.value = true;
});
events.value.on("yourUserEdited", newUser => {
  user.user = newUser.user;
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
  if (guard.path != fromGuard.path) {
    if (typeof guard.meta.title == "string") titleManager.setTitle(guard.meta.title);
    else titleManager.resetTitle();
  }
  if (guard.name != "userSetup" && user.user?.setupPending) {
    gotoSetup(guard);
  }
  // Logs in with the token provided in the ?useToken= query
  if (guard.query.useToken) {
    console.log("Using token from query.");
    if (user.user) {
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

user.$subscribe((_, newUser) => {
  if(newUser.user?.setupPending) {
    setTimeout(() => gotoSetup(), 100); // stupid hack
  }
})
let usingTokenLogin = ref(false);
let loginUsername = ref("");
let loginPassword = ref("");
let hideMainContentMsg = computed(() => {
  if(user.user?.setupPending && router.currentRoute.value.name != "userSetup") return "Redirecting to user setup";
});
let shouldHideMainContent = computed(() => typeof hideMainContentMsg.value == "string")
</script>

<template>
  <Navbar />
  <Modal :__is-default-modal="true" />
  <div id="login-div" v-if="shouldHideMainContent">
    {{ hideMainContentMsg }}
  </div>
  <div v-else-if="user.user">
    <RouterView v-slot="{ Component }">
      <template v-if="Component">
          <Suspense>
            <!-- main content -->
            <component :is="Component" v-if="!shouldHideMainContent"></component>
            <!-- loading state -->
            <template #fallback>
              <div id="login-div">
                Loading '{{ router.currentRoute.value.meta.title ?? router.currentRoute.value.name ??
                router.currentRoute.value.path }}'...
            </div>
          </template>
        </Suspense>
      </template>
    </RouterView>
    <div class="notification" v-for="notification in notifications">
      {{ notification }}
    </div>
  </div>
  <div v-else id="login-div">
    <span v-if="!connected">Connecting to server...</span>
    <form @submit.prevent="login(false)" v-else-if="!user.user && showLoginScreen">
      <h1>Login</h1>
      <br />
      <div v-if="usingTokenLogin">
        <input type="password" placeholder="Token" v-model="token" class="login-token-input" />
      </div>
      <div v-else>
        <input type="text" placeholder="Username" v-model="loginUsername">
        <input type="password" placeholder="Password" v-model="loginPassword">
      </div>
      <p v-if="loginMsg">{{ loginMsg }}</p>
      <button type="submit">Login</button>
      <br />
      <a href="#" @click.prevent="usingTokenLogin = !usingTokenLogin">Log in with {{ usingTokenLogin ? "username and password" : "token" }} instead</a>
    </form>
    <p v-else>Logging in...</p>
  </div>
</template>
