let REGION_SVG_DOCUMENT = null;
let REGION_SVG_PATHS = [];

/* =========================================================
   ACTIVE TOOL
   ========================================================= */

function getActiveRegionSelect() {
  const scenarioPanel =
    document.getElementById("scenario-projections");

  const evaluationPanel =
    document.getElementById("simulation-evaluation");

  if (scenarioPanel?.classList.contains("active")) {
    return document.getElementById("cid-region");
  }

  if (evaluationPanel?.classList.contains("active")) {
    return document.getElementById("eval-region");
  }

  return document.getElementById("cid-region");
}

/* =========================================================
   HELPERS
   ========================================================= */

function selectorContainsRegion(selectElement, regionName) {
  if (!selectElement || !regionName) return false;

  return Array.from(selectElement.options).some(
    option => option.value === regionName
  );
}

function updateMapRegionSelector(regionName) {
  const mapSelect =
    document.getElementById("map-region-select");

  if (
    mapSelect &&
    selectorContainsRegion(mapSelect, regionName)
  ) {
    mapSelect.value = regionName;
  }
}

function updateSelectedRegionLabel(regionName) {
  const selectedName =
    document.getElementById("region-map-selected-name");

  if (selectedName) {
    selectedName.textContent =
      regionName || "No region selected";
  }
}

/* =========================================================
   SVG HIGHLIGHT
   ========================================================= */

function highlightSelectedSvgRegion(regionName) {
  REGION_SVG_PATHS.forEach(path => {
    const isSelected =
      path.dataset.regionName === regionName;

    path.classList.toggle(
      "is-selected",
      isSelected
    );

    path.setAttribute(
      "aria-selected",
      String(isSelected)
    );
  });

  updateMapRegionSelector(regionName);
  updateSelectedRegionLabel(regionName);
}

/* =========================================================
   CHANGE ACTIVE TOOL REGION
   ========================================================= */

function setActiveToolRegion(regionName) {
  const activeSelect = getActiveRegionSelect();

  if (!activeSelect || !regionName) return;

  if (!selectorContainsRegion(activeSelect, regionName)) {
    console.warn(
      `Region "${regionName}" is not available in the active tool.`
    );

    return;
  }

  if (activeSelect.value !== regionName) {
    activeSelect.value = regionName;

    activeSelect.dispatchEvent(
      new Event("change", {
        bubbles: true
      })
    );
  }

  highlightSelectedSvgRegion(regionName);
}

function selectRegionFromSvg(regionName) {
  setActiveToolRegion(regionName);
}

/* =========================================================
   CONNECT SVG
   ========================================================= */

function connectSvgRegions() {
  const svgObject =
    document.getElementById("region-svg-object");

  if (!svgObject) return;

  REGION_SVG_DOCUMENT =
    svgObject.contentDocument;

  if (!REGION_SVG_DOCUMENT) {
    console.warn(
      "The interactive SVG document could not be accessed."
    );

    return;
  }

  REGION_SVG_PATHS = Array.from(
    REGION_SVG_DOCUMENT.querySelectorAll(".region")
  );

  REGION_SVG_PATHS.forEach(path => {
    const regionName =
      path.dataset.regionName;

    if (!regionName) return;

    path.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();

      selectRegionFromSvg(regionName);
    });

    path.addEventListener("keydown", event => {
      if (
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        event.stopPropagation();

        selectRegionFromSvg(regionName);
      }
    });
  });

  refreshSvgRegionSelection();
}

/* =========================================================
   CONNECT TOOL SELECTORS
   ========================================================= */

function connectRegionSelectors() {
  const scenarioRegion =
    document.getElementById("cid-region");

  const evaluationRegion =
    document.getElementById("eval-region");

  if (scenarioRegion) {
    scenarioRegion.addEventListener("change", () => {
      const scenarioPanel =
        document.getElementById("scenario-projections");

      if (
        scenarioPanel?.classList.contains("active")
      ) {
        highlightSelectedSvgRegion(
          scenarioRegion.value
        );
      }
    });
  }

  if (evaluationRegion) {
    evaluationRegion.addEventListener("change", () => {
      const evaluationPanel =
        document.getElementById("simulation-evaluation");

      if (
        evaluationPanel?.classList.contains("active")
      ) {
        highlightSelectedSvgRegion(
          evaluationRegion.value
        );
      }
    });
  }
}

/* =========================================================
   CONNECT MAP SELECTOR
   ========================================================= */

function connectMapRegionSelector() {
  const mapSelect =
    document.getElementById("map-region-select");

  if (!mapSelect) return;

  mapSelect.addEventListener("change", () => {
    setActiveToolRegion(
      mapSelect.value
    );
  });
}

/* =========================================================
   REFRESH AFTER TAB CHANGE
   ========================================================= */

function refreshSvgRegionSelection() {
  const activeSelect =
    getActiveRegionSelect();

  if (!activeSelect?.value) {
    updateSelectedRegionLabel(
      "No region selected"
    );

    return;
  }

  highlightSelectedSvgRegion(
    activeSelect.value
  );
}

/* =========================================================
   INITIALIZATION
   ========================================================= */

window.addEventListener("DOMContentLoaded", () => {
  const svgObject =
    document.getElementById("region-svg-object");

  if (svgObject) {
    svgObject.addEventListener(
      "load",
      connectSvgRegions
    );

    /*
      If the SVG is already loaded from browser cache,
      contentDocument may already be available.
    */
    if (svgObject.contentDocument) {
      connectSvgRegions();
    }
  }

  connectRegionSelectors();
  connectMapRegionSelector();

  window.setTimeout(() => {
    refreshSvgRegionSelection();
  }, 0);
});
