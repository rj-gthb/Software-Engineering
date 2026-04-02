import { createRouter, createWebHistory } from 'vue-router';
import { isAuthenticated } from '../lib/auth';
import LandingPage from '../views/LandingPage.vue';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';
import ForgotPassword from '../views/ForgotPassword.vue';
import DashboardHome from '../views/DashboardHome.vue';
import Dashboard from '../views/Dashboard.vue';
import OrderRecords from '../views/OrderRecords.vue';
import HistoryRecords from '../views/HistoryRecords.vue';
import ReportsIssues from '../views/ReportsIssues.vue';
import UserManagement from '../views/UserManagement.vue';

const routes = [
  { path: '/', component: LandingPage },
  { path: '/login', component: Login, meta: { guestOnly: true } },
  { path: '/register', component: Register, meta: { guestOnly: true } },
  { path: '/forgot-password', component: ForgotPassword, meta: { guestOnly: true } },
  {
    path: '/dashboard',
    component: Dashboard,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'DashboardHome', component: DashboardHome },
      { path: 'order-records', name: 'OrderRecords', component: OrderRecords },
      { path: 'history-records', name: 'HistoryRecords', component: HistoryRecords },
      { path: 'reports-issues', name: 'ReportsIssues', component: ReportsIssues },
      { path: 'user-management', name: 'UserManagement', component: UserManagement },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const authenticated = isAuthenticated();

  if (to.matched.some((record) => record.meta.requiresAuth) && !authenticated) {
    return '/login';
  }

  if (to.matched.some((record) => record.meta.guestOnly) && authenticated) {
    return '/dashboard';
  }

  return true;
});

export default router;
