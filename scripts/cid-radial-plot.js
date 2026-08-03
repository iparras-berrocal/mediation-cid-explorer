let CID_DATA = null;
let CID_ANOMALIES = null;
let SELECTED_CID = null;

const width = 1050;
const height = 620;
const radius = 220;
const centerX = 360;
const centerY = 320;

const CID_ORDER = [
  "SST",
  "SBT",
  "Nmonth_sst_p99",
  "Nmonth_sst_p01",
  "NMONTH_T20m",
  "SSS",
  "MLD",
  "SI",
  "Nmonth_ws_p99",
  "CUIfav"
];

const CID_LABELS = {
  SST: "SST",
  SBT: "SBT",
  Nmonth_sst_p99: "NM SST>P99",
  Nmonth_sst_p01: "NM SST<P1",
  NMONTH_T20m: "NM T₂₀ₘ >25°C",
  SSS: "SSS",
  MLD: "MLDₘₐₓ",
  SI: "SI",
  Nmonth_ws_p99: "NMτ>P99",
  CUIfav: "CUI"
};

const CID_DEFINITIONS = {
  SST: "Sea Surface Temperature",
  SBT: "Sea Bottom Temperature",
  Nmonth_sst_p99:
    "Number of months per year with sea surface temperature above the 99th percentile",
  Nmonth_sst_p01:
    "Number of months per year with sea surface temperature below the 1st percentile",
  NMONTH_T20m:
    "Number of months per year with temperature at 20 m depth above 25°C",
  SSS: "Sea Surface Salinity",
  MLD: "Annual Maximum Mixed Layer Depth",
  SI: "Stratification Index",
  Nmonth_ws_p99:
    "Number of months per year with wind stress above the 99th percentile",
  CUIfav: "Favorable Coastal Upwelling Index"
};

const REGION_ORDER = [
  "North-western Mediterranean",
  "North-western Mediterranean coast",
  "French Mediterranean coast",
  "GFCM Corsica",
  "GFCM Gulf of Lion",
  "GFCM Ligurian–Tyrrhenian",
  "GFCM Northern Spain",
  "Calanques MPA",
  "Corsica MPA",
  "Gulf of Lion MPA",
  "Port-Cros MPA"
];

const LIKE_ORDER = [
  "High confidence of increase",
  "Low confidence of increase",
  "Low confidence in direction of change",
  "Low confidence of decrease",
  "High confidence of decrease"
];

const IPCC_COLOR_MAP = {
  "High confidence of increase": "#F89C2E",
  "Low confidence of increase": "#FDD494",
  "Low confidence in direction of change": "#FFFFFF",
  "Low confidence of decrease": "#9ECAE1",
  "High confidence of decrease": "#2C7FB8"
};

const CONFIDENCE_DEFINITIONS = {
  "High confidence of increase":
    "≥80% agreement on direction of change and ≥80% agreement on significance of change; positive change.",

  "Low confidence of increase":
    "≥80% agreement on direction of change but <80% agreement on significance of change; positive change.",

  "Low confidence in direction of change":
    "<80% agreement on direction of change.",

  "Low confidence of decrease":
    "≥80% agreement on direction of change but <80% agreement on significance of change; negative change.",

  "High confidence of decrease":
    "≥80% agreement on direction of change and ≥80% agreement on significance of change; negative change."
};

const TREND_DEFINITIONS = {
  "Past upward trend":
    "Significant positive observational trend detected over the historical period.",

  "Past downward trend":
    "Significant negative observational trend detected over the historical period."
};

const GWL_COLORS = {
  "1.5": "#FDB863",
  "2": "#F46D43",
  "3": "#D73027",
  "4": "#7F0000"
};

const container = document.getElementById("cid-radial-plot");
const detailPanel = document.getElementById("cid-detail-panel");

if (!container) {
  throw new Error(
    'The element with id "cid-radial-plot" was not found in index.html.'
  );
}

container.innerHTML = "";

const svg = document.createElementNS(
  "http://www.w3.org/2000/svg",
  "svg"
);

