<script setup>
import { ref } from "vue";
import router from "../router";
import DynamicStyle from "../components/DynamicStyle.vue";

const email = ref("");
const password = ref("");
const errorMessage = ref("");

const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

const login = () => {
  errorMessage.value = "";

  if (!email.value || !password.value) {
    errorMessage.value = "Gelieve alle velden in te vullen.";
    return;
  }

  fetch(`${baseURL}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.value,
      password: password.value,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Login failed");
      }
      return response.json();
    })
    .then((data) => {
      if (data.status === "success") {
        localStorage.setItem("jwtToken", data.data.token);
        const decodedToken = JSON.parse(atob(data.data.token.split(".")[1]));
        const userRole = decodedToken.role;
        if (userRole === "partner_admin" || userRole === "partner_owner") {
          router.push("/admin");
        } else {
          errorMessage.value = "Geen toegang tot de admin sectie.";
        }
        if (userRole === "platform_admin") {
          router.push("/admin/partners");
        }
      } else {
        errorMessage.value = data.message || "Inloggen mislukt.";
      }
    })
    .catch((error) => {
      errorMessage.value = "Er is een fout opgetreden. Probeer het opnieuw.";
    });
};
</script>

<template>
  <DynamicStyle />
  <div class="container">
    <div class="overlay">
      <div class="elements">
        <h1>Welcome back</h1>
        <form>
          <div class="column">
            <label for="email">Email</label>
            <input
              id="email"
              v-model="email"
              type="text"
              placeholder="johndoe@gmail.com"
            />
          </div>

          <div class="column">
            <label for="password">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="●●●●●●●●"
              @focus="showPlaceholder = false"
              @blur="showPlaceholder = password === ''"
            />
          </div>

          <div class="row">
            <div class="rememberMe">
              <input type="checkbox" id="rememberMeCheckbox" />
              <label for="rememberMeCheckbox">Remember me</label>
            </div>

            <router-link exact to="./ForgotPassword">
              Forgot password?
            </router-link>
          </div>

          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

          <button class="btn active" type="submit" @click.prevent="login">
            Login
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  position: relative;
  background-image: url("../assets/images/background.jpg");
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  width: 100%;
  height: 100vh;
}

.overlay {
  background-color: rgba(0, 0, 0, 0.4);
  width: 100%;
  height: 100vh;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.elements {
  background-color: rgba(0, 0, 0, 0.32);
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
}

.row .rememberMe {
  visibility: hidden;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.row .rememberMe input {
  width: auto;
}

.row .rememberMe i,
.row a {
  color: rgba(255, 255, 255, 0.4);
}

.row a {
  text-decoration: underline;
}

.rememberMe label,
.row a {
  font-size: 14px;
}

label,
input {
  color: var(--text-color);
}

input {
  border: 1px solid rgba(255, 255, 255, 0.4);
  background-color: transparent;
  padding: 0.25rem 1rem;
  border-radius: 4px;
  width: 100%;
}

input::placeholder {
  color: rgba(255, 255, 255, 0.4);
  font-weight: 400;
}

.error {
  color: #d34848;
}

@media (min-width: 800px) {
  .elements {
    position: absolute;
    top: 50%;
    left: auto;
    right: 0;
    transform: translateY(-50%);
    width: 50%;
    padding: 3rem;
    margin: 3rem;
  }
}
</style>
