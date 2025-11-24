// Auto-detect API base:
// - If page is served from FastAPI on :8000 (/web), use same-origin ("").
// - Otherwise (e.g., served from :5500), call the API on :8000 explicitly.
const apiBase = (location.port === "8000" ? "" : "http://127.0.0.1:8000");
console.log("[boot] apiBase =", apiBase);

document.addEventListener('DOMContentLoaded', () => {
  // Elements used by the Models browser
  const modelSelect = document.getElementById("modelSelect");
  const loadBtn     = document.getElementById("loadBtn");
  const modelView   = document.getElementById("modelView");
  const raw         = document.getElementById("raw");
  const statusEl    = document.getElementById("status");

  function setStatus(s) { if (statusEl) statusEl.textContent = s; console.log("[status]", s); }

  async function fetchJSON(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText} :: ${text}`);
    }
    return res.json();
  }

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

  async function loadModels() {
    if (!modelSelect) {
      console.warn("[models] #modelSelect not found; skipping load");
      return;
    }
    setStatus("loading models…");
    try {
      // IMPORTANT: ensure we call the API origin (not the static server)


      //const data = await fetchJSON(`${apiBase}/api/models`);

      //To have it static and not depend on the API server for the list of models,
      const data = await fetchJSON("data/model_scores.json");

      if (!data || !Array.isArray(data.models)) throw new Error("bad /api/models payload");
      modelSelect.innerHTML = "";
      // Add a placeholder option
      const ph = document.createElement("option");
      ph.value = "";
      ph.textContent = "— select a model —";
      modelSelect.appendChild(ph);

      for (const name of data.models) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        modelSelect.appendChild(opt);
      }
      setStatus(`loaded ${data.models.length} models`);

      // Auto-load the first model's details (if any)
      if (data.models.length > 0) {
        modelSelect.value = data.models[0];
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
      const full = await fetchJSON(`${apiBase}/api/models/${encodeURIComponent(name)}/full`);
      renderFull(full);

      // Also fetch computed score block if available
      try {
        const sc = await fetchJSON(`${apiBase}/api/score/${encodeURIComponent(name)}`);
        const scoreBlock = document.createElement("div");
        scoreBlock.className = "panel";
        const lines = [];
        lines.push(`<h3>Computed Score</h3>`);
        const overall = typeof sc.overall === "number" ? sc.overall.toFixed(3) : "0.000";
        lines.push(`<div class="muted">overall: <strong>${overall}</strong></div>`);
        lines.push(`<div style="margin-top:8px">`);
        for (const [cat, obj] of Object.entries(sc.categories || {})) {
          const avg = typeof obj.avg === "number" ? obj.avg.toFixed(3) : "0.000";
          lines.push(`<div class="sub"><strong>${cat}</strong> — avg: ${avg} (n=${obj.count}), weight: ${obj.weight}</div>`);
        }
        lines.push(`</div>`);
        scoreBlock.innerHTML = lines.join("");
        modelView.prepend(scoreBlock);
      } catch (e) {
        console.warn("Score fetch failed:", e.message);
      }

      setStatus(`loaded ${name}`);
    } catch (e) {
      console.error(e);
      setStatus(`error loading ${name}: ${e.message}`);
      modelView.innerHTML = `<pre>${e.message}</pre>`;
    }
  }

  if (loadBtn) loadBtn.addEventListener("click", loadFull);

  // Expose for other modules (e.g., ingest saving refresh)
  window.loadModels = loadModels;
  window.loadFull = loadFull;

  // Boot: try to load models list on page load
  loadModels();

  // ----- Ingest & Score -----
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

    function setIngestStatus(s) { if (statusEl2) statusEl2.textContent = s; console.log("[ingest]", s); }

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

    async function postJSON(url, body) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} :: ${text}`);
      }
      return res.json();
    }

    async function doPreview() {
      const name = nameEl.value.trim();
      const text = textEl.value.trim();
      if (!name || !text) return setIngestStatus("name and text are required");
      setIngestStatus("scoring (preview)...");
      previewEl.textContent = "";
      try {
        const payload = { name, text, weights: collectWeights() };
        const data = await postJSON(`${apiBase}/api/ingest/paper`, payload);
        previewEl.textContent = JSON.stringify(data.payload, null, 2);
        setIngestStatus("preview ready");
      } catch (e) {
        setIngestStatus(`error: ${e.message}`);
        previewEl.textContent = e.message;
      }
    }

    async function doSave() {
      const name = nameEl.value.trim();
      const text = textEl.value.trim();
      if (!name || !text) return setIngestStatus("name and text are required");
      setIngestStatus("scoring + saving...");
      previewEl.textContent = "";
      try {
        const payload = { name, text, weights: collectWeights() };
        const data = await postJSON(`${apiBase}/api/ingest/paper/save`, payload);
        previewEl.textContent = JSON.stringify(data.payload, null, 2);
        setIngestStatus("saved to DB");

        // Refresh model list; auto-select the saved model if possible
        if (typeof window.loadModels === "function") {
          await window.loadModels();
          if (modelSelect && name) {
            modelSelect.value = name;
            if (typeof window.loadFull === "function") {
              await window.loadFull();
            }
          }
        }
      } catch (e) {
        setIngestStatus(`error: ${e.message}`);
        previewEl.textContent = e.message;
      }
    }

    btnPrev?.addEventListener("click", (ev) => { ev.preventDefault(); doPreview(); });
    btnSave?.addEventListener("click", (ev) => { ev.preventDefault(); doSave(); });
  })();
});