svg.setAttribute("width", width);
svg.setAttribute("height", height);
svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
svg.style.maxWidth = "100%";
svg.style.height = "auto";

container.appendChild(svg);

/* =========================================================
   HTML TOOLTIP
   ========================================================= */

const tooltipDiv = document.createElement("div");

tooltipDiv.style.position = "fixed";
tooltipDiv.style.pointerEvents = "none";
tooltipDiv.style.background = "rgba(16, 32, 51, 0.96)";
tooltipDiv.style.color = "white";
tooltipDiv.style.padding = "8px 10px";
tooltipDiv.style.borderRadius = "8px";
tooltipDiv.style.fontSize = "12px";
tooltipDiv.style.lineHeight = "1.35";
tooltipDiv.style.maxWidth = "320px";
tooltipDiv.style.zIndex = "9999";
tooltipDiv.style.opacity = "0";
tooltipDiv.style.transition = "opacity 0.12s ease";

document.body.appendChild(tooltipDiv);

function addHtmlTooltip(el, text) {
  el.addEventListener("mouseenter", event => {
    tooltipDiv.textContent = text;
    tooltipDiv.style.opacity = "1";
    tooltipDiv.style.left = `${event.clientX + 14}px`;
    tooltipDiv.style.top = `${event.clientY + 14}px`;
  });

  el.addEventListener("mousemove", event => {
    tooltipDiv.style.left = `${event.clientX + 14}px`;
    tooltipDiv.style.top = `${event.clientY + 14}px`;
  });

  el.addEventListener("mouseleave", () => {
    tooltipDiv.style.opacity = "0";
  });
}

/* =========================================================
   SVG HELPERS
   ========================================================= */

function makeEl(name, attrs = {}) {
  const el = document.createElementNS(
    "http://www.w3.org/2000/svg",
    name
  );

  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }

  return el;
}

function makeSvgTitle(text) {
  const title = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "title"
  );

  title.textContent = text;
  return title;
}

function polar(r, angleDeg) {
  const angle = angleDeg * Math.PI / 180;

  return {
    x: centerX + r * Math.cos(angle),
    y: centerY + r * Math.sin(angle)
  };
}

function polygonPoints(points) {
  return points
    .map(point => `${point.x},${point.y}`)
    .join(" ");
}

function clearSvg() {
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }
}

function drawRadialMessage(message, color = "#5b6b7f") {
  clearSvg();

  const text = makeEl("text", {
    x: width / 2,
    y: height / 2,
    "text-anchor": "middle",
    "font-size": 16,
    fill: color
  });

  text.textContent = message;
  svg.appendChild(text);
}

/* =========================================================
   REGION SELECTOR
   ========================================================= */

function getAvailableRegions(method) {
  const methodData = CID_DATA?.data?.[method];

  if (!methodData) return [];

  const jsonRegions = Object.keys(methodData);

  const orderedRegions = REGION_ORDER.filter(region =>
    jsonRegions.includes(region)
  );

  const additionalRegions = jsonRegions.filter(region =>
    !REGION_ORDER.includes(region)
  );

  return [...orderedRegions, ...additionalRegions];
}

function populateRegionSelector(method, preferredRegion = null) {
  const regionSelect = document.getElementById("cid-region");

  if (!regionSelect) return;

  const availableRegions = getAvailableRegions(method);

  regionSelect.innerHTML = "";

  availableRegions.forEach(region => {
    const option = document.createElement("option");

    option.value = region;
    option.textContent = region;

    regionSelect.appendChild(option);
  });

  if (
    preferredRegion &&
    availableRegions.includes(preferredRegion)
  ) {
    regionSelect.value = preferredRegion;
  } else if (availableRegions.length > 0) {
    regionSelect.value = availableRegions[0];
  }
}

/* =========================================================
   RADIAL GEOMETRY
   ========================================================= */

function getCidAngles() {
  const step = 360 / CID_ORDER.length;
  const angles = {};

  for (let i = 0; i < CID_ORDER.length; i++) {
    const cid = CID_ORDER[i];

    angles[cid] = [
      -108 + i * step,
      -108 + (i + 1) * step
    ];
  }

  return angles;
}

