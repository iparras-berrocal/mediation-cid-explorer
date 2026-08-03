let REGION_SVG_DOCUMENT = null;
let REGION_SVG_PATHS = [];

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

function highlightSelectedSvgRegion(regionName) {
  if (!REGION_SVG_PATHS.length) return;

  REGION_SVG_PATHS.forEach(path => {
    const isSelected =
      path.dataset.regionName === regionName;

    path.classList.toggle("is-selected", isSelected);
    path.setAttribute("aria-selected", String(isSelected));
  });

  const selectedName =
    document.getElementById("region-map-selected-name");

  if (selectedName) {
    selectedName.textContent =
      regionName || "No region selected";
  }
}

function selectRegionFromSvg(regionName) {
  const activeSelect = getActiveRegionSelect();

  if (!activeSelect) return;

  const exists = Array.from(activeSelect.options).some(
    option => option.value === regionName
  );

  if (!exists) {
    console.warn(
      `Region "${regionName}" is not available in the active selector.`
    );
    return;
  }

  activeSelect.value = regionName;

  activeSelect.dispatchEvent(
    new Event("change", { bubbles: true })
  );

  highlightSelectedSvgRegion(regionName);
}

function connectSvgRegions() {
  const svgObject =
    document.getElementById("region-svg-object");

  if (!svgObject) return;

  REGION_SVG_DOCUMENT = svgObject.contentDocument;

  if (!REGION_SVG_DOCUMENT) return;

  REGION_SVG_PATHS = Array.from(
    REGION_SVG_DOCUMENT.querySelectorAll(".region")
  );

  REGION_SVG_PATHS.forEach(path => {
    const regionName =
      path.dataset.regionName;

    if (!regionName) return;

    path.addEventListener("click", () => {
      selectRegionFromSvg(regionName);
    });

    path.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectRegionFromSvg(regionName);
      }
    });
  });

  refreshSvgRegionSelection();
}

function connectRegionSelectors() {
  const scenarioRegion =
    document.getElementById("cid-region");

  const evaluationRegion =
    document.getElementById("eval-region");

  if (scenarioRegion) {
    scenarioRegion.addEventListener("change", () => {
      const scenarioPanel =
        document.getElementById("scenario-projections");

      if (scenarioPanel?.classList.contains("active")) {
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

      if (evaluationPanel?.classList.contains("active")) {
        highlightSelectedSvgRegion(
          evaluationRegion.value
        );
      }
    });
  }
}

function refreshSvgRegionSelection() {
  const activeSelect = getActiveRegionSelect();

  if (activeSelect?.value) {
    highlightSelectedSvgRegion(
      activeSelect.value
    );
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const svgObject =
    document.getElementById("region-svg-object");

  if (svgObject) {
    svgObject.addEventListener(
      "load",
      connectSvgRegions
    );
  }

  connectRegionSelectors();
});
