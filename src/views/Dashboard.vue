<template>
  <div class="dashboard-layout">
    <aside class="sidebar">
      <div class="logo">
  <img src="../assets/logo1.png" alt="Logo" />
 </div>

<nav class="nav">
  <router-link
    to="/dashboard"
    class="nav-item"
    exact-active-class="active"
    exact
  >
    Dashboard
  </router-link>
  
  <router-link
    to="/dashboard/order-records"
    class="nav-item"
    active-class="active"
  >
    Order Records
  </router-link>
  
  <router-link
    to="/dashboard/history-records"
    class="nav-item"
    active-class="active"
  >
    History Records
  </router-link>
  
  <router-link
    to="/dashboard/reports-issues"
    class="nav-item"
    active-class="active"
  >
    Reports / Issues
  </router-link>
  
  <router-link
    to="/dashboard/user-management"
    class="nav-item"
    active-class="active"
  >
    User Management
  </router-link>
</nav>

    </aside>

<main class="main">
  <TopNavbar />
  <div class="page-content">
    <router-view />
  </div>
</main>
  </div>
</template>

<script>
import TopNavbar from "../components/TopNavbar.vue";

export default {
  components: {
    TopNavbar,
  },
};
</script>

<style scoped>
.dashboard-layout {
  display: flex;
  height: 100vh;
  background: #f4f6f8;
  font-family: Inter, sans-serif;
}

.sidebar {
  width: 230px;
  background: #1f1f1f;
  color: #fff;
  display: flex;
  flex-direction: column;
}

.logo img {
  width: 62px;       
  height: auto;
  display: block;
  margin-left: 10px;
  margin-bottom: 2px;
  margin-top: 12px;
}

.nav {
  padding: 10px 0;
}

.nav-item {
  padding: 14px 20px;
  cursor: pointer;
  color: #bbb;
  display: block;
  text-decoration: none;
}

.nav-item:hover,
.nav-item.active {
  background: #ff6b00;
  color: #fff;
}

.main {
  flex: 1;
  padding: 0 0 20px;   
  overflow-y: auto;
}

.main > *:not(.top-navbar) {
  margin-top: 20px;
}
.page-content {
  padding: 0 30px;
}
</style>
