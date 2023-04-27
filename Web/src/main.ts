// if vscode is screaming here, it's fine. its just vscode being stupid
import { createApp } from 'vue'
import './style.css'
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: () => import('./pages/Home.vue'),
            name: "Home"
        },
        {
            path: "/manage/user/:user/permissions",
            component: () => import("./pages/UserManagement/Permissions.vue"),
            props: true,
            name: "editUserPermissions"
        },
        {
            path: '/manage/server/:server',
            component: () => import('./pages/Management/ManageServer.vue'),
            props: true,
            name: 'manageServer'
        },
        {
            path: '/manage/server/:server/edit',
            component: () => import('./pages/Management/Edit.vue'),
            props: true,
            name: 'editServer'
        },
        {
            path: '/manage/server/:server/logs',
            component: () => import('./pages/Management/OldLogs.vue'),
            props: true,
            name: 'viewLogs'
        },
        {
            path: '/manage/server/:server/edit/user-access/:user',
            component: () => import('./pages/Management/EditServerAccess.vue'),
            props: true,
            name: "editServerAccess"
        },
        {
            path: '/manage/server/:server/edit/files',
            component: () => import('./pages/Management/ServerFiles.vue'),
            props: true,
            name: "serverFiles",
        },
        {
            path: '/manage/server/import',
            component: () => import('./pages/Management/Import.vue'),
            name: 'importServer'
        },
        {
            path: '/manage',
            component: () => import('./pages/ManageServers.vue'),
        },
        {
            path: '/settings',
            component: () => import('./pages/Settings.vue'),
        },
        {
            path: '/settings/logging',
            name: 'logging',
            component: () => import('./pages/Logging.vue')
        },
        {
            path: '/about',
            component: () => import('./pages/About.vue'),
        },
        {
            path: '/user-setup',
            name: "userSetup",
            component: () => import('./pages/UserSetup.vue')
        },
        {
            path: '/me',
            name: "MyUser",
            component: () => import("./pages/MyUser.vue")
        }
    ],
})
let app = createApp(App).use(router);
app.mount('#app');