function drawPolygonRingGuides(nRings, nSides) {
  const step = 360 / nSides;

  for (let i = 0; i < nRings; i++) {
    const r = radius - i * (radius / nRings);
    const points = [];

    for (let j = 0; j < nSides; j++) {
      points.push(
        polar(r, -108 + j * step)
      );
    }

    svg.appendChild(
      makeEl("polygon", {
        points: polygonPoints(points),
        fill: "none",
        stroke: "lightgrey",
        "stroke-width": 1
      })
    );
  }
}

function drawSectorPolygon(
  rOuter,
  rInner,
  angle1,
  angle2,
  fill
) {
  const points = [
    polar(rOuter, angle1),
    polar(rOuter, angle2),
    polar(rInner, angle2),
    polar(rInner, angle1)
  ];

  svg.appendChild(
    makeEl("polygon", {
      points: polygonPoints(points),
      fill: fill || "#ffffff",
      stroke: "black",
      "stroke-width": 0.8
    })
  );
}

function drawClickableCidSector(angle1, angle2, cid) {
  const points = [
    polar(radius, angle1),
    polar(radius, angle2),
    polar(0, angle2),
    polar(0, angle1)
  ];

  const hitArea = makeEl("polygon", {
    points: polygonPoints(points),
    fill: "transparent",
    stroke: "none",
    cursor: "pointer"
  });

  hitArea.addEventListener("click", () => {
    SELECTED_CID = cid;
    updatePlot();
  });

  hitArea.addEventListener("mouseenter", () => {
    hitArea.setAttribute(
      "fill",
      "rgba(11, 114, 133, 0.08)"
    );
  });

  hitArea.addEventListener("mouseleave", () => {
    hitArea.setAttribute("fill", "transparent");
  });

  svg.appendChild(hitArea);
}

/* =========================================================
   CID LABELS
   ========================================================= */

function drawCidLabels(angles) {
  for (const cid of CID_ORDER) {
    const cidAngles = angles[cid];

    if (!cidAngles) continue;

    const [angle1, angle2] = cidAngles;
    const mid = (angle1 + angle2) / 2;

    let labelRadius = radius * 1.10;

    if (cid === "SST") {
      labelRadius = radius * 1.08;
    }

    if (cid === "SBT") {
      labelRadius = radius * 1.09;
    }

    if (cid === "Nmonth_sst_p99") {
      labelRadius = radius * 1.18;
    }

    if (cid === "Nmonth_sst_p01") {
      labelRadius = radius * 1.18;
    }

    if (cid === "NMONTH_T20m") {
      labelRadius = radius * 1.12;
    }

    if (cid === "SSS") {
      labelRadius = radius * 1.08;
    }

    if (cid === "MLD") {
      labelRadius = radius * 1.08;
    }

    if (cid === "SI") {
      labelRadius = radius * 1.08;
    }

    if (cid === "Nmonth_ws_p99") {
      labelRadius = radius * 1.10;
    }

    if (cid === "CUIfav") {
      labelRadius = radius * 1.08;
    }

    const point = polar(labelRadius, mid);

    const text = makeEl("text", {
      x: point.x,
      y: point.y,
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      "font-size": 14,
      "font-weight": "bold",
      fill:
        cid === SELECTED_CID
          ? "#075969"
          : "gray",
      cursor: "pointer"
    });

    text.textContent =
      CID_LABELS[cid] || cid;

    text.addEventListener("click", () => {
      SELECTED_CID = cid;
      updatePlot();
    });

    addHtmlTooltip(
      text,
      CID_DEFINITIONS[cid] ||
        "Definition not available."
    );

    svg.appendChild(text);
  }
}

/* =========================================================
   GWL LABELS
   ========================================================= */

