document.addEventListener('DOMContentLoaded', () => {
  const apiBase = "http://127.0.0.1:8000"; // change if your backend runs elsewhere

  // Elements (guarded)
  const modelSelect   = document.getElementById("modelSelect");
  const loadBtn       = document.getElementById("loadBtn");
  const modelView     = document.getElementById("modelView");
  const raw           = document.getElementById("raw");
  const statusEl      = document.getElementById("status");

  const form          = document.getElementById("computeForm");
  const aEl           = document.getElementById("a");
  const bEl           = document.getElementById("b");
  const computeStatus = document.getElementById("computeStatus");

  if (!modelSelect || !loadBtn || !modelView) {
    console.error("Missing required DOM elements. Check IDs in index.html.");
    return;
  }

  function setStatus(s) {
    if (statusEl) statusEl.textContent = s;
    console.log("[status]", s);
  }

  async function fetchJSON(url, opts) {
    console.log("[fetch]", url);
    const res = await fetch(url, { ...opts });
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
    setStatus("loading models…");
    try {
      const data = await fetchJSON(`${apiBase}/api/models`);
      if (!data || !Array.isArray(data.models)) {
        throw new Error("Bad payload from /api/models");
      }
      modelSelect.innerHTML = "";
      for (const name of data.models) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        modelSelect.appendChild(opt);
      }
      setStatus(`loaded ${data.models.length} models`);

      if (data.models.length > 0) {
        modelSelect.value = data.models[0];
        await loadFull(); // auto-load first model
      } else {
        modelView.innerHTML = "<div class='panel'>No models found.</div>";
      }
    } catch (e) {
      console.error(e);
      setStatus(`error loading models: ${e.message}`);
      modelView.innerHTML = `<pre>${e.message}</pre>`;
    }
  }

  async function loadFull() {
    const name = modelSelect.value;
    if (!name) return;
    setStatus(`loading ${name}…`);
    modelView.innerHTML = "";
    if (raw) raw.textContent = "";
    try {
      const full = await fetchJSON(`${apiBase}/api/models/${encodeURIComponent(name)}/full`);
      renderFull(full);

      // Try computed score (optional)
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

  // Compute (demo)
  if (form && aEl && bEl && computeStatus) {
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      computeStatus.textContent = "computing…";
      try {
        const url = `${apiBase}/api/compute?a=${encodeURIComponent(aEl.value)}&b=${encodeURIComponent(bEl.value)}`;
        const res = await fetchJSON(url, { method: "POST" });
        computeStatus.textContent = `result: ${res.result}`;
      } catch (e) {
        computeStatus.textContent = `error: ${e.message}`;
      }
    });
  }

  // Wire up
  loadBtn.addEventListener("click", loadFull);
  loadModels();
});
