/* Productgerelateerde functies */
import { ref, toRaw } from "vue";
import axios from "axios";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { useRouter } from "vue-router";
const router = useRouter();

// Setup loaders
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
const objLoader = new OBJLoader();

// Export loaders
export { objLoader, gltfLoader, dracoLoader };
let scene, camera, renderer, model;

const selectedType = ref("");
const isProduction = window.location.hostname !== "localhost";
const baseURL = isProduction
  ? "https://rebilt-backend.onrender.com/api/v1"
  : "http://localhost:3000/api/v1";
const errorMessage = ref("");
const colors = ref([]);
const jwtToken = localStorage.getItem("jwtToken");
const tokenPayload = jwtToken ? JSON.parse(atob(jwtToken.split(".")[1])) : {};
const partnerId = tokenPayload.companyId;
const filteredProducts = ref([]); // Correct initialiseren als lege array
const partnerConfigurations = ref([]);
let isMouseDown = false;
let prevMouseX = 0;
let prevMouseY = 0;

export const filterProductsByType = (
  partnerId,
  selectedType,
  filteredProductsRef
) => {
  // Access the value of filteredProductsRef (which is a ref)
  const filteredProducts = filteredProductsRef.value; // Correctly access the value of the ref

  if (!Array.isArray(filteredProducts)) {
    console.error(
      "filteredProducts is not properly initialized or is not an array."
    );
    return []; // Return an empty array if it's not properly initialized
  }

  // Continue with filtering
  let filteredResults = [...filteredProducts]; // Make a copy of filteredProducts

  if (selectedType) {
    filteredResults = filteredResults.filter(
      (product) => product.productType === selectedType
    );
  }

  return filteredResults;
};

export const fetchProducts = async (partnerId) => {
  // Controleer of partnerId bestaat
  if (!partnerId) {
    console.error("partnerId is undefined or null!");
    return []; // Return een lege array als partnerId ontbreekt
  }

  try {
    const partnerResponse = await axios.get(`${baseURL}/partners/${partnerId}`);

    const partnerName = partnerResponse.data.data.partner.name;

    if (!partnerName) {
      throw new Error("Partner name not found");
    }

    const apiUrl = `${baseURL}/products?partnerName=${partnerName}`;

    const productResponse = await axios.get(apiUrl);

    const products = productResponse.data?.data?.products || [];
    return products; // Return de producten als alles goed gaat
  } catch (error) {
    console.error("Error fetching products:", error);
    return []; // Return een lege array als er iets misgaat
  }
};

export const fetchProductTypes = async (partnerId) => {
  // Controleer of partnerId bestaat
  if (!partnerId) {
    console.error("partnerId is undefined or null!");
    return []; // Return een lege array als partnerId ontbreekt
  }

  try {
    // Haal partnergegevens op via partnerId
    const partnerResponse = await axios.get(`${baseURL}/partners/${partnerId}`);

    // Haal de partnernaam op uit het antwoord
    const partnerName = partnerResponse.data?.data?.partner?.name;

    if (!partnerName) {
      throw new Error("Partner name not found");
    }

    // Bouw de API URL om producten op te halen op basis van de partnernaam
    const apiUrl = `${baseURL}/products?partnerName=${partnerName}`;

    // Haal producten op via de API
    const productResponse = await axios.get(apiUrl);

    // Haal de producten op uit het antwoord
    const products = productResponse.data?.data?.products || [];

    // Haal alleen de unieke productType's uit de productenlijst
    const productTypesSet = new Set(
      products.map((product) => product.productType)
    );

    // Convert the Set to an array before returning
    const productTypes = Array.from(productTypesSet);

    // Return de productTypes (Altijd als array)
    return productTypes || []; // Ensure it returns an array, even if no product types are found
  } catch (error) {
    console.error("Error fetching products:", error);
    return []; // Return een lege array als er iets misgaat
  }
};

export async function getcolors(partnerId) {
  try {
    const configResponse = await axios.get(
      `${baseURL}/partnerConfigurations?partnerId=${partnerId}`
    );

    if (configResponse.data.status !== "success" || !configResponse.data.data) {
      throw new Error("❌ Geen configuraties gevonden voor deze partner.");
    }

    const configurations = configResponse.data.data;

    const selectedColors = [];

    configurations.forEach((config) => {
      if (config.options.length > 0) {
        config.options.forEach((option) => {
          const optionId = option.optionId?._id;
          const colorName = option.optionId?.name; // Naam of hex-waarde van de kleur

          if (
            optionId &&
            !selectedColors.some((o) => o.optionId === optionId)
          ) {
            selectedColors.push({
              optionId,
              color: colorName || "Unnamed Color",
            });
          }
        });
      }
    });

    return selectedColors;
  } catch (error) {
    console.error("❌ Fout in getcolors:", error);
    return []; // Retourneer een lege array bij een fout
  }
}

