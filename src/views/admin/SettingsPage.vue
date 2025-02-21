<script setup>
import { ref, reactive, onMounted, watch, provide } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import Navigation from "../../components/navComponent.vue";
import DynamicStyle from "../../components/DynamicStyle.vue";

// Router setup
const router = useRouter();

// Reactive user object to store user details (gebruik reactive voor betere reactiviteit)
const user = reactive({
  firstName: "",
  lastName: "",
  email: "",
  newEmail: "",
  oldEmail: "",
  password: "",
  newPassword: "",
  oldPassword: "",
  newPasswordRepeat: "",
  country: "",
  city: "",
  postalCode: "",
  profilePicture: "",
  bio: "",
  role: "",
  activeUnactive: true,
});

// Authentication and token handling
const token = localStorage.getItem("jwtToken");
if (!token) {
  router.push("/login");
}

const parseJwt = (token) => {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(jsonPayload);
};

const tokenPayload = parseJwt(token); // Gebruik hier het token dat je hebt
const userId = tokenPayload?.userId;
const partnerId = tokenPayload?.companyId;
const showSaveButton = ref(false);

const onConfigurationChange = () => {
  showSaveButton.value = true; // Maak de "Save"-knop zichtbaar
};

if (!userId) {
  router.push("/login");
}

// Base URL for API calls
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";

// Array om de configuraties op te slaan
const allConfigurations = ref([]); // Correcte initialisatie van ref
const partnerConfigurations = ref([]);
const selectedConfigurations = ref([]);

const isConfigurationSelected = (configurationId) => {
  const partnerConfigIds = new Set(
    partnerConfigurations.value.map((config) => config._id)
  );
  return partnerConfigIds.has(configurationId);
};

// Ophalen van alle configuraties
const fetchConfigurations = async () => {
  try {
    const response = await axios.get(`${baseURL}/configurations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    allConfigurations.value = response.data?.data || [];
    await fetchPartnerConfigurations();
  } catch (error) {
    console.error("Error fetching all configurations:", error);
  }
};

const fetchPartnerConfigurations = async () => {
  if (!partnerId) return;
  try {
    const response = await axios.get(`${baseURL}/partnerConfigurations`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { partnerId },
    });

    partnerConfigurations.value = response.data?.data || [];

    // Maak een set van partnerconfiguraties
    const partnerConfigIds = new Set(
      partnerConfigurations.value.map((config) => config.configurationId)
    );

    selectedConfigurations.value = allConfigurations.value.map((config) => {
      const isChecked = partnerConfigIds.has(config._id);
      return {
        ...config,
        checked: isChecked,
        disabled: !partnerConfigIds.has(config._id),
      };
    });
  } catch (error) {
    console.error("Error fetching partner configurations:", error);
  }
};

const saveUpdatedConfigurations = async () => {
  try {
    const promises = selectedConfigurations.value.map(async (config) => {
      const payload = {
        partnerId: partnerId,
        configurationId: config._id, // Gebruik config._id als configurationId
        options: config.options || {}, // Zorg ervoor dat de juiste structuur is
      };

      // Controleer of de partnerId gelijk is aan configurationId
      if (partnerId === config._id) {
        alert("PartnerId en ConfigurationId kunnen niet hetzelfde zijn!");
        return; // Stop de uitvoering hier als de waarden gelijk zijn
      }

      // Controleer of de configuratie al bestaat voor deze partner
      const existingConfig = partnerConfigurations.value.find(
        (pc) => pc.configurationId === config._id && pc.partnerId === partnerId
      );

      if (config.checked) {
        // Als de configuratie nog niet bestaat voor deze partner, voeg deze toe
        if (!existingConfig) {
          return axios
            .post(`${baseURL}/partnerConfigurations`, payload, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .then((response) => {
              console.log("Config toegevoegd:", response.data);
            })
            .catch((error) => {
              console.error(
                "Fout bij toevoegen configuratie:",
                error.response ? error.response.data : error
              );
            });
        }
      } else {
        // Verwijder de configuratie als de checkbox is uitgeschakeld
        if (existingConfig) {
          return axios
            .delete(`${baseURL}/partnerConfigurations/${existingConfig._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .then((response) => {
              console.log("Config verwijderd:", response.data);
            })
            .catch((error) => {
              console.error(
                "Fout bij verwijderen configuratie:",
                error.response ? error.response.data : error
              );
            });
        }
      }
    });

    // Wacht op alle beloftes
    await Promise.all(promises);

    alert("Configuraties zijn succesvol opgeslagen!");
    showSaveButton.value = false;

    // Reset originele status na succesvolle opslag
    selectedConfigurations.value.forEach((config) => {
      config.originalChecked = config.checked;
    });

    // Partnerconfiguraties opnieuw ophalen om duplicaten te voorkomen
    await fetchPartnerConfigurations();
  } catch (error) {
    console.error("Error saving updated configurations:", error);
    alert("Er is een fout opgetreden bij het opslaan van de configuraties.");
  }
};

