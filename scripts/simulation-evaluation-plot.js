let SIM_EVAL_DATA = null;

const EVAL_CID_LABELS = {
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

const EVAL_CID_DEFINITIONS = {
  SST: "Sea Surface Temperature",
  SBT: "Sea Bottom Temperature",
  Nmonth_sst_p99: "Number of months per year with sea surface temperature above the 99th percentile",
  Nmonth_sst_p01: "Number of months per year with sea surface temperature below the 1st percentile",
  NMONTH_T20m: "Number of months per year with temperature at 20 m depth above 25°C",
  SSS: "Sea Surface Salinity",
  MLD: "Annual Maximum Mixed Layer Depth",
  SI: "Stratification Index",
  Nmonth_ws_p99: "Number of months per year with wind stress above the 99th percentile",
  CUIfav: "Favorable Coastal Upwelling Index"
};

const OBS_LABELS = {
  "CMEMS_rcp45": "CMEMS",
  "CCI_rcp45": "CCI",
  "ERA5_rcp45": "ERA5"
};

function cleanModelLabel(p) {
  return OBS_LABELS[p.key] || p.label || p.key;
}

function fmtEval(v) {
  if (v === null || v === undefined || !isFinite(v)) return "NA";
  return Number(v).toFixed(2);
}

function fmtEvalY(v) {
  if (v === null || v === undefined || !isFinite(v)) return "NA";
  return Number(v).toExponential(2);
}

function setupSimulationEvaluationControls() {
  const cidSelect = document.getElementById("eval-cid");
  const regionSelect = document.getElementById("eval-region");

  if (!cidSelect || !regionSelect || !SIM_EVAL_DATA) return;

  cidSelect.innerHTML = "";
  regionSelect.innerHTML = "";

  const cidOrder = [
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

  const cids = cidOrder.filter(cid => SIM_EVAL_DATA[cid]);

  cids.forEach(cid => {
    const option = document.createElement("option");
    option.value = cid;
    option.textContent = EVAL_CID_LABELS[cid] || cid;
    option.title = EVAL_CID_DEFINITIONS[cid] || cid;
    cidSelect.appendChild(option);
  });

  cidSelect.addEventListener("change", () => {
    updateEvaluationRegions();
    drawSimulationEvaluationPlot();
  });

  regionSelect.addEventListener("change", drawSimulationEvaluationPlot);

  updateEvaluationRegions();
  drawSimulationEvaluationPlot();
}

function updateEvaluationRegions() {
  const cidSelect = document.getElementById("eval-cid");
  const regionSelect = document.getElementById("eval-region");

  const cid = cidSelect.value;
  const currentRegion = regionSelect.value;

  regionSelect.innerHTML = "";

  const regions = Object.keys(SIM_EVAL_DATA[cid] || {});

  regions.forEach(region => {
    const option = document.createElement("option");
    option.value = region;
    option.textContent = region;
    regionSelect.appendChild(option);
  });

  if (regions.includes(currentRegion)) {
    regionSelect.value = currentRegion;
  }
}

function drawSimulationEvaluationPlot() {
  const container = document.getElementById("simulation-evaluation-plot");
  const cid = document.getElementById("eval-cid")?.value;
  const region = document.getElementById("eval-region")?.value;

  if (!container || !cid || !region || !SIM_EVAL_DATA) return;

  const data = SIM_EVAL_DATA?.[cid]?.[region];

  container.innerHTML = "";

  if (!data || !data.points || data.points.length === 0) {
    container.innerHTML = "<p>No simulation evaluation data available.</p>";
    return;
  }

  const w = 1080;
  const h = 520;
  const margin = { top: 58, right: 210, bottom: 82, left: 92 };
  const innerW = w - margin.left - margin.right;
  const innerH = h - margin.top - margin.bottom;

  const ref = data.reference || {};

  const points = data.points.filter(p => {
    if (cid === "SSS" && p.key && p.key.startsWith("ORAS5")) return false;
    return p.x !== null && p.y !== null && isFinite(p.x) && isFinite(p.y);
  });

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);

  if (isFinite(ref.x)) xs.push(ref.x);
  if (isFinite(ref.y)) ys.push(ref.y);

  if (isFinite(ref.x) && isFinite(ref.expert_tol_x)) {
    xs.push(ref.x - ref.expert_tol_x, ref.x + ref.expert_tol_x);
  }

  if (isFinite(ref.y) && isFinite(ref.expert_tol_y)) {
    ys.push(ref.y - ref.expert_tol_y, ref.y + ref.expert_tol_y);
  }

  if (isFinite(ref.x) && isFinite(ref.x_se)) {
    xs.push(ref.x - 4 * ref.x_se, ref.x + 4 * ref.x_se);
  }

  if (isFinite(ref.y) && isFinite(ref.y_se)) {
    ys.push(ref.y - 4 * ref.y_se, ref.y + 4 * ref.y_se);
  }

  let xMin = Math.min(...xs);
  let xMax = Math.max(...xs);
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);

  const xPad = (xMax - xMin || 1) * 0.08;
  const yPad = (yMax - yMin || 1) * 0.12;

  xMin -= xPad;
  xMax += xPad;
  yMin -= yPad;
  yMax += yPad;

  const xScale = x => margin.left + ((x - xMin) / (xMax - xMin)) * innerW;
  const yScale = y => margin.top + innerH - ((y - yMin) / (yMax - yMin)) * innerH;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", w);
  svg.setAttribute("height", h);
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.style.maxWidth = "100%";
  svg.style.height = "auto";
  container.appendChild(svg);

  function add(name, attrs = {}) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v);
    }
    svg.appendChild(el);
    return el;
  }

  function addTitle(el, text) {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "title");
    t.textContent = text;
    el.appendChild(t);
  }

  function drawReferenceBox(cx, cy, dx, dy, fill, lineColor, opacity) {
    if (![cx, cy, dx, dy].every(v => v !== null && isFinite(v))) return;

    const x1 = xScale(cx - dx);
    const x2 = xScale(cx + dx);
    const y1 = yScale(cy + dy);
    const y2 = yScale(cy - dy);

    add("rect", {
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1,
      fill,
      stroke: "none",
      opacity
    });

    add("line", {
      x1,
      y1: margin.top,
      x2: x1,
      y2: margin.top + innerH,
      stroke: lineColor,
      "stroke-width": 1
    });

    add("line", {
      x1: x2,
      y1: margin.top,
      x2,
      y2: margin.top + innerH,
      stroke: lineColor,
      "stroke-width": 1
    });

    add("line", {
      x1: margin.left,
      y1,
      x2: margin.left + innerW,
      y2: y1,
      stroke: lineColor,
      "stroke-width": 1
    });

    add("line", {
      x1: margin.left,
      y1: y2,
      x2: margin.left + innerW,
      y2,
      stroke: lineColor,
      "stroke-width": 1
    });
  }

  drawReferenceBox(
    ref.x,
    ref.y,
    ref.expert_tol_x,
    ref.expert_tol_y,
    "#A8D5A2",
    "#A8D5A2",
    0.35
  );

  if (isFinite(ref.x_se) && isFinite(ref.y_se)) {
    drawReferenceBox(
      ref.x,
      ref.y,
      4 * ref.x_se,
      4 * ref.y_se,
      "#4C8F5A",
      "#4C8F5A",
      0.55
    );
  }

  const ticks = 5;

  for (let i = 0; i <= ticks; i++) {
    const xv = xMin + (i / ticks) * (xMax - xMin);
    const x = xScale(xv);

    add("line", {
      x1: x,
      y1: margin.top,
      x2: x,
      y2: margin.top + innerH,
      stroke: "#edf2f7",
      "stroke-width": 1
    });

    add("text", {
      x,
      y: margin.top + innerH + 24,
      "text-anchor": "middle",
      "font-size": 11,
      fill: "#5b6b7f"
    }).textContent = fmtEval(xv);
  }

  for (let i = 0; i <= ticks; i++) {
    const yv = yMin + (i / ticks) * (yMax - yMin);
    const y = yScale(yv);

    add("line", {
      x1: margin.left,
      y1: y,
      x2: margin.left + innerW,
      y2: y,
      stroke: "#edf2f7",
      "stroke-width": 1
    });

    add("text", {
      x: margin.left - 12,
      y: y + 4,
      "text-anchor": "end",
      "font-size": 11,
      fill: "#5b6b7f"
    }).textContent = fmtEval(yv);
  }

  add("line", {
    x1: margin.left,
    y1: margin.top + innerH,
    x2: margin.left + innerW,
    y2: margin.top + innerH,
    stroke: "#102033",
    "stroke-width": 1
  });

  add("line", {
    x1: margin.left,
    y1: margin.top,
    x2: margin.left,
    y2: margin.top + innerH,
    stroke: "#102033",
    "stroke-width": 1
  });

  if (isFinite(ref.x)) {
    add("line", {
      x1: xScale(ref.x),
      y1: margin.top,
      x2: xScale(ref.x),
      y2: margin.top + innerH,
      stroke: "#102033",
      "stroke-width": 1,
      "stroke-dasharray": "5 4"
    });
  }

  if (isFinite(ref.y)) {
    add("line", {
      x1: margin.left,
      y1: yScale(ref.y),
      x2: margin.left + innerW,
      y2: yScale(ref.y),
      stroke: "#102033",
      "stroke-width": 1,
      "stroke-dasharray": "5 4"
    });
  }

  points.forEach(p => {
    const r = 5;
    const label = cleanModelLabel(p);

    let fill = p.color || "#808080";

    if (
      (cid === "Nmonth_ws_p99" || cid === "CUIfav") &&
      p.key === "ERA5_rcp45"
    ) {
      fill = "black";
    }

    const point = add("circle", {
      cx: xScale(p.x),
      cy: yScale(p.y),
      r,
      fill,
      stroke: "black",
      "stroke-width": 0.9,
      cursor: "pointer"
    });

    addTitle(
      point,
      `${label}
Rating: ${p.rating || "NA"}
X: ${fmtEval(p.x)}
Y: ${fmtEvalY(p.y)}`
    );

    point.addEventListener("mouseenter", () => {
      point.setAttribute("r", r + 2);
    });

    point.addEventListener("mouseleave", () => {
      point.setAttribute("r", r);
    });
  });

  const cidFullName = EVAL_CID_DEFINITIONS[cid] || data.label || EVAL_CID_LABELS[cid] || cid;

  add("text", {
    x: margin.left,
    y: 24,
    "font-size": 17,
    "font-weight": 700,
    fill: "#102033"
  }).textContent = `${cidFullName} (${EVAL_CID_LABELS[cid] || cid}) · ${region}`;

  const boxLegendX = margin.left;
  const boxLegendY = 43;

  add("rect", {
    x: boxLegendX,
    y: boxLegendY - 10,
    width: 18,
    height: 10,
    fill: "#A8D5A2",
    opacity: 0.35,
    stroke: "#A8D5A2"
  });

  add("text", {
    x: boxLegendX + 24,
    y: boxLegendY,
    "font-size": 12,
    fill: "#5b6b7f"
  }).textContent = "±ETTE";

  add("rect", {
    x: boxLegendX + 85,
    y: boxLegendY - 10,
    width: 18,
    height: 10,
    fill: "#4C8F5A",
    opacity: 0.55,
    stroke: "#4C8F5A"
  });

  add("text", {
    x: boxLegendX + 109,
    y: boxLegendY,
    "font-size": 12,
    fill: "#5b6b7f"
  }).textContent = "±4σ";

  add("text", {
    x: margin.left + innerW / 2,
    y: h - 24,
    "text-anchor": "middle",
    "font-size": 13,
    fill: "#102033"
  }).textContent = data.x_label || "Mean at GWL1";

  add("text", {
    x: 22,
    y: margin.top + innerH / 2,
    "text-anchor": "middle",
    "font-size": 13,
    fill: "#102033",
    transform: `rotate(-90 22 ${margin.top + innerH / 2})`
  }).textContent = data.y_label || "Trend";

  const legendX = margin.left + innerW + 26;
  let legendY = margin.top + 12;
  const seenModels = new Set();

  points.forEach(p => {
    const label = cleanModelLabel(p);
    if (seenModels.has(label)) return;
    seenModels.add(label);

    let fill = p.color || "#808080";

    if (
      (cid === "Nmonth_ws_p99" || cid === "CUIfav") &&
      p.key === "ERA5_rcp45"
    ) {
      fill = "black";
    }

    add("circle", {
      cx: legendX,
      cy: legendY,
      r: 4,
      fill,
      stroke: "black",
      "stroke-width": 0.8
    });

    add("text", {
      x: legendX + 12,
      y: legendY + 4,
      "font-size": 11,
      fill: "#5b6b7f"
    }).textContent = label;

    legendY += 16;
  });
}

fetch("images/webtool_simulation_evaluation.json")
  .then(r => r.json())
  .then(data => {
    SIM_EVAL_DATA = data;
    setupSimulationEvaluationControls();
  })
  .catch(error => {
    const container = document.getElementById("simulation-evaluation-plot");
    if (container) {
      container.innerHTML =
        `<p style="color:red;">Could not load simulation evaluation data: ${error}</p>`;
    }
  });
