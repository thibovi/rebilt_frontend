<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";

// Bepaal de basis-URL op basis van de omgeving
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

const jwtToken = localStorage.getItem("jwtToken");
const router = useRouter();

// Redirect naar login als er geen token is
if (!jwtToken) {
  router.push("/login");
}

const firstname = ref("");
const lastname = ref("");
const email = ref("");
const password = ref("");
const role = ref("customer");
const status = ref("active");
const partner = ref(""); // Dit wordt de gekozen partner
const country = ref("");
const city = ref("");
const postalCode = ref("");
const profileImage = ref("");
const bio = ref("");
const partners = ref([]); // Lijst van partners

const isValidEmail = (email) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
};

// Haal de partners op bij het laden van de component
onMounted(async () => {
  try {
    const response = await fetch(`${baseURL}/partners`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Fout bij het ophalen van partners");
    }

    const data = await response.json();
    partners.value = data.data.partners || []; // Zorg ervoor dat we de juiste gegevens gebruiken
  } catch (error) {
    console.error("Error fetching partners:", error.message);
    alert("Er is een fout opgetreden bij het ophalen van de partners.");
  }
});

const addUser = async () => {
  if (
    !firstname.value ||
    !lastname.value ||
    !email.value ||
    !password.value ||
    !role.value ||
    !status.value
  ) {
    alert("Vul alle velden in.");
    return;
  }

  if (!isValidEmail(email.value)) {
    alert("Vul een geldig e-mailadres in.");
    return;
  }

  try {
    const userPayload = {
      user: {
        firstname: firstname.value,
        lastname: lastname.value,
        email: email.value,
        password: password.value,
        role: role.value,
        activeUnactive: status.value,
      },
    };

    // Voeg alleen optionele velden toe als ze niet leeg zijn
    if (partner.value) userPayload.user.partner = partner.value;
    if (country.value) userPayload.user.country = country.value;
    if (city.value) userPayload.user.city = city.value;
    if (postalCode.value) userPayload.user.postalCode = postalCode.value;
    if (profileImage.value) userPayload.user.profileImage = profileImage.value;
    if (bio.value) userPayload.user.bio = bio.value;

    const userResponse = await fetch(`${baseURL}/users/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(userPayload),
    });

    if (!userResponse.ok) {
      const errorDetail = await userResponse.json();
      throw new Error(
        `Fout bij het toevoegen van de gebruiker: ${errorDetail.message}`
      );
    }

    const userResult = await userResponse.json();

    // Navigeer naar gebruikerspagina
    router.push("/admin/users");
  } catch (error) {
    console.error("Error adding user or creating house style:", error.message);
    alert(
      "Er is een fout opgetreden bij het toevoegen van de gebruiker of het aanmaken van de huisstijl. Controleer de console voor details."
    );
  }
};
</script>

<template>
  <DynamicStyle />
  <Navigation />
  <div class="content">
    <h1>Add new user</h1>
    <form @submit.prevent="addUser">
      <!-- Vereiste velden -->
      <div class="row">
        <div class="column">
          <label for="firstname">First Name:</label>
          <input v-model="firstname" id="firstname" type="text" required />
        </div>
        <div class="column">
          <label for="lastname">Last Name:</label>
          <input v-model="lastname" id="lastname" type="text" required />
        </div>
      </div>
      <div class="row">
        <div class="column">
          <label for="email">Email:</label>
          <input v-model="email" id="email" type="email" required />
        </div>
        <div class="column">
          <label for="password">Password:</label>
          <input v-model="password" id="password" type="password" required />
        </div>
      </div>
      <div class="row">
        <div class="column">
          <label for="role">Role:</label>
          <select v-model="role" id="role" required>
            <option value="customer">Customer</option>
            <option value="partner_admin">Partner Admin</option>
            <option value="partner_owner">Partner Owner</option>
            <option value="platform_admin">Platform Admin</option>
          </select>
        </div>
        <div class="column">
          <label for="status">Status:</label>
          <select v-model="status" id="status" required>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <!-- Optionele velden -->
      <div class="row">
        <div class="column">
          <label for="partner">Partner (optioneel):</label>
          <select v-model="partner" id="partner">
            <option value="">Selecteer een partner</option>
            <option
              v-for="partner in partners"
              :key="partner._id"
              :value="partner.name"
            >
              {{ partner.name }}
            </option>
          </select>
        </div>
        <div class="column">
          <label for="country">Country (optioneel):</label>
          <input v-model="country" id="country" type="text" />
        </div>
      </div>
      <div class="row">
        <div class="column">
          <label for="city">City (optioneel):</label>
          <input v-model="city" id="city" type="text" />
        </div>
        <div class="column">
          <label for="postalCode">Postal Code (optioneel):</label>
          <input v-model="postalCode" id="postalCode" type="text" />
        </div>
      </div>
      <div class="row">
        <div class="column">
          <label for="profileImage">Profile Image URL (optioneel):</label>
          <input v-model="profileImage" id="profileImage" type="text" />
        </div>
        <div class="column">
          <label for="bio">Bio (optioneel):</label>
          <textarea v-model="bio" id="bio" rows="4"></textarea>
        </div>
      </div>

      <!-- Submit button -->
      <button type="submit" class="btn active">Add user</button>
    </form>
  </div>
</template>

<style scoped>
.content {
  width: 100%;
  margin-bottom: 72px;
}

form {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
  width: 100%;
}

form .row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

form .column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

input,
select {
  padding: 8px;
  margin-bottom: 16px;
  border-radius: 4px;
  border: 1px solid var(--gray-700);
  background-color: var(--gray-700);
  color: white;
}

button {
  color: white;
  cursor: pointer;
}

@media (min-width: 768px) {
  .content {
    margin: 0;
  }

  form .row {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: 120px;
    width: 100%;
  }
}
</style>