function drawGwlLabels(gwls) {
  const labels = [
    "Hist.",
    ...gwls.slice(1).map(gwl => `+${gwl}°C`)
  ];

  const n = gwls.length;
  const ringSize = radius / n;
  const angle = -72;

  for (let i = 0; i < n; i++) {
    const r = radius - (i + 0.5) * ringSize;
    const point = polar(r, angle);

    const text = makeEl("text", {
      x: point.x,
      y: point.y,
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      "font-size": 11,
      "font-weight": "bold",
      fill: "black"
    });

    text.textContent =
      labels[i] || gwls[i] || "";

    svg.appendChild(text);
  }
}

/* =========================================================
   TREND ARROWS
   ========================================================= */

function addArrowMarker() {
  const defs = makeEl("defs");

  const marker = makeEl("marker", {
    id: "arrowhead",
    markerWidth: 8,
    markerHeight: 6,
    refX: 7,
    refY: 3,
    orient: "auto"
  });

  marker.appendChild(
    makeEl("polygon", {
      points: "0 0, 8 3, 0 6",
      fill: "black"
    })
  );

  defs.appendChild(marker);
  svg.appendChild(defs);
}

function drawTrendArrow(angle1, angle2, trend) {
  if (
    !trend ||
    !trend.significant ||
    !trend.direction
  ) {
    return;
  }

  const mid = (angle1 + angle2) / 2;
  const ringSize = radius / 5;
  const r = radius - 0.55 * ringSize;
  const centre = polar(r, mid);

  const arrowAngle =
    trend.direction === "up"
      ? -45
      : 45;

  const len = 22;
  const dx =
    Math.cos(arrowAngle * Math.PI / 180) * len;
  const dy =
    Math.sin(arrowAngle * Math.PI / 180) * len;

  svg.appendChild(
    makeEl("line", {
      x1: centre.x - dx / 2,
      y1: centre.y - dy / 2,
      x2: centre.x + dx / 2,
      y2: centre.y + dy / 2,
      stroke: "black",
      "stroke-width": 1.6,
      "marker-end": "url(#arrowhead)"
    })
  );
}

function drawLegendArrow(x, y, direction) {
  const angle =
    direction === "up"
      ? -45
      : 45;

  const len = 16;
  const dx =
    Math.cos(angle * Math.PI / 180) * len;
  const dy =
    Math.sin(angle * Math.PI / 180) * len;

  const line = makeEl("line", {
    x1: x - dx / 2,
    y1: y - dy / 2,
    x2: x + dx / 2,
    y2: y + dy / 2,
    stroke: "black",
    "stroke-width": 1.5,
    "marker-end": "url(#arrowhead)",
    cursor: "help"
  });

  svg.appendChild(line);

  return line;
}

/* =========================================================
   TITLE AND LEGENDS
   ========================================================= */

function drawTitle(region) {
  const titleSize =
    region.length > 32
      ? 17
      : 22;

  const text = makeEl("text", {
    x: centerX,
    y: 42,
    "text-anchor": "middle",
    "font-size": titleSize,
    "font-weight": "600",
    fill: "black"
  });

  text.textContent = region;
  svg.appendChild(text);
}