const fetchedColors = ref([]); // Gebruik een ref voor reactieve kleuren

// Zorg ervoor dat `fetchcolors` de `colors.value` goed bijwerkt:
export const fetchcolors = async (partnerId) => {
  try {
    const selectedOptions = await getcolors(partnerId);

    if (
      !selectedOptions ||
      !Array.isArray(selectedOptions) ||
      selectedOptions.length === 0
    ) {
      console.error("❌ Geen geldige kleuren ontvangen");
      return;
    }

    // Ensure that fetchedColors.value is properly updated
    fetchedColors.value = selectedOptions.map((option) => ({
      optionId: option.optionId || "",
      name: option.color || "Unnamed Color",
      images: option.images || [],
    }));
  } catch (error) {
    console.error("❌ Fout in fetchcolors:", error);
  }
};

export const load3DModel = async (filePath) => {
  if (!isSceneInitialized) {
    console.error("Scene is not initialized.");
    return;
  }

  const fileExtension = filePath.split(".").pop().toLowerCase();

  if (fileExtension === "obj") {
    loadOBJModel(filePath); // Laad .obj bestand
  } else if (fileExtension === "glb" || fileExtension === "gltf") {
    loadGLBModel(filePath); // Laad .glb of .gltf bestand
  } else {
    console.error("Unsupported file type:", fileExtension);
  }
};

// In productService.js
export function loadOBJModel(url) {
  return new Promise((resolve, reject) => {
    const loader = new OBJLoader();
    loader.load(
      url,
      (object) => {
        resolve(object); // Retourneer het geladen model
      },
      undefined,
      (error) => {
        reject(error); // Foutafhandeling
      }
    );
  });
}

export function loadGLBModel(url) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader().setDRACOLoader(dracoLoader);
    loader.load(
      url,
      (gltf) => {
        resolve(gltf.scene); // Retourneer de scène van het GLTF-model
      },
      undefined,
      (error) => {
        reject(error); // Foutafhandeling
      }
    );
  });
}

// Voorbeeld van wat de handlers kunnen doen
export function onTouchStart(event) {
  // Zorg ervoor dat we de initiële positie van de aanrakingen vastleggen
  event.preventDefault();
  const touches = event.changedTouches;
  if (touches.length === 1) {
    // Verwerk de aanraking voor de rotatie
    // Bijvoorbeeld de hoek vastleggen op basis van de eerste aanraking
    this.touchStart = {
      x: touches[0].clientX,
      y: touches[0].clientY,
    };
  }
}

export function onTouchMove(event) {
  event.preventDefault();

  if (this.touchStart) {
    const touches = event.changedTouches;
    const deltaX = touches[0].clientX - this.touchStart.x;
    const deltaY = touches[0].clientY - this.touchStart.y;

    // Hier roep je de rotateModel functie aan met de juiste context
    if (this.rotateModel) {
      this.rotateModel(deltaX, deltaY);
    }

    // Werk de touch start positie bij voor de volgende beweging
    this.touchStart = { x: touches[0].clientX, y: touches[0].clientY };
  }
}

export function onTouchEnd(event) {
  event.preventDefault();
  // Hier kun je stoppen met rotatie of resetten van touch posities
  this.touchStart = null;
}

export function onMouseDown(event) {
  event.preventDefault();
  this.mouseStart = {
    x: event.clientX,
    y: event.clientY,
  };
}

export function onMouseMove(event) {
  event.preventDefault();
  if (this.mouseStart) {
    const deltaX = event.clientX - this.mouseStart.x;
    const deltaY = event.clientY - this.mouseStart.y;

    this.rotateModel(deltaX, deltaY);

    // Werk de muis start positie bij
    this.mouseStart = { x: event.clientX, y: event.clientY };
  }
}

export function onMouseUp(event) {
  event.preventDefault();
  this.mouseStart = null;
}

