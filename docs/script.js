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

  // Your existing renderer stays unchanged
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

  // ✔ UPDATED: LOAD MODELS FROM STATIC JSON FILE
  async function loadModels() {
    if (!modelSelect) {
      console.warn("[models] #modelSelect not found; skipping load");
      return;
    }

    setStatus("loading models…");

    try {
      // Load static JSON file (Version A)
      const data = await fetchJSON("data/model_scores.json");

      if (!data || typeof data !== "object") {
        throw new Error("model_scores.json must be an object mapping name → details");
      }

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

  // ✔ UPDATED: LOAD FULL MODEL DETAILS FROM JSON
  async function loadFull() {
    if (!modelSelect || !modelView) return;

    const name = modelSelect.value;
    if (!name) return; // ignore placeholder

    setStatus(`loading ${name}…`);
    modelView.innerHTML = "";
    if (raw) raw.textContent = "";

    try {
      const data = await fetchJSON("data/model_scores.json");

      const full = data[name];
      if (!full) {
        throw new Error(`Model "${name}" not found in model_scores.json`);
      }

      // Render model categories + subfeatures
      renderFull(full);

      // (Optional) No computed scores since we removed the backend.
      // We leave placeholder just in case.
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

  // INGEST & SCORING UI (unchanged, but API-disabled)
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

    // These functions no longer POST to a backend API.
    // We keep the UI functional but disable backend scoring.
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
