<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

// Router en JWT-token ophalen
const router = useRouter();
const token = localStorage.getItem("jwtToken") || null;

// Definieer fallback stijlen
const fallbackStyle = {
  primary_color: "rgb(151, 71, 255)",
  secondary_color: "rgb(26, 26, 26)",
  text_color: "rgb(255, 255, 255)",
  titles_color: "rgb(0, 113, 227)",
  background_color: "rgb(0, 0, 0)",
  logo_url: "../assets/images/REBILT-logo-white.svg",
  fontFamilyTitles: "Syne, serif",
  fontFamilyBodyText: "DM Sans, sans-serif",
};

// Refs voor partnerId en foutmeldingen
const partnerId = ref(null);
const error = ref(null);

// Functie om partnerId op te halen
const getPartnerId = async () => {
  if (token) {
    try {
      const tokenPayload = JSON.parse(atob(token.split(".")[1]));
      return tokenPayload?.companyId || null;
    } catch (e) {
      console.error("Fout bij het parsen van de JWT-token:", e);
      return null;
    }
  } else {
    const partnerName = router.currentRoute.value.query.partner;
    if (partnerName) {
      return fetchPartnerID(partnerName);
    } else {
      console.error("Geen partnernaam opgegeven in de URL-query.");
      return null;
    }
  }
};

// Functie om huisstijl op te halen
const getHouseStyleFromDatabase = async (id) => {
  if (!id) {
    console.error("Geen partnerId beschikbaar om huisstijl op te halen.");
    applyFallbackStyles();
    return;
  }

  try {
    const response = await axios.get(
      `http://localhost:3000/api/v1/partners/${id}`,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
    );

    const huisstijlData = response.data.data.partner || fallbackStyle;

    // Stel de root CSS-variabelen in
    document.documentElement.style.setProperty(
      "--primary-color",
      huisstijlData.primary_color
    );
    document.documentElement.style.setProperty(
      "--secondary-color",
      huisstijlData.secondary_color
    );
    document.documentElement.style.setProperty(
      "--text-color",
      huisstijlData.text_color
    );
    document.documentElement.style.setProperty(
      "--titles-color",
      huisstijlData.titles_color
    );
    document.documentElement.style.setProperty(
      "--background-color",
      huisstijlData.background_color
    );
    document.documentElement.style.setProperty(
      "--background-image",
      `url(${huisstijlData.logo_url})`
    );
    document.documentElement.style.setProperty(
      "--title-font",
      huisstijlData.fontFamilyTitles
    );
    document.documentElement.style.setProperty(
      "--body-font",
      huisstijlData.fontFamilyBodyText
    );

    // Fonts laden
    loadFonts(huisstijlData.fontFamilyBodyText, huisstijlData.fontFamilyTitles);
  } catch (error) {
    console.error("Fout bij het ophalen van huisstijl:", error);
    applyFallbackStyles();
  }
};

// Asynchrone functie om partnerId op te halen uit de naam
const fetchPartnerID = async (partnerName) => {
  try {
    const formattedPartnerName = partnerName.replace(/([A-Z])/g, " $1").trim();
    const response = await axios.get(
      `http://localhost:3000/api/v1/partners?partnerName=${formattedPartnerName}`
    );

    const partner = response.data.data.partners.find(
      (p) => p.name.toLowerCase() === formattedPartnerName.toLowerCase()
    );

    return partner?._id || null;
  } catch (err) {
    console.error("Fout bij het ophalen van de partner ID:", err);
    error.value = "Er is een fout opgetreden bij het ophalen van de partner.";
    return null;
  }
};

// Fallback stijlen toepassen
const applyFallbackStyles = () => {
  document.documentElement.style.setProperty(
    "--primary-color",
    fallbackStyle.primary_color
  );
  document.documentElement.style.setProperty(
    "--secondary-color",
    fallbackStyle.secondary_color
  );
  document.documentElement.style.setProperty(
    "--text-color",
    fallbackStyle.text_color
  );
  document.documentElement.style.setProperty(
    "--titles-color",
    fallbackStyle.titles_color
  );
  document.documentElement.style.setProperty(
    "--background-color",
    fallbackStyle.background_color
  );
  document.documentElement.style.setProperty(
    "--background-image",
    `url(${fallbackStyle.logo_url})`
  );
  document.documentElement.style.setProperty(
    "--title-font",
    fallbackStyle.fontFamilyTitles
  );
  document.documentElement.style.setProperty(
    "--body-font",
    fallbackStyle.fontFamilyBodyText
  );
  loadFonts(fallbackStyle.fontFamilyBodyText, fallbackStyle.fontFamilyTitles);
};

// Fonts laden
const loadFonts = (bodyFont, titleFont) => {
  const addFontToDocument = (fontUrl) => {
    const existingLink = document.head.querySelector(`link[href="${fontUrl}"]`);
    if (!existingLink) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = fontUrl;
      document.head.appendChild(link);
    }
  };

  if (bodyFont)
    addFontToDocument(
      `https://fonts.googleapis.com/css2?family=${bodyFont.replace(
        / /g,
        "+"
      )}:wght@400;700&display=swap`
    );
  if (titleFont)
    addFontToDocument(
      `https://fonts.googleapis.com/css2?family=${titleFont.replace(
        / /g,
        "+"
      )}:wght@400;700&display=swap`
    );
};

// Component laden
onMounted(async () => {
  partnerId.value = await getPartnerId();
  if (partnerId.value) {
    console.log("Partner ID gevonden:", partnerId.value);
    await getHouseStyleFromDatabase(partnerId.value);
  } else {
    console.warn("Geen partner ID gevonden, fallback stijlen toepassen.");
    applyFallbackStyles();
  }
});
</script>

<template>
  <div></div>
</template>
