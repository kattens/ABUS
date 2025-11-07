const apiBase = (location.port === "8000" ? "" : "http://127.0.0.1:8000");
const siteBase = location.pathname.startsWith("/ABUS") ? "/ABUS" : "";

console.log("[boot] apiBase =", apiBase, "siteBase =", siteBase);

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
    if (modelView) {
      modelView.innerHTML = "";
      modelView.appendChild(wrap);
    }
  }

  // Small helper to fill the <select>
  function populateModels(list) {
    modelSelect.innerHTML = "";
    const ph = document.createElement("option");
    ph.value = "";
    ph.textContent = "— select a model —";
    modelSelect.appendChild(ph);

    for (const name of list) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      modelSelect.appendChild(opt);
    }
  }

  async function loadModels() {
    if (!modelSelect) {
      console.warn("[models] #modelSelect not found; skipping load");
      return;
    }
    setStatus("loading models…");
    try {
      // 1) Try the live API first
      const data = await fetchJSON(`${apiBase}/api/models`);
      if (!data || !Array.isArray(data.models)) throw new Error("bad /api/models payload");
      populateModels(data.models);
      setStatus(`loaded ${data.models.length} models`);
      if (data.models.length > 0) {
        modelSelect.value = data.models[0];
        await loadFull();
      } else if (modelView) {
        modelView.innerHTML = "<div class='panel'>No models found.</div>";
      }
    } catch (e) {
      console.warn("[models] API failed, falling back to static JSON:", e.message);
      setStatus("loading static models…");
      try {
        // 2) Fallback to static file on GitHub Pages
        const res = await fetch(`${siteBase}/data/models.json`);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const rows = await res.json(); // Expect { "models": ["Name1", "Name2", ...] } OR ["Name1","Name2"]
        const models = Array.isArray(rows?.models) ? rows.models : (Array.isArray(rows) ? rows : []);
        populateModels(models);
        setStatus(`loaded ${models.length} models (static)`);
        if (models.length > 0) {
          modelSelect.value = models[0];
          await loadFull(); // loadFull also has its own fallback
        } else if (modelView) {
          modelView.innerHTML = "<div class='panel'>No models found (static).</div>";
        }
      } catch (ee) {
        console.error(ee);
        setStatus(`error loading models: ${ee.message}`);
        if (modelView) modelView.innerHTML = `<pre>${ee.message}</pre>`;
      }
    }
  }

  async function loadFull() {
    if (!modelSelect || !modelView) return;
    const name = modelSelect.value;
    if (!name) return; // ignore placeholder
    setStatus(`loading ${name}…`);
    modelView.innerHTML = "";
    if (raw) raw.textContent = "";

    // Helper to render score block
    function renderScore(sc) {
      const scoreBlock = document.createElement("div");
      scoreBlock.className = "panel";
      const lines = [];
      lines.push(`<h3>Computed Score</h3>`);
      const overall = typeof sc?.overall === "number" ? sc.overall.toFixed(3) : "0.000";
      lines.push(`<div class="muted">overall: <strong>${overall}</strong></div>`);
      lines.push(`<div style="margin-top:8px">`);
      for (const [cat, obj] of Object.entries(sc?.categories || {})) {
        const avg = typeof obj.avg === "number" ? obj.avg.toFixed(3) : "0.000";
        lines.push(`<div class="sub"><strong>${cat}</strong> — avg: ${avg} (n=${obj.count}), weight: ${obj.weight}</div>`);
      }
      lines.push(`</div>`);
      scoreBlock.innerHTML = lines.join("");
      modelView.prepend(scoreBlock);
    }

    // 1) Try API for full & score
    try {
      const full = await fetchJSON(`${apiBase}/api/models/${encodeURIComponent(name)}/full`);
      renderFull(full);

      try {
        const sc = await fetchJSON(`${apiBase}/api/score/${encodeURIComponent(name)}`);
        renderScore(sc);
      } catch (e2) {
        console.warn("Score fetch failed (API), trying static:", e2.message);
        try {
          const scRes = await fetch(`${siteBase}/data/score/${encodeURIComponent(name)}.json`);
          if (scRes.ok) {
            const sc = await scRes.json();
            renderScore(sc);
          }
        } catch (_) { /* ignore */ }
      }

      setStatus(`loaded ${name}`);
      return; // done
    } catch (e) {
      console.warn(`[full] API failed for ${name}, trying static:`, e.message);
    }

    // 2) Fallback to static files for full & score
    try {
      const fullRes = await fetch(`${siteBase}/data/full/${encodeURIComponent(name)}.json`);
      if (!fullRes.ok) throw new Error(`${fullRes.status} ${fullRes.statusText}`);
      const full = await fullRes.json();
      renderFull(full);

      try {
        const scRes = await fetch(`${siteBase}/data/score/${encodeURIComponent(name)}.json`);
        if (scRes.ok) {
          const sc = await scRes.json();
          renderScore(sc);
        }
      } catch (_) { /* ignore score if missing */ }

      setStatus(`loaded ${name} (static)`);
    } catch (e) {
      console.error(e);
      setStatus(`error loading ${name}: ${e.message}`);
      if (modelView) modelView.innerHTML = `<pre>${e.message}</pre>`;
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
