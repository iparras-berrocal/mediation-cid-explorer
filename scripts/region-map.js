let REGION_MAP = null;
let REGION_GEOJSON_LAYER = null;
let SELECTED_REGION_LAYER = null;

const REGION_STYLE = {
  regional: {
    color: "#075969",
    weight: 2,
    fillColor: "#0b7285",
    fillOpacity: 0.10
  },
  coastal: {
    color: "#6c5ce7",
    weight: 2,
    fillColor: "#a29bfe",
    fillOpacity: 0.18
  },
  gfcm: {
    color: "#d97706",
    weight: 2,
    fillColor: "#f59e0b",
    fillOpacity: 0.18
  },
  mpa: {
    color: "#b42318",
    weight: 2.5,
    fillColor: "#ef4444",
    fillOpacity: 0.22
  }
};

function getDefaultRegionStyle(feature) {
  const category = feature?.properties?.category || "regional";

  return REGION_STYLE[category] || REGION_STYLE.regional;
}

function getSelectedRegionStyle(feature) {
  const base = getDefaultRegionStyle(feature);

  return {
    ...base,
    weight: 4,
    fillOpacity: Math.min((base.fillOpacity || 0.15) + 0.18, 0.5)
  };
}

function findRegionLayerByName(regionName) {
  let foundLayer = null;

  if (!REGION_GEOJSON_LAYER) return null;

  REGION_GEOJSON_LAYER.eachLayer(layer => {
    if (
      layer.feature?.properties?.name === regionName
    ) {
      foundLayer = layer;
    }
  });

  return foundLayer;
}

function highlightRegion(regionName, fitBounds = false) {
  if (!REGION_GEOJSON_LAYER) return;

  REGION_GEOJSON_LAYER.eachLayer(layer => {
    layer.setStyle(
      getDefaultRegionStyle(layer.feature)
    );
  });

  const layer = findRegionLayerByName(regionName);

  if (!layer) return;

  layer.setStyle(
    getSelectedRegionStyle(layer.feature)
  );

  layer.bringToFront();

  SELECTED_REGION_LAYER = layer;

  if (fitBounds) {
    const bounds = layer.getBounds();

    if (bounds.isValid()) {
      REGION_MAP.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: 9
      });
    }
  }
}

function selectRegionFromMap(regionName) {
  const selectors = [
    document.getElementById("cid-region"),
    document.getElementById("eval-region")
  ];

  selectors.forEach(select => {
    if (!select) return;

    const values = Array.from(select.options).map(
      option => option.value
    );

    if (!values.includes(regionName)) return;

    select.value = regionName;
    select.dispatchEvent(
      new Event("change", { bubbles: true })
    );
  });

  highlightRegion(regionName, true);
}

function initializeRegionMap() {
  const mapContainer = document.getElementById("region-map");

  if (!mapContainer || typeof L === "undefined") return;

  REGION_MAP = L.map("region-map", {
    zoomControl: true,
    scrollWheelZoom: false
  }).setView([42.5, 6.0], 6);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 12,
      attribution:
        '&copy; OpenStreetMap contributors'
    }
  ).addTo(REGION_MAP);

  fetch("images/mediation-regions.geojson")
    .then(response => {
      if (!response.ok) {
        throw new Error(
          `mediation-regions.geojson could not be loaded (${response.status})`
        );
      }

      return response.json();
    })
    .then(geojson => {
      REGION_GEOJSON_LAYER = L.geoJSON(geojson, {
        style: feature =>
          getDefaultRegionStyle(feature),

        onEachFeature: (feature, layer) => {
          const regionName =
            feature?.properties?.name ||
            feature?.properties?.code ||
            "Region";

          layer.bindTooltip(regionName, {
            sticky: true,
            direction: "top"
          });

          layer.on("mouseover", () => {
            if (layer !== SELECTED_REGION_LAYER) {
              layer.setStyle({
                ...getSelectedRegionStyle(feature),
                weight: 3
              });
            }
          });

          layer.on("mouseout", () => {
            if (layer !== SELECTED_REGION_LAYER) {
              layer.setStyle(
                getDefaultRegionStyle(feature)
              );
            }
          });

          layer.on("click", () => {
            selectRegionFromMap(regionName);
          });
        }
      }).addTo(REGION_MAP);

      const bounds = REGION_GEOJSON_LAYER.getBounds();

      if (bounds.isValid()) {
        REGION_MAP.fitBounds(bounds, {
          padding: [20, 20]
        });
      }

      const currentRegion =
        document.getElementById("cid-region")?.value;

      if (currentRegion) {
        highlightRegion(currentRegion, false);
      }
    })
    .catch(error => {
      console.error(error);

      mapContainer.innerHTML = `
        <p style="
          padding:20px;
          color:#b42318;
          text-align:center;
        ">
          Could not load the region map: ${error.message}
        </p>
      `;
    });
}

function connectRegionSelectorsToMap() {
  const cidRegion =
    document.getElementById("cid-region");

  const evalRegion =
    document.getElementById("eval-region");

  if (cidRegion) {
    cidRegion.addEventListener("change", () => {
      highlightRegion(
        cidRegion.value,
        false
      );
    });
  }

  if (evalRegion) {
    evalRegion.addEventListener("change", () => {
      highlightRegion(
        evalRegion.value,
        false
      );
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  initializeRegionMap();
  connectRegionSelectorsToMap();
});
