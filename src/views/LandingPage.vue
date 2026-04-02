<template>
  <div class="landing">
    <img :src="bg" class="bg" alt="background" />

    <div class="overlay"></div>

    <header class="header">
      <img :src="logo" alt="PinPoint Logo" class="logo" />
    </header>

    <main class="content">
      <h1>Welcome to PinPoint</h1>
      <p>Inventory Tracking System</p>

      <div class="buttons">
      <button class="btn login" @click="goLogin">Login</button>
      <button class="btn register" @click="goRegister">Register</button>

      </div>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import logo from "../assets/logo1.png";
import bg from "../assets/bg1.png";

const router = useRouter();

const goLogin = () => {
  router.push("/login");
};

const goRegister = () => {
  router.push("/register");
};

</script>

<style>

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: "Segoe UI", sans-serif;
}

.landing {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.bg {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 1;
}

.header {
  position: absolute;
  top: 40px;
  left: 40px;
  z-index: 2;
}

.logo {
  width: 16%;
}

.content {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  text-align: center;
}

.content h1 {
  font-size: 4.2rem;
  font-weight: 600;
  margin-bottom: 10px;
  font-family: 'Poppins', sans-serif;
}

.content p {
  font-size: 1.6rem;
  opacity: 0.9;
  margin-bottom: 40px;
}

.buttons {
  display: flex;
  gap: 90px;
}

.btn {
  padding: 12px 60px;
  border-radius: 30px;
  font-size: 1.2rem;
  cursor: pointer;
  border: none;

  transition: 
  transform 0.25s ease,
  box-shadow 0.25s ease,
  background 0.25s ease,
  color 0.25s ease;
}

.btn.login {
  background: transparent;
  border: 1px solid white;
  color: rgb(255, 255, 255);
}

.btn.register {
  background: transparent;
  border: 1px solid white;
  color: white;
}

.btn:hover {
  background: white;
  color: black;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.6);
  transform: scale(1.03);
  transform: scale(1.12) translateY(-2px);
}
</style>