async function uploadImage(file) {
  try {
    const formData = new FormData();
    formData.append("image", file);

    const response = await axios.post("/upload-endpoint", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (response.data && response.data.imageUrl) {
      console.log("✅ Afbeelding geüpload: ", response.data.imageUrl);
      return response.data.imageUrl; // Zorg ervoor dat de URL correct wordt geretourneerd
    } else {
      console.error("❌ Geen geldige URL teruggekregen bij upload.");
      return null;
    }
  } catch (error) {
    console.error("❌ Fout bij het uploaden van de afbeelding:", error);
    return null;
  }
}

export const add2DProduct = async ({
  productCode,
  productName,
  productType,
  productPrice,
  description,
  brand,
  activeInactive,
  partnerId,
  configurations,
}) => {
  try {
    // Log product details for debugging purposes
    console.log("Adding 2D Product with these details:", {
      productCode,
      productName,
      productType,
      productPrice,
      description,
      brand,
      activeInactive,
      partnerId,
      configurations,
    });

    // Make POST request to add the 2D product
    const response = await axios.post("/api/v1/products", {
      productCode,
      productName,
      productType,
      productPrice,
      description,
      brand,
      activeInactive,
      partnerId,
      configurations,
    });

    if (response.status === 201) {
      console.log("Product added successfully:", response.data);
    } else {
      console.error("❌ Failed to add 2D product.");
    }
  } catch (error) {
    console.error("❌ Error adding 2D product:", error);
    throw error; // Rethrow error to be handled in the calling function
  }
};

export const add3DProduct = async ({
  productCode,
  productName,
  productType,
  productPrice,
  description,
  brand,
  activeInactive,
  partnerId,
  configurations,
  file, // De file parameter bevat nu de URL van de geüploade afbeelding
}) => {
  try {
    console.log("✅ Start add3DProduct met parameters...", {
      productCode,
      productName,
      configurations,
      file,
    });

    if (!productName || !productPrice) {
      console.error("❌ Productnaam en prijs zijn verplicht.");
      return;
    }

    if (!Array.isArray(configurations) || configurations.length === 0) {
      console.error("❌ Geen configuraties gevonden voor de partner.");
      return;
    }

    let validConfigurations = [];

    // Verwerk de configuraties en voeg de geselecteerde opties toe
    for (const config of configurations) {
      console.log("🔍 Bezig met configuratie:", config);

      let selectedOptions = [];

      if (config.configurationDetails?.fieldType === "color") {
        console.log(
          "🎨 Configuratie bevat een kleurveld:",
          config.configurationDetails.fieldName
        );

        if (!Array.isArray(config.options) || config.options.length === 0) {
          console.warn(
            "⚠️ Geen opties beschikbaar in deze configuratie: ",
            config.configurationDetails.fieldName
          );
          continue;
        }

        // Voeg opties toe voor elke kleurconfiguratie
        const imageUrl =
          typeof file === "string" && file.startsWith("https://") ? file : null;

        const selectedOptionsForConfig = config.options.map((option) => ({
          optionId: option.optionId?._id,
          images: imageUrl ? [imageUrl] : [], // Voeg de geldige URL toe aan de images array
          _id: `${option.optionId?._id}-${Date.now()}`,
        }));

        console.log("🔍 Geselecteerde opties:", selectedOptionsForConfig);
        selectedOptions.push(...selectedOptionsForConfig);
      }

      if (selectedOptions.length > 0) {
        validConfigurations.push({
          configurationId: config.configurationId?._id || "onbekend-config-id",
          selectedOptions,
        });
      }
    }

    if (validConfigurations.length === 0) {
      console.error("❌ Geen geldige configuraties gevonden");
      return;
    }

    // **Maak product aan met bijgewerkte configuraties**
    const productData = {
      productCode,
      productName,
      productType,
      brand,
      description,
      productPrice,
      activeInactive,
      partnerId,
      configurations: validConfigurations.map((config) => ({
        ...config,
        selectedOptions: config.selectedOptions.map((option) => ({
          ...option,
          images: option.images.length > 0 ? option.images : [], // Zorg ervoor dat het veld images een lege array is als er geen afbeeldingen zijn
        })),
      })),
    };

    console.log(productData);

    const response = await axios.post(`${baseURL}/products`, productData, {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 201) {
      console.log("✅ 3D-product succesvol toegevoegd:", response.data);
    } else {
      console.error("❌ Fout bij toevoegen van 3D-product:", response);
    }
  } catch (error) {
    console.error("❌ Algemene fout in add3DProduct:", error);
  }
};

function addImageToConfigurations(imageUrl, configurations) {
  if (!imageUrl) {
    console.warn("⚠️ Geen geldige afbeelding URL om toe te voegen.");
    return;
  }

  configurations.forEach((config) => {
    console.log(`🔍 Configuratie: ${config.configurationId}`);

    if (!config.selectedOptions || config.selectedOptions.length === 0) {
      console.warn(
        `⚠️ Geen geselecteerde opties voor configuratie: ${config.configurationId}`
      );
      return;
    }

    config.selectedOptions.forEach((option) => {
      console.log(`🎨 Optie ${option.optionId}:`, option);

      if (!option.images) {
        option.images = []; // Zorg ervoor dat images een array is
      }
      option.images.push(imageUrl); // Voeg de afbeelding toe
      console.log(
        `✅ Afbeelding toegevoegd aan optie ${option.optionId}:`,
        imageUrl
      );
    });
  });

  console.log(
    "🖼 Afbeelding toegevoegd aan alle geselecteerde opties:",
    configurations
  );
}