// Ophalen van de configuraties wanneer de component wordt geladen
onMounted(() => {
  fetchConfigurations();
});

provide("partnerId", partnerId); // Geeft partnerId door aan andere componenten indien nodig

// State for managing the profile and other popups
const activeSection = ref("My profile");
const profileEditPopup = ref(false);
const changeEmailAddressPopup = ref(false);
const changePasswordPopup = ref(false);
const changeSubscriptionPopup = ref(false);
const deleteAccountPopup = ref(false);
const successProfileEditPopup = ref(false);
const succesEmailAddressPopup = ref(false);
const succesPasswordPopup = ref(false);

// Partner related data
const partnerPackage = ref(null);

// Method to set active section
const setActiveSection = (section) => {
  activeSection.value = section;
};

// Fetch user profile data
const fetchUserProfile = async () => {
  try {
    const response = await axios.get(`${baseURL}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const userData = response.data?.data?.user || {};
    // Update the user object
    user.firstName = userData.firstname || "";
    user.lastName = userData.lastname || "";
    user.email = userData.email || "";
    user.oldEmail = userData.email || "";
    user.country = userData.country || "";
    user.city = userData.city || "";
    user.postalCode = userData.postalCode || "";
    user.profilePicture = userData.profilePicture || "";
    user.bio = userData.bio || "";
    user.role = userData.role || "";
    user.activeUnactive = userData.activeUnactive ?? true;
  } catch (error) {
    console.error("Error fetching user profile:", error);
  }
};

// Fetch partner data (if applicable)
const fetchPartnerData = async () => {
  if (!partnerId) return;

  try {
    const response = await axios.get(`${baseURL}/partners/${partnerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const partner = response.data?.data?.partner || {};
    partnerPackage.value = partner.package || "No package available";
  } catch (error) {
    console.error("Error fetching partner data:", error);
    partnerPackage.value = "Error loading partner data";
  }
};

// Update user profile
const updateProfile = async () => {
  try {
    if (!user.firstName || !user.lastName || !user.email) {
      throw new Error("First Name, Last Name, and Email are required fields.");
    }

    const response = await axios.put(
      `${baseURL}/users/${userId}`,
      {
        user: {
          firstname: user.firstName,
          lastname: user.lastName,
          email: user.email,
          password: user.password,
          role: user.role,
          activeUnactive: user.activeUnactive,
          country: user.country,
          city: user.city,
          postalCode: user.postalCode,
          profileImage: user.profilePicture,
          bio: user.bio,
        },
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.status !== 200) {
      throw new Error(`Unexpected response status: ${response.status}`);
    }

    closeProfileEditPopup();
    opensuccessProfileEditPopup();
    await fetchUserProfile();
  } catch (error) {
    console.error("Error updating profile:", error);
    if (error.response) {
      console.error("Server responded with error:", error.response.data);
    }
  }
};

// Update email address
const updateEmailAddress = async () => {
  try {
    const response = await axios.put(
      `${baseURL}/users/${userId}`,
      { user: { email: user.newEmail } },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    closeChangeEmailAddressPopup();
    openSuccesChangeEmailAddressPopup();
    await fetchUserProfile();
  } catch (error) {
    console.error("Error updating email:", error);
  }
};

// Update password
const updatePassword = async () => {
  try {
    if (!user.oldPassword || !user.newPassword || !user.newPasswordRepeat) {
      throw new Error(
        "Please enter the old password, the new password, and the repetition of the new password."
      );
    }

    if (user.newPassword !== user.newPasswordRepeat) {
      throw new Error(
        "The new password and the repetition of the new password do not match."
      );
    }

    const response = await axios.put(
      `${baseURL}/users/${userId}`,
      {
        user: {
          oldPassword: user.oldPassword,
          newPassword: user.newPassword,
        },
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    closeChangePasswordPopup();
    openSuccesChangePasswordPopup();
  } catch (error) {
    console.error("Error updating password:", error);
  }
};

// Handle account deletion
const handleDeleteAccount = async () => {
  try {
    await axios.delete(`${baseURL}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    localStorage.removeItem("jwtToken");
    router.push("/login");
  } catch (error) {
    console.error("Error deleting account:", error);
  }
};

// Popup control functions
const openEditPopup = () => (profileEditPopup.value = true);
const closeProfileEditPopup = () => (profileEditPopup.value = false);

const openChangeEmailAddressPopup = () =>
  (changeEmailAddressPopup.value = true);
const closeChangeEmailAddressPopup = () =>
  (changeEmailAddressPopup.value = false);

const openChangePasswordPopup = () => (changePasswordPopup.value = true);
const closeChangePasswordPopup = () => (changePasswordPopup.value = false);

const openDeleteAccountPopup = () => (deleteAccountPopup.value = true);
const closeDeleteAccountPopup = () => (deleteAccountPopup.value = false);

// Success popups
const opensuccessProfileEditPopup = () =>
  (successProfileEditPopup.value = true);
const openSuccesChangeEmailAddressPopup = () =>
  (succesEmailAddressPopup.value = true);
const openSuccesChangePasswordPopup = () => (succesPasswordPopup.value = true);

const closeSuccessProfileEditPopup = () =>
  (successProfileEditPopup.value = false);
const closeSuccessEmailAddressPopup = () =>
  (succesEmailAddressPopup.value = false);
const closeSuccessChangePasswordPopup = () =>
  (succesPasswordPopup.value = false);

// Fetch initial data on mount
onMounted(async () => {
  await fetchUserProfile();
  await fetchPartnerData();
});

// Provide the user data to all components (including Navigation)
provide("user", user); // Makes user data available to child components like Navigation

// Watch for changes in user data and update the Navigation component
watch(
  user,
  (newUser) => {
    console.log("User data updated:", newUser);
  },
  { deep: true }
);

watch(
  selectedConfigurations,
  (newConfigurations) => {
    // Sla de geselecteerde staat op in localStorage
    const checkedState = newConfigurations.reduce((acc, config) => {
      acc[config._id] = config.checked;
      return acc;
    }, {});

    localStorage.setItem(
      "selectedConfigurations",
      JSON.stringify(checkedState)
    );

    // Controleer of er wijzigingen zijn in de geselecteerde configuraties
    const hasChanges = newConfigurations.some(
      (newConfig, index) =>
        newConfig.checked !== selectedConfigurations.value[index]?.checked
    );

    showSaveButton.value = hasChanges;
  },
  { deep: true }
);
</script>

<template>
  <DynamicStyle />
  <Navigation />
  <div class="content">
    <div class="top">
      <h1>Settings</h1>
      <font-awesome-icon icon="caret-right" />
    </div>

    <div class="elements">
      <div class="menu">
        <p
          :class="{ active: activeSection === 'My profile' }"
          @click="setActiveSection('My profile')"
        >
          My profile
        </p>
        <p
          :class="{ active: activeSection === 'Login settings' }"
          @click="setActiveSection('Login settings')"
        >
          Login settings
        </p>
        <p
          v-if="user.role === 'partner_owner' || user.role === 'partner_admin'"
          :class="{ active: activeSection === 'configurations' }"
          @click="setActiveSection('configurations')"
        >
          Configurations
        </p>
        <p
          v-if="user.role === 'partner_admin' && partnerPackage"
          :class="{ active: activeSection === 'Subscription' }"
          @click="setActiveSection('Subscription')"
          role="button"
          tabindex="0"
        >
          Subscription
        </p>
      </div>

      <div v-if="activeSection === 'My profile'" class="myProfile">
        <div class="row">
          <h2 class="border" style="visibility: hidden">My profile</h2>

          <button @click="openEditPopup" class="btn">
            <img src="../../assets/icons/paintbrush.svg" alt="icon" />
            <p>Edit</p>
          </button>
        </div>
        <div class="info">
          <div class="pictureWithText">
            <div class="profilePicture"></div>
            <div>
              <h3>{{ user.firstName }} {{ user.lastName }}</h3>
              <p>{{ user.bio ? user.bio : user.role }}</p>
            </div>
          </div>
        </div>

        <div class="personalInformation">
          <h3>Personal Information</h3>
          <div class="fields">
            <div class="column">
              <label>First name</label>
              <p>{{ user.firstName }}</p>
            </div>
            <div class="column">
              <label>Last name</label>
              <p>{{ user.lastName }}</p>
            </div>
            <div class="column">
              <label>Email address</label>
              <p>{{ user.email }}</p>
            </div>
          </div>
        </div>

        <div class="address">
          <h3>Address</h3>
          <div class="fields">
            <div class="column">
              <label>Country</label>
              <p>{{ user.country }}</p>
            </div>
            <div class="column">
              <label>City</label>
              <p>{{ user.city }}</p>
            </div>
            <div class="column">
              <label>Postal code</label>
              <p>{{ user.postalCode }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeSection === 'Login settings'" class="account">
        <h2 class="border">Account</h2>
        <div class="accountElements">
          <div class="column">
            <h3>Change email</h3>
            <div class="row">
              <p>{{ user.email }}</p>
              <button @click="openChangeEmailAddressPopup" class="link">
                <p>Change email</p>
              </button>
            </div>
          </div>
          <div class="column">
            <h3>Change password</h3>
            <div class="row">
              <p>&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</p>
              <button @click="openChangePasswordPopup" class="link">
                <p>Change password</p>
              </button>
            </div>
          </div>
          <div class="column">
            <div class="row">
              <h3>Delete account</h3>
              <button @click="openDeleteAccountPopup" class="deletelink">
                <p>Delete account</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeSection === 'configurations'" class="configurations">
        <h2 class="border">Configurations</h2>

        <!-- Voeg dit toe in je template om de status van de configuraties te controleren -->
        <div v-if="!selectedConfigurations.length">
          Geen configuraties beschikbaar.
        </div>

        <div v-else class="configurationsItems">
          <div
            v-for="config in selectedConfigurations"
            :key="config._id"
            class="row"
          >
            <input
              type="checkbox"
              v-model="config.checked"
              :id="'config-' + config._id"
              @change="onConfigurationChange"
              :checked="isConfigurationSelected(config._id)"
            />
            <label :for="'config-' + config._id">{{
              config.fieldName || "Naam niet beschikbaar"
            }}</label>
          </div>
        </div>

        <div class="frameBtn">
          <button
            v-if="showSaveButton"
            @click="saveUpdatedConfigurations"
            class="btn active"
          >
            Save
          </button>
        </div>
      </div>

      <div
        v-if="activeSection === 'Subscription' && user.role === 'partner_admin'"
        class="subscription"
      >
        <h2 class="border">Subscription</h2>
        <div class="subscriptionElements">
          <div class="column" v-if="partnerPackage">
            <h3>Package</h3>
            <div class="row">
              <p>{{ partnerPackage }}</p>
              <button @click="openChangeSubscriptionPopup" class="link">
                <p>Change subscription</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="profileEditPopup" class="popup">
        <div class="popup-content">
          <div class="row">
            <span class="close" @click="closeProfileEditPopup">&times;</span>
            <h2>Edit Profile</h2>
          </div>
          <div class="fields">
            <div class="row">
              <div class="column">
                <label>First name</label>
                <input v-model="user.firstName" placeholder="Voornaam" />
              </div>
              <div class="column">
                <label>Last name</label>
                <input v-model="user.lastName" placeholder="Achternaam" />
              </div>
            </div>
            <div class="row">
              <div class="column">
                <label>Email address</label>
                <input v-model="user.email" placeholder="E-mail" />
              </div>
              <div class="column">
                <label>Country</label>
                <input v-model="user.country" placeholder="Land" />
              </div>
            </div>
            <div class="row">
              <div class="column">
                <label>City</label>
                <input v-model="user.city" placeholder="Stad" />
              </div>
              <div class="column">
                <label>Postal code</label>
                <input v-model="user.postalCode" placeholder="Postcode" />
              </div>
            </div>
            <div class="column">
              <label>Profile Picture URL</label>
              <input
                v-model="user.profilePicture"
                placeholder="URL voor profielfoto"
              />
            </div>
            <div class="column">
              <label>Bio</label>
              <textarea v-model="user.bio" placeholder="Bio"></textarea>
            </div>
            <button @click="updateProfile" class="btn">Save</button>
          </div>
        </div>
      </div>
    </transition>
    <transition name="fade">
      <div v-if="changeEmailAddressPopup" class="popup">
        <div class="popup-content">
          <div class="row">
            <span class="close" @click="closeChangeEmailAddressPopup"
              >&times;</span
            >
            <h2>Change Email Address</h2>
          </div>
          <div class="fields">
            <div class="column">
              <label>Old Email Address</label>
              <p>{{ user.email }}</p>
            </div>
            <div class="column">
              <label>New Email Address</label>
              <input v-model="user.newEmail" placeholder="example@mail.be" />
            </div>
            <button @click="updateEmailAddress" class="btn">Save</button>
          </div>
        </div>
      </div>
    </transition>
    <transition name="fade">
      <div v-if="changePasswordPopup" class="popup">
        <div class="popup-content">
          <div class="row">
            <span class="close" @click="closeChangePasswordPopup">&times;</span>
            <h2>Change Password</h2>
          </div>
          <div class="fields">
            <div class="column">
              <label>Old password</label>
              <input
                v-model="user.oldpassword"
                type="password"
                placeholder="••••••••"
              />
            </div>
            <div class="column">
              <label>New password</label>
              <input
                v-model="user.newpassword"
                type="password"
                placeholder="••••••••"
              />
            </div>
            <div class="column">
              <label>Repeat new password</label>
              <input
                type="password"
                v-model="user.newPasswordRepeat"
                placeholder="••••••••"
              />
            </div>
            <p class="errorMessage"></p>
          </div>
          <button
            class="btn"
            @click="updatePassword(user.oldpassword, user.newpassword)"
          >
            Save
          </button>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="changeSubscriptionPopup" class="popup">
        <div class="popup-content">
          <div class="row">
            <span class="close" @click="closeChangeSubscriptionPopup"
              >&times;</span
            >
            <h2>Change Subscription</h2>
          </div>
          <div class="fields">
            <div class="column">
              <label>Package</label>
              <select v-model="selectedPackage">
                <option
                  value="standard"
                  :selected="selectedPackage === 'standard'"
                >
                  Standard
                </option>
                <option value="plus" :selected="selectedPackage === 'plus'">
                  Plus
                </option>
                <option value="pro" :selected="selectedPackage === 'pro'">
                  Pro
                </option>
              </select>
            </div>
            <p class="errorMessage">{{ errorMessage }}</p>
          </div>
          <button class="btn" @click="updateSubscription">Save</button>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="deleteAccountPopup" class="deletePopup">
        <img src="../../assets/icons/cross-circle.svg" alt="icon" />
        <div class="text">
          <h2>Are you sure?</h2>
          <p>Do you really want to delete your account?</p>
          <div class="btns">
            <button @click="closeDeleteAccountPopup">Cancel</button>
            <button @click="handleDeleteAccount" class="btn active">
              Delete
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="successProfileEditPopup" class="popup">
        <div class="successpopup">
          <img src="../../assets/icons/check-circle.svg" alt="icon" />
          <div class="text">
            <div>
              <h2>Succesfully!</h2>
              <p>Your profile has been edited successfully.</p>
            </div>
            <button @click="closeSuccessProfileEditPopup" class="btn active">
              OK
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="succesEmailAddressPopup" class="popup">
        <div class="successpopup">
          <img src="../../assets/icons/check-circle.svg" alt="icon" />
          <div class="text">
            <div>
              <h2>Succesfully!</h2>
              <p>Your e-mail address has been changed.</p>
            </div>
            <button @click="closeSuccessEmailAddressPopup" class="btn active">
              OK
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="succesPasswordPopup" class="popup">
        <div class="successpopup">
          <img src="../../assets/icons/check-circle.svg" alt="icon" />
          <div class="text">
            <div>
              <h2>Succesfully!</h2>
              <p>Your password has been changed.</p>
            </div>
            <button @click="closeSuccessPasswordPopup" class="btn active">
              OK
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.content {
  margin-bottom: 72px;
}

.top {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
}

.top svg {
  color: var(--titles-color);
}

.elements {
  background-color: var(--secondary-color);
  width: 100%;
  display: flex;
  flex-direction: row;
  gap: 24px;
  padding: 24px;
  border-radius: 4px;
}

.elements .menu {
  padding-right: 24px;
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  display: none;
  flex-direction: column;
  gap: 16px;
  width: 200px;
}

.elements .menu p {
  padding-left: 24px;
}

.elements .menu p.active {
  background-color: var(--primary-color);
  padding: 4px 12px 4px 24px;
  border-radius: 4px;
  color: var(--text-color);
}

.elements .myProfile {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.elements .account {
  width: 100%;
}

.elements .myProfile .info {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
}

.elements .myProfile .info .pictureWithText {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
}

.elements .myProfile .info .pictureWithText .profilePicture {
  background-image: url("../../assets/images/Odette_lunettes.webp");
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  width: 64px;
  height: 64px;
  border-radius: 50%;
}

.elements .myProfile .info .pictureWithText div {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info,
.personalInformation,
.address {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.personalInformation,
.address {
  align-items: flex-start;
}

.myProfile .row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.myProfile .row .mobile {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.myProfile .row .mobile i {
  color: var(--titles-color);
}

.myProfile .row .desktop {
  display: none;
}

.configurations,
.account,
.subscription {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.configurations {
  align-items: flex-start;
}

.configurations .configurationsItems {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.configurations .configurationsItems .row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.configurations .configurationsItems .row input {
  border-radius: 4px;
  width: auto;
}

.configurations .configurationsItems .row p {
  color: var(--text-color);
}

.custom-checkbox {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  border: 2px solid white;
  background-color: transparent;
  cursor: pointer;
  position: relative;
}

.custom-checkbox:checked {
  background-color: var(--white);
}

.custom-checkbox:checked::before {
  content: "\2714";
  font-size: 16px;
  color: var(--black);
  position: absolute;
  top: -2px;
  left: 5px;
}

.account .accountElements,
.subscription .subscriptionElements {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.account .accountElements .column,
.subscription .subscriptionElements .column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.account .accountElements .column .row,
.subscription .subscriptionElements .column .row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.account .accountElements .column .row .link,
.subscription .subscriptionElements .column .row .link {
  background-color: var(--gray);
  border-radius: 4px;
  padding: 4px 12px;
}

.account .accountElements .column .row .link p,
.subscription .subscriptionElements .column .row .link p {
  color: var(--black);
  font-weight: 400;
}

.account .accountElements .column .row .deletelink {
  border: 1px solid #d34848;
  background-color: rgba(211, 72, 72, 0.2);
  border-radius: 4px;
  padding: 4px 12px;
}

.account .accountElements .column .row .deletelink p {
  color: #d34848;
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.configurations .list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  column-gap: 120px;
  row-gap: 16px;
}

.configurations .list {
  padding: 16px 0;
}

.fields .column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column p,
input,
textarea {
  color: rgba(255, 255, 255, 0.4);
  font-weight: 700;
}

input,
textarea {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding: 4px 8px;
}

textarea {
  background-color: transparent;
  padding: 8px;
  height: 100px;
}

input,
textarea {
  width: 100%;
}

.elements .display {
  display: none;
}

.popup {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.successpopup {
  background-color: var(--secondary-color);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 24px;
  padding: 24px;
  border-radius: 4px;
}

.successpopup .text {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
}

.successpopup .text .btn {
  color: var(--text-color);
}

.successpopup .text div {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.popup-content {
  background-color: white;
  padding: 20px;
  border-radius: 4px;
  width: 88%;
  position: relative;
  align-items: flex-end;
}

.close {
  position: absolute;
  top: 10px;
  right: 15px;
  cursor: pointer;
}

.popup {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.popup-content {
  background-color: var(--secondary-color);
  padding: 24px;
  border-radius: 4px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.popup-content .row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.popup-content .fields {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
  width: 100%;
}

.popup-content .row span {
  font-size: 24px;
}

.popup-content .column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.popup-content .btns {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.popup-content .btns .btn {
  color: var(--text-color);
}

button {
  background-color: transparent;
}

.deletePopup {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  background-color: var(--secondary-color);
  padding: 24px 32px;
  border-radius: 4px;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
}

.deletePopup img {
  width: 64px;
  height: 64px;
}

.deletePopup .text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.deletePopup .text .btns {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.deletePopup .text .btns button {
  border: none;
  background: transparent;
  cursor: pointer;
}

.deletePopup .text .btns .active {
  background-color: #d34848;
  color: var(--text-color);
}

.btn.display {
  visibility: hidden;
  border: 1px solid #d34848;
  background-color: rgba(211, 72, 72, 0.2);
  border-radius: 4px;
  padding: 4px 12px;
}

.btn.display p,
.errorMessage {
  color: #d34848;
}

.frameBtn {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

@media (min-width: 768px) {
  .content {
    margin: 0;
  }
  .elements .menu {
    display: flex;
  }

  .fields,
  .configurations .list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    column-gap: 120px;
    row-gap: 16px;
  }
}
@media (min-width: 1200px) {
  .popup-content {
    width: 400px;
  }
}
</style>
