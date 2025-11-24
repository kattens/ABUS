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

  // 🔹 Global cache for model_scores.json (for browser + recommender)
  let modelData = null;

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

  // Rendering a single model (unchanged)
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

  // 🔢 ABUS score computation helper
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
    // Return 0–100 for easier comparison
    return (total / maxTotal) * 100;
  }

  // 🔍 Filter + rank models based on constraints
  function filterAndRankModels(constraints = {}) {
    if (!modelData) return [];

    const out = [];

    for (const [name, model] of Object.entries(modelData)) {
      const bio = model.bioinformatics_relevance?.subfeatures || {};
      const usability = model.usability?.subfeatures || {};

      const structScore = bio.structural_awareness?.score ?? 0;
      const codeScore   = usability.code_availability?.score ?? 0;

      if (constraints.structural_awareness_min != null &&
          structScore < constraints.structural_awareness_min) {
        continue;
      }
      if (constraints.code_availability_min != null &&
          codeScore < constraints.code_availability_min) {
        continue;
      }

      const abusScore = computeAbusScore(model);
      out.push({ name, model, abusScore });
    }

    out.sort((a, b) => b.abusScore - a.abusScore);
    return out;
  }

  // ✔ LOAD MODELS FROM STATIC JSON FILE
  async function loadModels() {
    if (!modelSelect) {
      console.warn("[models] #modelSelect not found; skipping load");
      return;
    }

    setStatus("loading models…");

    try {
      // Load static JSON file
      const data = await fetchJSON("data/model_scores.json");

      if (!data || typeof data !== "object") {
        throw new Error("model_scores.json must be an object mapping name → details");
      }

      // Cache globally for recommender use
      modelData = data;

      // Extract model names
      const modelNames = Object.keys(data);

      // Reset dropdown
      modelSelect.innerHTML = "";

      const ph = document.createElement("option");
      ph.value = "";
      ph.textContent = "— select a model —";
      modelSelect.appendChild(ph);

      // Add models
      for (const name of modelNames) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        modelSelect.appendChild(opt);
      }

      setStatus(`loaded ${modelNames.length} models`);

      // Auto-load first model
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

  // ✔ LOAD FULL MODEL DETAILS FROM JSON
  async function loadFull() {
    if (!modelSelect || !modelView) return;

    const name = modelSelect.value;
    if (!name) return; // ignore placeholder

    setStatus(`loading ${name}…`);
    modelView.innerHTML = "";
    if (raw) raw.textContent = "";

    try {
      // Reuse cache if available; otherwise refetch
      let data = modelData;
      if (!data) {
        data = await fetchJSON("data/model_scores.json");
        modelData = data;
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

  // (HTML panel is optional – only runs if elements exist)
  const filterStruct       = document.getElementById("filterStruct");
  const filterCode         = document.getElementById("filterCode");
  const btnRecommend       = document.getElementById("btnRecommend");
  const recommendResultsEl = document.getElementById("recommendResults");

  function getCurrentConstraints() {
    const c = {};
    const sVal = filterStruct?.value;
    const cVal = filterCode?.value;

    if (sVal !== "" && sVal != null) c.structural_awareness_min = Number(sVal);
    if (cVal !== "" && cVal != null) c.code_availability_min    = Number(cVal);

    return c;
  }

  function renderRecommendations(list) {
    if (!recommendResultsEl) return;
    if (!list.length) {
      recommendResultsEl.innerHTML = `<div class="muted">No models match these constraints.</div>`;
      return;
    }

    const lines = [];
    lines.push(`<div class="model-grid">`);
    for (const { name, model, abusScore } of list.slice(0, 8)) {
      const bio = model.bioinformatics_relevance?.subfeatures || {};
      const usability = model.usability?.subfeatures || {};
      const structScore = bio.structural_awareness?.score ?? 0;
      const codeScore   = usability.code_availability?.score ?? 0;

      lines.push(`
        <div class="cat">
          <h4>
            <span>${name}</span>
            <span class="pill wt">ABUS: ${abusScore.toFixed(1)}</span>
          </h4>
          <div class="sub muted">
            Structural awareness: ${structScore} / 2,
            Code availability: ${codeScore} / 2
          </div>
        </div>
      `);
    }
    lines.push(`</div>`);
    recommendResultsEl.innerHTML = lines.join("");
  }

  async function runRecommender() {
    if (!modelData) {
      await loadModels();
    }
    const constraints = getCurrentConstraints();
    const ranked = filterAndRankModels(constraints);
    renderRecommendations(ranked);
  }

  if (btnRecommend) {
    btnRecommend.addEventListener("click", (ev) => {
      ev.preventDefault();
      runRecommender();
    });
  }

  // INGEST & SCORING UI (UI only – no backend)
  (function () {
    const ingestForm = document.getElementById("ingestForm");
    if (!ingestForm) return;

    const nameEl    = document.getElementById("ingestName");
    const textEl    = document.getElementById("ingestText");
    const statusEl2 = document.getElementById("ingestStatus");
    const previewEl = document.getElementById("ingestPreview");
    const btnPrev   = document.getElementById("btnPreview");
    const btnSave   = document.getElementById("btnSave");
    const weightInputs = Array.from(ingestForm.querySelectorAll("input.wgt"));

    function setIngestStatus(s) {
      if (statusEl2) statusEl2.textContent = s;
      console.log("[ingest]", s);
    }

    function collectWeights() {
      const w = {};
      for (const input of weightInputs) {
        const cat = input.getAttribute("data-cat");
        if (cat && input.value !== "") {
          const val = Number(input.value);
          if (!Number.isNaN(val)) w[cat] = val;
        }
      }
      return Object.keys(w).length ? w : undefined;
    }

    // Right now this is just a placeholder since there's no API.
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
