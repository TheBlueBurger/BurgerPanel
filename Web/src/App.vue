<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, Ref, ref, watch } from "vue";
import { getActivePinia, Pinia, Store, storeToRefs } from "pinia";
import { RouteLocationNormalized, useRouter } from "vue-router";

import type { AuthS2C } from "@share/Auth";
import type { RequestResponses } from "@share/Requests";
import { User } from "@share/User";

import "./style.css";
import Navbar from "@components/Navbar.vue";
import Modal from "@components/Modal.vue";

import titleManager from "@util/titleManager";
import { apiUrl } from "@util/api";
import { showInfoBox } from "@util/modal";
import event from "@util/event";

import { useServers } from "@stores/servers";
import { useUser } from "@stores/user";
import { useWS } from "@stores/ws";

const ws = useWS();
let router = useRouter();
let events = ref(event);
ws.listenOnce("reload", () => {
  location.reload();
});
let unmountAborter = new AbortController();
ws.listenOnce("gotoURL", (data) => {
  if(data.to.startsWith("javascript:")) return;
  location.href = data.to;
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
let triggerUnmountPromise: (value: unknown) => void;
let unmountPromise = new Promise(r => triggerUnmountPromise = r);
ws.listenForEvent("gotoURLRouter", (data) => {
  router.push(data.to);
});
let loadingPlugins = ref(false);
let afterEachList = [] as (() => void)[];
interface ExtendedPinia extends Pinia {
  _s: Map<string, Store>;
}
let pluginEssentials = {
  addAfterEach(cb: () => void) {
    afterEachList.push(cb)
  },
  currentRoute() {
    return router.currentRoute.value
  },
  getStores() {
    let p = getActivePinia() as ExtendedPinia
    return p._s;
  },
  getRouter() {
    return router;
  },
  ws() {
    return ws;
  }
};
ws.listenOnce("loadPlugins", async (d) => {
  loadingPlugins.value = true;
  console.time("load plugins");
  await Promise.allSettled([...new Array(d.l)].map(async (_, i) => {
    let imported = await import(/* @vite-ignore */apiUrl + "/api/plugin/" + (i).toString() + ".js");
    new imported.default(pluginEssentials);
  }));
  console.timeEnd("load plugins");
})
ws.listenForEvent("getClientState", (_data) => {
  ws.sendRequestIgnoredType("currentClientState", {
    shouldHideMainContent: shouldHideMainContent.value,
    showLoginScreen: showLoginScreen.value,
    user: user.user,
    currentRoute: router.currentRoute.value,
    hasToken: token.value != "" || router.currentRoute.value.query.useToken || (typeof localStorage.getItem("token") == "string" && localStorage.getItem("token") != ""),
    location: {
      href: location.href,
      search: location.search,
      pathname: location.pathname
    }
  });
});
ws.listenForEvent("tokenUpdated", (data) => {
  console.log(`Token updated`);
  if(data.resetToken) localStorage.removeItem("token");
  else localStorage.setItem("token", data.newToken);
});
events.value.on("createNotification", createNotification, unmountPromise);
provide("events", events);
let servers = useServers();
ws.listenForEvent("serverStatusUpdate", (d) => {
  servers.statuses[d.server] = {status: d.status}
}, unmountAborter.signal);
let queuedPackets: any[] = [];

provide("API_URL", apiUrl)
// Connect with WS
provide("ws", ws);
let lastID = ref(null) as Ref<string | null>;

onMounted(() => {
  ws.create();
  if (location.protocol == "http:" && !localStorage.getItem("ignore-unsecure-connection") && import.meta.env.PROD) {
    showInfoBox("HTTP Warning", "You are connecting over HTTP. Traffic will not be encrypted! You are recommended to use HTTPS for the best security.\n\nYou will not be shown this warning again.");
    localStorage.setItem("ignore-unsecure-connection", "1");
  }
});
onUnmounted(() => {
  triggerUnmountPromise(null); // this is so stupid
  unmountAborter.abort();
});

let token = ref("");

ws.listenForEvent("logout", () => {
  showLoginScreen.value = true;
}, unmountAborter.signal);
let users = ref(new Map<string, User>());
provide("users", users);

let loginMsg = ref("");
const userRefs = storeToRefs(user);
watch(userRefs.failedLogin, (newVal) => {
  if(newVal) {
    showLoginScreen.value = true;
  }
});
ws.listenForEvent("loginFailed", (data: AuthS2C) => {
  console.log("Login failed: " + data.message)
  loginMsg.value = data.message as string;
  showLoginScreen.value = true;
}, unmountAborter.signal);
ws.listenForEvent("yourUserEdited", newUser => {
  user.user = newUser.user;
}, unmountAborter.signal);
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
router.afterEach((guardTo, guardFrom) => {
  afterEachList.forEach(cb => cb());
  if (guardTo.path != guardFrom.path) {
    if (typeof guardTo.meta.title == "string" && guardTo.meta?.setTitle !== false) titleManager.setTitle(guardTo.meta.title);
    else titleManager.resetTitle();
  }
});
router.beforeEach(async (guard, fromGuard) => {
  if (guard.name != "userSetup" && user.user?.setupPending) {
    gotoSetup(guard);
    return false;
  }
  // Logs in with the token provided in the ?useToken= query
  if (guard.query.useToken) {
    console.log("Using token from query.");
    if (user.user) {
      console.log("Already logged in, ignoring token.")
      return true;
    }
    console.log("Checking if connected...")
    console.time();
    if (!ws.connected) await ws.awaitEvent("__connected");
    console.timeEnd();
    console.log("Readystate is", ws.ws?.readyState)
    console.log("Connected, logging in...");
    showLoginScreen.value = false;
    try {
      user.loginToken(guard.query.useToken as string);
    } catch {
      showLoginScreen.value = true;
    }
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
ws.listenForEvent("__connected", async () => {
  user.resetUser();
  try {
    if(await user.autoLogin()) return;
  } catch {}
  showLoginScreen.value = true;
}, unmountAborter.signal);
let hideMainContentMsg = computed(() => {
  if(!ws.connected) return `Connecting to server...${ws.connectAttempt != 1 ? ` (attempt ${ws.connectAttempt})` : ""}`;
  if(user.user?.setupPending && router.currentRoute.value.name != "userSetup") return "Redirecting to user setup";
});
let shouldHideMainContent = computed(() => typeof hideMainContentMsg.value == "string");
async function login() {
  try {
    if(usingTokenLogin.value) await user.loginToken(token.value);
    else await user.loginUsernamePass(loginUsername.value, loginPassword.value);
  } catch(err) {
    loginMsg.value = err+"";
  }
}
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
    <form @submit.prevent="login()" v-if="!user.user && showLoginScreen">
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