function drawLegend() {
  const x = 690;
  let y = 180;

  svg.appendChild(
    makeEl("rect", {
      x: x - 25,
      y: y - 40,
      width: 350,
      height: 165,
      fill: "white",
      stroke: "#cccccc",
      "stroke-width": 1
    })
  );

  const title = makeEl("text", {
    x,
    y: y - 18,
    "font-size": 14,
    "font-weight": "bold"
  });

  title.textContent =
    "Key for level of confidence in future changes";

  svg.appendChild(title);

  y += 4;

  for (const label of LIKE_ORDER) {
    const definition =
      CONFIDENCE_DEFINITIONS[label] || "";

    const swatch = makeEl("rect", {
      x,
      y,
      width: 28,
      height: 13,
      fill: IPCC_COLOR_MAP[label],
      stroke: "black",
      "stroke-width": 0.8,
      cursor: "help"
    });

    addHtmlTooltip(
      swatch,
      definition
    );

    svg.appendChild(swatch);

    const text = makeEl("text", {
      x: x + 42,
      y: y + 11,
      "font-size": 14,
      cursor: "help"
    });

    text.textContent = label;

    addHtmlTooltip(
      text,
      definition
    );

    svg.appendChild(text);

    y += 23;
  }

  const box2Y = 360;

  svg.appendChild(
    makeEl("rect", {
      x: x - 25,
      y: box2Y - 30,
      width: 350,
      height: 72,
      fill: "white",
      stroke: "#cccccc",
      "stroke-width": 1
    })
  );

  const title2 = makeEl("text", {
    x,
    y: box2Y - 10,
    "font-size": 14,
    "font-weight": "bold"
  });

  title2.textContent =
    "Key for observational trend evidence";

  svg.appendChild(title2);

  const col1X = x + 5;
  const col2X = x + 160;
  const rowY = box2Y + 22;

  const upArrow =
    drawLegendArrow(
      col1X,
      rowY,
      "up"
    );

  addHtmlTooltip(
    upArrow,
    TREND_DEFINITIONS["Past upward trend"]
  );

  const upText = makeEl("text", {
    x: col1X + 20,
    y: rowY + 4,
    "font-size": 14,
    cursor: "help"
  });

  upText.textContent =
    "Past upward trend";

  addHtmlTooltip(
    upText,
    TREND_DEFINITIONS["Past upward trend"]
  );

  svg.appendChild(upText);

  const downArrow =
    drawLegendArrow(
      col2X,
      rowY,
      "down"
    );

  addHtmlTooltip(
    downArrow,
    TREND_DEFINITIONS["Past downward trend"]
  );

  const downText = makeEl("text", {
    x: col2X + 20,
    y: rowY + 4,
    "font-size": 14,
    cursor: "help"
  });

  downText.textContent =
    "Past downward trend";

  addHtmlTooltip(
    downText,
    TREND_DEFINITIONS["Past downward trend"]
  );

  svg.appendChild(downText);
}

/* =========================================================
   RADIAL PLOT
   ========================================================= */

function drawRadial(method, region) {
  clearSvg();
  addArrowMarker();

  const metadata =
    CID_DATA?.metadata;

  const data =
    CID_DATA?.data?.[method]?.[region];

  if (!metadata) {
    drawRadialMessage(
      "CID metadata are not available.",
      "#b42318"
    );

    return;
  }

  if (!data) {
    drawRadialMessage(
      `No projection data available for ${region} and ${formatMethod(method)}.`,
      "#b42318"
    );

    return;
  }

  const angles = getCidAngles();
  const gwls =
    Array.isArray(metadata.gwls)
      ? metadata.gwls
      : [];

  if (gwls.length === 0) {
    drawRadialMessage(
      "No global warming levels are available.",
      "#b42318"
    );

    return;
  }

  const nRings = gwls.length;
  const ringSize = radius / nRings;

  drawTitle(region);
  drawPolygonRingGuides(
    nRings,
    CID_ORDER.length
  );

  for (const cid of CID_ORDER) {
    const cidData = data[cid];

    if (!cidData) continue;

    const fills =
      Array.isArray(cidData.fills)
        ? cidData.fills
        : [];

    const cidAngles = angles[cid];

    if (!cidAngles) continue;

    const [angle1, angle2] = cidAngles;

    for (let i = 0; i < fills.length; i++) {
      const rOuter =
        radius - i * ringSize;

      const rInner =
        radius - (i + 1) * ringSize;

      drawSectorPolygon(
        rOuter,
        rInner,
        angle1,
        angle2,
        fills[i]
      );
    }

    drawClickableCidSector(
      angle1,
      angle2,
      cid
    );

    drawTrendArrow(
      angle1,
      angle2,
      cidData.trend
    );
  }

  drawCidLabels(angles);
  drawGwlLabels(gwls);
  drawLegend();
}

/* =========================================================
   CID DETAIL PANEL
   ========================================================= */

function formatMethod(method) {
  return method
    .replace("method_", "Method ")
    .toUpperCase();
}

