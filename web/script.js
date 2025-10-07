const apiBase = "http://127.0.0.1:8000"; // change if backend port differs

// Elements
const modelSelect = document.getElementById("modelSelect");
const loadBtn = document.getElementById("loadBtn");
const modelView = document.getElementById("modelView");
const raw = document.getElementById("raw");
const statusEl = document.getElementById("status");

const form = document.getElementById("computeForm");
const aEl = document.getElementById("a");
const bEl = document.getElementById("b");
const computeStatus = document.getElementById("computeStatus");

// Helpers
async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
function setStatus(msg) { statusEl.textContent = msg; }

// Rendering
function renderFull(full) {
  raw.textContent = JSON.stringify(full, null, 2);
  const wrap = document.createElement("div");
  wrap.className = "model-grid";
  for (const [cat, val] of Object.entries(full)) {
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

// Actions
async function loadModels() {
  setStatus("loading models");
  try {
    const data = await fetchJSON(`${apiBase}/api/models`);
    modelSelect.innerHTML = "";
    for (const name of data.models) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      modelSelect.appendChild(opt);
    }
    setStatus(`loaded ${data.models.length} models`);
  } catch (e) {
    setStatus(`error: ${e.message}`);
  }
}

async function loadFull() {
  const name = modelSelect.value;
  if (!name) return;
  setStatus(`loading ${name}`);
  modelView.innerHTML = "";
  raw.textContent = "";
  try {
    const full = await fetchJSON(`${apiBase}/api/models/${encodeURIComponent(name)}/full`);
    renderFull(full);
    setStatus(`loaded ${name}`);
  } catch (e) {
    setStatus(`error: ${e.message}`);
    modelView.innerHTML = `<pre>${e.message}</pre>`;
  }
}

// Compute demo
if (form) {
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    computeStatus.textContent = "computing...";
    try {
      const url = `${apiBase}/api/compute?a=${encodeURIComponent(aEl.value)}&b=${encodeURIComponent(bEl.value)}`;
      const res = await fetchJSON(url, { method: "POST" });
      computeStatus.textContent = `result: ${res.result}`;
    } catch (e) {
      computeStatus.textContent = `error: ${e.message}`;
    }
  });
}

// Boot: load model list only (do NOT auto-open details or scroll)
loadModels();
loadBtn.addEventListener("click", loadFull);
