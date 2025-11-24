// Auto-detect API base:
// For static GitHub Pages, this is no longer used, but we keep it for compatibility.
const apiBase = (location.port === "8000" ? "" : "http://127.0.0.1:8000");
console.log("[boot] apiBase =", apiBase);

document.addEventListener('DOMContentLoaded', () => {
  // Elements used by the Models browser
  const modelSelect = document.getElementById("modelSelect");
  const loadBtn     = document.getElementById("loadBtn");
  const modelView   = document.getElementById("modelView");
  const raw         = document.getElementById("raw");
  const statusEl    = document.getElementById("status");

  // Recommender elements
  const filterGrid         = document.getElementById("filterGrid");
  const btnRecommend       = document.getElementById("btnRecommend");
  const recommendResultsEl = document.getElementById("recommendResults");

  // Global cache for model_scores.json
  let modelData = null;
  let filtersInitialized = false;

  function setStatus(s) {
    if (statusEl) statusEl.textContent = s;
    console.log("[status]", s);
  }

  async function fetchJSON(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText} :: ${text}`);
    }
    return res.json();
  }

  // Rendering a single model (browser view)
  function renderFull(full) {
    if (raw) raw.textContent = JSON.stringify(full, null, 2);
    const wrap = document.createElement("div");
    wrap.className = "model-grid";
    for (const [cat, val] of Object.entries(full || {})) {
      const card = document.createElement("div");
      card.className = "cat";
      const h4 = document.createElement("h4");
      const title = document.createElement("span");
      title.textContent = cat;
      const wt = document.createElement("span");
      wt.className = "pill wt";
      wt.textContent = `weight: ${val?.weight ?? 0}`;
      h4.append(title, wt);
      card.appendChild(h4);

      const subWrap = document.createElement("div");
      for (const [sub, obj] of Object.entries(val?.subfeatures || {})) {
        const row = document.createElement("div");
        row.className = "sub";
        row.innerHTML = `<strong>${sub}</strong> <span class="pill">score: ${
          obj?.score ?? "?"
        }</span>${obj?.note ? `<div class="note">${obj.note}</div>` : ""}`;
        subWrap.appendChild(row);
      }
      card.appendChild(subWrap);
      wrap.appendChild(card);
    }
    modelView.innerHTML = "";
    modelView.appendChild(wrap);
  }

  // ABUS score computation helper (0–100)
  function computeAbusScore(model) {
    if (!model) return 0;
    let total = 0;
    let maxTotal = 0;

    for (const [catName, cat] of Object.entries(model)) {
      const weight = cat?.weight ?? 0;
      const subs = cat?.subfeatures || {};
      const scores = Object.values(subs).map(s => s?.score ?? 0);
      if (!scores.length) continue;

      const avg = scores.reduce((a, b) => a + b, 0) / scores.length; // avg in [0,2]
      const normalized = avg / 2;                                   // [0,1]
      total += weight * normalized;
      maxTotal += weight;
    }

    if (maxTotal === 0) return 0;
    return (total / maxTotal) * 100;
  }

  // Dynamic filter UI: build controls for ALL subfeatures
  function initDynamicFilters() {
    if (!filterGrid || !modelData || filtersInitialized) return;

    const entries = Object.entries(modelData);
    if (!entries.length) return;

    const [sampleName, sampleModel] = entries[0];
    console.log("[filters] building from sample model:", sampleName);

    filterGrid.innerHTML = "";

    for (const [catName, cat] of Object.entries(sampleModel || {})) {
      const catBox = document.createElement("div");
      catBox.className = "filter-category";
      const h4 = document.createElement("h4");
      h4.textContent = catName;
      catBox.appendChild(h4);

      const subsWrap = document.createElement("div");
      subsWrap.className = "filter-subgrid";

      for (const [subName] of Object.entries(cat.subfeatures || {})) {
        const label = document.createElement("label");
        label.className = "muted";
        label.style.display = "block";

        const title = document.createElement("span");
        title.textContent = subName;
        title.style.display = "block";
        title.style.fontSize = "13px";
        title.style.marginBottom = "4px";

        const select = document.createElement("select");
        select.setAttribute("data-cat", catName);
        select.setAttribute("data-sub", subName);
        select.innerHTML = `
          <option value="">any</option>
          <option value="0">≥ 0</option>
          <option value="1">≥ 1</option>
          <option value="2">≥ 2</option>
        `;

        label.appendChild(title);
        label.appendChild(select);
        subsWrap.appendChild(label);
      }

      catBox.appendChild(subsWrap);
      filterGrid.appendChild(catBox);
    }

    filtersInitialized = true;
  }

  // Read constraints from dynamic filter UI
  function getCurrentConstraints() {
    const constraints = {};
    if (!filterGrid) return constraints;

    const selects = filterGrid.querySelectorAll("select[data-cat][data-sub]");
    selects.forEach(sel => {
      if (sel.value === "") return;
      const cat = sel.getAttribute("data-cat");
      const sub = sel.getAttribute("data-sub");
      const key = `${cat}.${sub}`;
      const val = Number(sel.value);
      if (!Number.isNaN(val)) {
        constraints[key] = val; // minimum score
      }
    });

    return constraints;
  }

  // Filter + rank models based on constraints
  function filterAndRankModels(constraints = {}) {
    if (!modelData) return [];

    const out = [];
    const constraintEntries = Object.entries(constraints);

    for (const [name, model] of Object.entries(modelData)) {
      let ok = true;

      for (const [key, minVal] of constraintEntries) {
        const [catName, subName] = key.split(".");
        const subObj = model?.[catName]?.subfeatures?.[subName];
        const score = subObj?.score ?? 0;
        if (score < minVal) {
          ok = false;
          break;
        }
      }

      if (!ok) continue;

      const abusScore = computeAbusScore(model);
      out.push({ name, model, abusScore });
    }

    out.sort((a, b) => b.abusScore - a.abusScore);
    return out;
  }

  function renderRecommendations(list) {
    if (!recommendResultsEl) return;

    if (!list.length) {
      recommendResultsEl.innerHTML = `<div class="muted">No models match these constraints.</div>`;
      return;
    }

    const parts = [];
    parts.push(`<div class="model-grid">`);
    for (const { name, model, abusScore } of list.slice(0, 12)) {
      const abusive = abusScore.toFixed(1);
      parts.push(`
        <div class="cat">
          <h4>
            <span>${name}</span>
            <span class="pill wt">ABUS: ${abusive}</span>
          </h4>
        </div>
      `);
    }
    parts.push(`</div>`);
    recommendResultsEl.innerHTML = parts.join("");
  }

  async function runRecommender() {
    if (!modelData) {
      await loadModels(); // this will also init filters
    }
    const constraints = getCurrentConstraints();
    console.log("[recommender] constraints:", constraints);
    const ranked = filterAndRankModels(constraints);
    renderRecommendations(ranked);
  }

  if (btnRecommend) {
    btnRecommend.addEventListener("click", (ev) => {
      ev.preventDefault();
      runRecommender();
    });
  }

  // Load models from static JSON (browser + filters)
  async function loadModels() {
    if (!modelSelect) {
      console.warn("[models] #modelSelect not found; skipping load");
      return;
    }

    setStatus("loading models…");

    try {
      const data = await fetchJSON("data/model_scores.json");

      if (!data || typeof data !== "object") {
        throw new Error("model_scores.json must be an object mapping name → details");
      }

      modelData = data;

      // Init dynamic filters once we have the data
      initDynamicFilters();

      const modelNames = Object.keys(data);

      modelSelect.innerHTML = "";
      const ph = document.createElement("option");
      ph.value = "";
      ph.textContent = "— select a model —";
      modelSelect.appendChild(ph);

      for (const name of modelNames) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        modelSelect.appendChild(opt);
      }

      setStatus(`loaded ${modelNames.length} models`);

      if (modelNames.length > 0) {
        modelSelect.value = modelNames[0];
        await loadFull();
      } else {
        modelView.innerHTML = "<div class='panel'>No models found.</div>";
      }

    } catch (e) {
      console.error(e);
      setStatus(`error loading models: ${e.message}`);
      if (modelView) modelView.innerHTML = `<pre>${e.message}</pre>`;
    }
  }

  async function loadFull() {
    if (!modelSelect || !modelView) return;

    const name = modelSelect.value;
    if (!name) return;

    setStatus(`loading ${name}…`);
    modelView.innerHTML = "";
    if (raw) raw.textContent = "";

    try {
      let data = modelData;
      if (!data) {
        data = await fetchJSON("data/model_scores.json");
        modelData = data;
        initDynamicFilters();
      }

      const full = data[name];
      if (!full) {
        throw new Error(`Model "${name}" not found in model_scores.json`);
      }

      renderFull(full);
      console.warn("[info] Score API disabled (static JSON mode)");
      setStatus(`loaded ${name}`);

    } catch (e) {
      console.error(e);
      setStatus(`error loading ${name}: ${e.message}`);
      modelView.innerHTML = `<pre>${e.message}</pre>`;
    }
  }

  if (loadBtn) loadBtn.addEventListener("click", loadFull);

  // Expose for other modules
  window.loadModels = loadModels;
  window.loadFull = loadFull;

  // Boot on page load
  loadModels();

  // Ingest & scoring (UI only – no backend)
  (function () {
    const ingestForm = document.getElementById("ingestForm");
    if (!ingestForm) return;

    const statusEl2 = document.getElementById("ingestStatus");
    const previewEl = document.getElementById("ingestPreview");
    const btnPrev   = document.getElementById("btnPreview");
    const btnSave   = document.getElementById("btnSave");

    function setIngestStatus(s) {
      if (statusEl2) statusEl2.textContent = s;
      console.log("[ingest]", s);
    }

    async function doPreview() {
      setIngestStatus("Preview disabled (no backend)");
      previewEl.textContent = "Preview is disabled because this is static GitHub Pages mode.";
    }

    async function doSave() {
      setIngestStatus("Saving disabled (no DB backend)");
      previewEl.textContent = "Saving is disabled because this is static GitHub Pages mode.";
    }

    btnPrev?.addEventListener("click", (ev) => { ev.preventDefault(); doPreview(); });
    btnSave?.addEventListener("click", (ev) => { ev.preventDefault(); doSave(); });
  })();
});
