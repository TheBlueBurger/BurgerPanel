// if vscode is screaming here, it's fine. its just vscode being stupid
import { createApp } from 'vue'
import './style.css'
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia } from 'pinia';
let pinia = createPinia();
import App from './App.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: () => import('./pages/Home.vue'),
            name: "Home",
            meta: {
                title: "Home"
            }
        },
        {
            path: "/manage/user/:user/permissions",
            component: () => import("./pages/UserManagement/Permissions.vue"),
            props: true,
            name: "editUserPermissions",
            meta: {
                title: "User Permissions",
                setTitle: false
            }
        },
        {
            path: '/manage/server/:server',
            component: () => import('./pages/Management/ManageServer.vue'),
            props: true,
            name: 'manageServer',
            meta: {
                title: "Server Console",
                setTitle: false
            }
        },
        {
            path: '/manage/server/:server/edit',
            component: () => import('./pages/Management/Edit.vue'),
            props: true,
            name: 'editServer',
            meta: {
                title: "Edit server",
                setTitle: false
            }
        },
        {
            path: '/manage/server/:server/logs',
            component: () => import('./pages/Management/OldLogs.vue'),
            props: true,
            name: 'viewLogs',
            meta: {
                title: "Server logs",
                setTitle: false
            }
        },
        {
            path: '/manage/server/:server/edit/user-access/:user',
            component: () => import('./pages/Management/EditServerAccess.vue'),
            props: true,
            name: "editServerAccess",
            meta: {
                title: "Server Access",
                setTitle: false
            }
        },
        {
            path: '/manage/server/:server/edit/files',
            component: () => import('./pages/Management/ServerFiles.vue'),
            props: true,
            name: "serverFiles",
            meta: {
                title: "Server Files",
                setTitle: false
            }
        },
        {
            path: '/manage/server/import',
            component: () => import('./pages/Management/Import.vue'),
            name: 'importServer',
            meta: {
                title: "Import server"
            }
        },
        {
            path: '/manage/server/:server/edit/plugins',
            component: () => import('./pages/Management/DownloadPlugins.vue'),
            props: true,
            name: 'downloadPlugins',
            meta: {
                title: "Download plugins",
                setTitle: false
            }
        },
        {
            path: '/manage',
            component: () => import('./pages/ManageServers.vue'),
            meta: {
                title: "Servers"
            }
        },
        {
            path: '/settings',
            component: () => import('./pages/Settings.vue'),
            meta: {
                title: "Settings"
            }
        },
        {
            path: '/settings/logging',
            name: 'logging',
            component: () => import('./pages/Logging.vue'),
            meta: {
                title: "Logging Settings"
            }
        },
        {
            path: '/about',
            component: () => import('./pages/About.vue'),
            meta: {
                title: "About"
            }
        },
        {
            path: '/user-setup',
            name: "userSetup",
            component: () => import('./pages/UserSetup.vue'),
            meta: {
                title: "User Setup"
            }
        },
        {
            path: '/me',
            name: "MyUser",
            component: () => import("./pages/MyUser.vue"),
            meta: {
                title: "Me"
            }
        },
        {
            name: "Debug",
            path: '/debug',
            component: () => import("./pages/Debug.vue"),
            meta: {
                title: "Debug"
            }
        },
        {
            name: "integrator",
            path: "/manage/server/:server/edit/integrator",
            props: true,
            component: () => import("./pages/Management/Integrator.vue"),
            meta: {
                setTitle: false,
                title: "Integrator Options"
            }
        },
        {
            name: "404",
            path: '/:pathMatch(.*)*',
            component: () => import("./pages/404.vue"),
            meta: {
                title: "404 Not Found"
            }
        }
    ],
})
let app = createApp(App).use(router).use(pinia);
app.mount('#app');