function showCidDetail(cid) {
  if (
    !CID_ANOMALIES ||
    !detailPanel
  ) {
    return;
  }

  const method =
    document.getElementById("cid-method")?.value;

  const region =
    document.getElementById("cid-region")?.value;

  if (!method || !region) return;

  const cidInfo =
    CID_ANOMALIES?.[method]?.[region]?.[cid];

  if (!cidInfo) {
    detailPanel.innerHTML = `
      <h3>${CID_LABELS[cid] || cid}</h3>

      <p>
        <strong>Definition:</strong>
        ${CID_DEFINITIONS[cid] || "Definition not available."}
      </p>

      <p style="margin-top:6px;">
        No anomaly data available for this CID, method and region.
      </p>
    `;

    return;
  }

  function fmtPanel(value) {
    if (
      value === null ||
      value === undefined ||
      !isFinite(value)
    ) {
      return "NA";
    }

    return Number(value).toFixed(2);
  }

  const baseline =
    cidInfo.baseline || {};

  const baselineText =
    baseline.point !== null &&
    baseline.point !== undefined &&
    isFinite(baseline.point)
      ? `
        <p style="margin-top:6px;">
          <strong>GWL1 baseline:</strong>
          Mean ${fmtPanel(baseline.point)} ${cidInfo.unit || ""} ·
          P10–P90 ${fmtPanel(baseline.p10)} to ${fmtPanel(baseline.p90)} ·
          Min–Max ${fmtPanel(baseline.min)} to ${fmtPanel(baseline.max)} ·
          n=${baseline.n ?? "NA"}
        </p>
      `
      : "";

  detailPanel.innerHTML = `
    <h3>
      ${CID_LABELS[cid] || cid}

      <span
        style="
          font-size:13px;
          font-weight:400;
          color:#5b6b7f;
          margin-left:8px;
        "
      >
        — anomalies relative to GWL1 baseline
      </span>
    </h3>

    <p>
      <strong>Definition:</strong>
      ${CID_DEFINITIONS[cid] || "Definition not available."}
    </p>

    <p style="margin-top:6px;">
      <strong>Region:</strong> ${region} ·
      <strong>Method:</strong> ${formatMethod(method)} ·
      <strong>Units:</strong> ${cidInfo.unit || ""}
    </p>

    ${baselineText}

    <div
      id="cid-anomaly-plot"
      style="margin-top:14px;"
    ></div>
  `;

  drawAnomalyPlot(cidInfo);
}

/* =========================================================
   ANOMALY PLOT
   ========================================================= */

