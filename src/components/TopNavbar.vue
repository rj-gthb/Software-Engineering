<template>
  <header class="top-navbar">
    <div class="spacer"></div>

    <div class="admin-wrapper">
      <button class="admin-btn" @click="toggleMenu">
        {{ userLabel }} v
      </button>

      <div v-if="showMenu" class="admin-menu">
        <p class="menu-name">{{ fullName }}</p>
        <p class="menu-role">{{ roleLabel }}</p>
        <button class="menu-item" @click="handleLogout">Logout</button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { clearAuthSession, getCurrentUser } from '../lib/auth';

const router = useRouter();
const showMenu = ref(false);
const currentUser = ref(getCurrentUser());

const userLabel = computed(() => currentUser.value?.userId ?? 'Account');
const fullName = computed(() => currentUser.value?.fullName ?? 'Signed in user');
const roleLabel = computed(() => currentUser.value?.role ?? 'staff');

function syncUser() {
  currentUser.value = getCurrentUser();
}

function toggleMenu() {
  showMenu.value = !showMenu.value;
}

async function handleLogout() {
  clearAuthSession();
  showMenu.value = false;
  await router.push('/login');
}

onMounted(() => {
  window.addEventListener('auth-session-changed', syncUser);
});

onUnmounted(() => {
  window.removeEventListener('auth-session-changed', syncUser);
});
</script>

<style scoped>
.top-navbar {
  height: 56px;
  background: #ffffff;
  display: flex;
  align-items: center;
  padding: 0;
  box-shadow: none;
  position: relative;
  top: 0;
  z-index: 1200;
  isolation: isolate;
}

.spacer {
  flex: 1;
}

.admin-wrapper {
  position: relative;
  margin-right: 24px;
  z-index: 1;
}

.admin-btn {
  background: #f4f6f8;
  border: 1px solid #000;
  padding: 8px 14px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  color: #000;
}

.admin-menu {
  position: absolute;
  top: 44px;
  right: 0;
  width: 220px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 14px;
  border: 1px solid #e5e5e5;
  z-index: 20;
}

.menu-name {
  margin: 0;
  color: #000;
  font-weight: 600;
}

.menu-role {
  margin: 4px 0 12px;
  color: #666;
  font-size: 13px;
  text-transform: capitalize;
}

.menu-item {
  width: 100%;
  border: 1px solid #000;
  background: #fff;
  color: #000;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  z-index: 1;
}
</style>

