// Auto-detect API base:
// For static GitHub Pages, this is no longer used, but we keep it for compatibility.
const apiBase = (location.port === "8000" ? "" : "http://127.0.0.1:8000");
console.log("[boot] apiBase =", apiBase);

document.addEventListener("DOMContentLoaded", () => {
  // Elements used by the Models browser
  const modelSelect = document.getElementById("modelSelect");
  const loadBtn     = document.getElementById("loadBtn");
  const modelView   = document.getElementById("modelView");
  const raw         = document.getElementById("raw");
  const statusEl    = document.getElementById("status");

  // Recommender elements (5 ABUS categories)
  const filterAdapt = document.getElementById("filterAdapt");
  const filterBio   = document.getElementById("filterBio");
  const filterUse   = document.getElementById("filterUse");
  const filterComp  = document.getElementById("filterComp");
  const filterOut   = document.getElementById("filterOut");
  const btnRecommend       = document.getElementById("btnRecommend");
  const recommendResultsEl = document.getElementById("recommendResults");

  // Cached JSON from data/model_scores.json
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

  // ---------------------------
  // Rendering single model view
  // ---------------------------
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

  // ---------------------------
  // ABUS helpers
  // ---------------------------

  // Overall ABUS score 0–100 using category weights + average subfeature score
  function computeAbusScore(model) {
    if (!model) return 0;
    let total = 0;
    let maxTotal = 0;

    for (const [, cat] of Object.entries(model)) {
      const weight = cat?.weight ?? 0;
      const subs = cat?.subfeatures || {};
      const scores = Object.values(subs).map((s) => s?.score ?? 0);
      if (!scores.length) continue;

      const avg = scores.reduce((a, b) => a + b, 0) / scores.length; // avg in [0,2]
      const normalized = avg / 2; // [0,1]
      total += weight * normalized;
      maxTotal += weight;
    }

    if (maxTotal === 0) return 0;
    return (total / maxTotal) * 100;
  }

  // Per-category average scores (0–2)
  function computeCategoryAverages(model) {
    const out = {};
    if (!model) return out;

    for (const [catName, cat] of Object.entries(model)) {
      const subs = cat?.subfeatures || {};
      const scores = Object.values(subs).map((s) => s?.score ?? 0);
      if (!scores.length) {
        out[catName] = 0;
      } else {
        out[catName] = scores.reduce((a, b) => a + b, 0) / scores.length;
      }
    }
    return out;
  }

  // ---------------------------
  // Load models from static JSON
  // ---------------------------
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
    if (!name) return; // ignore placeholder

    setStatus(`loading ${name}…`);
    modelView.innerHTML = "";
    if (raw) raw.textContent = "";

    try {
      if (!modelData) {
        const data = await fetchJSON("data/model_scores.json");
        modelData = data;
      }

      const full = modelData[name];
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

  // ---------------------------
  // Recommender: 5 category filters
  // ---------------------------
  function getMin(val) {
    if (!val && val !== 0) return null;
    const n = Number(val);
    return Number.isNaN(n) ? null : n;
  }

  function runRecommender() {
    if (!modelData || !recommendResultsEl) return;

    const minAdapt = getMin(filterAdapt?.value);
    const minBio   = getMin(filterBio?.value);
    const minUse   = getMin(filterUse?.value);
    const minComp  = getMin(filterComp?.value);
    const minOut   = getMin(filterOut?.value);

    const out = [];

    for (const [name, model] of Object.entries(modelData)) {
      const catAvg = computeCategoryAverages(model);

      // Category keys in your JSON:
      // "adaptability", "bioinformatics_relevance",
      // "usability", "computational_efficiency", "output_suitability"
      if (minAdapt !== null && (catAvg.adaptability ?? 0) < minAdapt) continue;
      if (minBio   !== null && (catAvg.bioinformatics_relevance ?? 0) < minBio) continue;
      if (minUse   !== null && (catAvg.usability ?? 0) < minUse) continue;
      if (minComp  !== null && (catAvg.computational_efficiency ?? 0) < minComp) continue;
      if (minOut   !== null && (catAvg.output_suitability ?? 0) < minOut) continue;

      const abusScore = computeAbusScore(model);
      out.push({ name, abusScore, catAvg });
    }

    out.sort((a, b) => b.abusScore - a.abusScore);

    if (!out.length) {
      recommendResultsEl.innerHTML = `<div class="muted">No models match these category thresholds.</div>`;
      return;
    }

    const parts = [];
    parts.push(`<div class="model-grid">`);
    for (const item of out.slice(0, 12)) {
      const sc = item.abusScore.toFixed(1);
      parts.push(`
        <div class="cat">
          <h4>
            <span>${item.name}</span>
            <span class="pill wt">ABUS: ${sc}</span>
          </h4>
          <div class="note">
            <strong>Category avgs</strong> 
            · adapt=${(item.catAvg.adaptability ?? 0).toFixed(2)}
            · bio=${(item.catAvg.bioinformatics_relevance ?? 0).toFixed(2)}
            · use=${(item.catAvg.usability ?? 0).toFixed(2)}
            · comp=${(item.catAvg.computational_efficiency ?? 0).toFixed(2)}
            · out=${(item.catAvg.output_suitability ?? 0).toFixed(2)}
          </div>
        </div>
      `);
    }
    parts.push(`</div>`);
    recommendResultsEl.innerHTML = parts.join("");
  }

  if (btnRecommend) {
    btnRecommend.addEventListener("click", (ev) => {
      ev.preventDefault();
      runRecommender();
    });
  }

  // ---------------------------
  // Ingest & scoring (UI only – no backend)
  // ---------------------------
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