function drawAnomalyPlot(cidInfo) {
  const plot =
    document.getElementById("cid-anomaly-plot");

  if (!plot) return;

  plot.innerHTML = "";

  const w = 820;
  const h = 250;

  const margin = {
    top: 28,
    right: 60,
    bottom: 48,
    left: 75
  };

  const innerW =
    w - margin.left - margin.right;

  const innerH =
    h - margin.top - margin.bottom;

  const gwls = [
    "1.5",
    "2",
    "3",
    "4"
  ];

  const values = gwls
    .map(gwl => cidInfo?.gwls?.[gwl])
    .filter(item =>
      item &&
      item.point !== null &&
      item.point !== undefined &&
      isFinite(item.point)
    );

  if (values.length === 0) {
    plot.innerHTML =
      "<p>No valid anomaly values available.</p>";

    return;
  }

  const allVals = [];

  values.forEach(item => {
    [
      "min",
      "max",
      "p10",
      "p90",
      "point"
    ].forEach(key => {
      const value = item[key];

      if (
        value !== null &&
        value !== undefined &&
        isFinite(value)
      ) {
        allVals.push(Number(value));
      }
    });
  });

  if (allVals.length === 0) {
    plot.innerHTML =
      "<p>No valid anomaly values available.</p>";

    return;
  }

  const absMax = Math.max(
    ...allVals.map(Math.abs),
    0.1
  );

  const xMax = absMax * 1.15;
  const xMin = -xMax;

  const xScale = value =>
    margin.left +
    ((value - xMin) / (xMax - xMin)) *
      innerW;

  const yScale = index =>
    margin.top +
    (index + 0.5) *
      (innerH / gwls.length);

  const detailSvg =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );

  detailSvg.setAttribute("width", w);
  detailSvg.setAttribute("height", h);
  detailSvg.setAttribute(
    "viewBox",
    `0 0 ${w} ${h}`
  );

  detailSvg.style.maxWidth = "100%";
  detailSvg.style.height = "auto";

  plot.appendChild(detailSvg);

  function add(name, attrs = {}) {
    const el =
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        name
      );

    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }

    detailSvg.appendChild(el);

    return el;
  }

  function fmt(value) {
    if (
      value === null ||
      value === undefined ||
      !isFinite(value)
    ) {
      return "NA";
    }

    return Number(value).toFixed(2);
  }

  add("line", {
    x1: xScale(0),
    y1: margin.top,
    x2: xScale(0),
    y2: margin.top + innerH,
    stroke: "#102033",
    "stroke-width": 1
  });

  add("line", {
    x1: margin.left,
    y1: margin.top + innerH,
    x2: margin.left + innerW,
    y2: margin.top + innerH,
    stroke: "#ccd6e0",
    "stroke-width": 1
  });

  gwls.forEach((gwl, index) => {
    const item =
      cidInfo?.gwls?.[gwl];

    if (
      !item ||
      item.point === null ||
      item.point === undefined ||
      !isFinite(item.point)
    ) {
      return;
    }

    const y = yScale(index);

    const color =
      GWL_COLORS[gwl] || "#D73027";

    const tooltip =
      `GWL ${gwl}°C\n` +
      `Mean: ${fmt(item.point)} ${cidInfo.unit || ""}\n` +
      `P10–P90: ${fmt(item.p10)} to ${fmt(item.p90)}\n` +
      `Min–Max: ${fmt(item.min)} to ${fmt(item.max)}`;

    add("text", {
      x: margin.left - 14,
      y: y + 4,
      "text-anchor": "end",
      "font-size": 13,
      fill: "#102033",
      "font-weight": "600"
    }).textContent = `GWL ${gwl}`;

    if (
      isFinite(item.min) &&
      isFinite(item.max)
    ) {
      const minMax = add("line", {
        x1: xScale(item.min),
        y1: y,
        x2: xScale(item.max),
        y2: y,
        stroke: color,
        "stroke-width": 2,
        opacity: 0.85,
        cursor: "pointer"
      });

      minMax.appendChild(
        makeSvgTitle(tooltip)
      );

      minMax.addEventListener(
        "mouseenter",
        () => {
          minMax.style.transition =
            "all 0.15s ease";

          minMax.setAttribute(
            "stroke-width",
            3
          );

          minMax.setAttribute(
            "opacity",
            1
          );
        }
      );

      minMax.addEventListener(
        "mouseleave",
        () => {
          minMax.setAttribute(
            "stroke-width",
            2
          );

          minMax.setAttribute(
            "opacity",
            0.85
          );
        }
      );
    }

    if (
      isFinite(item.p10) &&
      isFinite(item.p90)
    ) {
      const p1090 = add("line", {
        x1: xScale(item.p10),
        y1: y,
        x2: xScale(item.p90),
        y2: y,
        stroke: color,
        "stroke-width": 6,
        "stroke-linecap": "round",
        cursor: "pointer"
      });

      p1090.appendChild(
        makeSvgTitle(tooltip)
      );

      p1090.addEventListener(
        "mouseenter",
        () => {
          p1090.style.transition =
            "all 0.15s ease";

          p1090.setAttribute(
            "stroke-width",
            8
          );
        }
      );

      p1090.addEventListener(
        "mouseleave",
        () => {
          p1090.setAttribute(
            "stroke-width",
            6
          );
        }
      );
    }

    const point = add("circle", {
      cx: xScale(item.point),
      cy: y,
      r: 5,
      fill: color,
      stroke: "black",
      "stroke-width": 0.8,
      cursor: "pointer"
    });

    point.appendChild(
      makeSvgTitle(tooltip)
    );

    point.addEventListener(
      "mouseenter",
      () => {
        point.style.transition =
          "all 0.15s ease";

        point.setAttribute(
          "r",
          6.5
        );
      }
    );

    point.addEventListener(
      "mouseleave",
      () => {
        point.setAttribute(
          "r",
          5
        );
      }
    );

    if (
      item.n !== null &&
      item.n !== undefined
    ) {
      const labelX =
        isFinite(item.max)
          ? Math.min(
              xScale(item.max) + 8,
              margin.left + innerW + 35
            )
          : Math.min(
              xScale(item.point) + 8,
              margin.left + innerW + 35
            );

      add("text", {
        x: labelX,
        y: y + 4,
        "font-size": 11,
        fill: color
      }).textContent = `n=${item.n}`;
    }
  });

  const ticks = [
    -xMax,
    -xMax / 2,
    0,
    xMax / 2,
    xMax
  ];

  ticks.forEach(tickValue => {
    const x = xScale(tickValue);

    add("line", {
      x1: x,
      y1: margin.top + innerH,
      x2: x,
      y2: margin.top + innerH + 5,
      stroke: "#102033",
      "stroke-width": 1
    });

    add("text", {
      x,
      y: margin.top + innerH + 22,
      "text-anchor": "middle",
      "font-size": 13,
      fill: "#5b6b7f"
    }).textContent =
      Number(
        tickValue.toFixed(2)
      ).toString();
  });

  add("text", {
    x: margin.left + innerW / 2,
    y: h - 8,
    "text-anchor": "middle",
    "font-size": 14,
    fill: "#5b6b7f"
  }).textContent =
    `Anomaly ${cidInfo.unit || ""}`;

  add("text", {
    x: margin.left,
    y: 16,
    "font-size": 13,
    fill: "#5b6b7f"
  }).textContent =
    "Min–Max (thin), P10–P90 range (thick), ensemble mean (dot), n: number of simulations";
}

/* =========================================================
   MAIN UPDATE
   ========================================================= */

function updatePlot() {
  const methodSelect =
    document.getElementById("cid-method");

  const regionSelect =
    document.getElementById("cid-region");

  if (
    !methodSelect ||
    !regionSelect ||
    !CID_DATA
  ) {
    return;
  }

  const method = methodSelect.value;
  const region = regionSelect.value;

  if (!region) {
    drawRadialMessage(
      `No regions are available for ${formatMethod(method)}.`,
      "#b42318"
    );

    return;
  }

  drawRadial(
    method,
    region
  );

  if (SELECTED_CID) {
    showCidDetail(
      SELECTED_CID
    );
  }
}

/* =========================================================
   DATA LOADING
   ========================================================= */

Promise.all([
  fetch("images/cid_data.json")
    .then(response => {
      if (!response.ok) {
        throw new Error(
          `cid_data.json could not be loaded (${response.status})`
        );
      }

      return response.json();
    }),

  fetch("images/cid_anomalies.json")
    .then(response => {
      if (!response.ok) {
        throw new Error(
          `cid_anomalies.json could not be loaded (${response.status})`
        );
      }

      return response.json();
    })
])
  .then(([cidData, anomalyData]) => {
    CID_DATA = cidData;
    CID_ANOMALIES = anomalyData;

    const methodSelect =
      document.getElementById("cid-method");

    const regionSelect =
      document.getElementById("cid-region");

    if (
      !methodSelect ||
      !regionSelect
    ) {
      throw new Error(
        "The method or region selector could not be found in index.html."
      );
    }

    populateRegionSelector(
      methodSelect.value
    );

    methodSelect.addEventListener(
      "change",
      () => {
        const previousRegion =
          regionSelect.value;

        populateRegionSelector(
          methodSelect.value,
          previousRegion
        );

        updatePlot();
      }
    );

    regionSelect.addEventListener(
      "change",
      updatePlot
    );

    updatePlot();
  })
  .catch(error => {
    console.error(error);

    container.innerHTML = `
      <p
        style="
          padding:20px;
          color:#b42318;
          text-align:center;
        "
      >
        Could not load CID data: ${error.message}
      </p>
    `;
  });
