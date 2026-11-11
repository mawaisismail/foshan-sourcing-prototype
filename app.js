// Clickable prototype: catalog -> quote basket -> manager pipeline. Data persists in localStorage (demo only).
const STAGES = ["New enquiry", "Quote sent", "Contract signed", "Factory deposit", "In production", "Quality check", "Shipping & customs", "Delivered"];
const ICON = { "Sofas & Seating": "🛋️", "Beds & Bedroom": "🛏️", Dining: "🍽️", Office: "💼", Lighting: "💡", "Tiles & Stone": "🧱", "Bath & Sanitary": "🛁", Outdoor: "🌴" };
const HUE = { "Sofas & Seating": 28, "Beds & Bedroom": 210, Dining: 15, Office: 200, Lighting: 45, "Tiles & Stone": 30, "Bath & Sanitary": 190, Outdoor: 120 };
const GST = 0.18;
const $ = (s) => document.querySelector(s);
const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
let PRODUCTS = [];
let basket = store.get("fd_basket", []);
let quotes = store.get("fd_quotes", null);
const filters = { q: "", cats: new Set(), max: 0, sort: "pop" };

function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 1800); }
function saveBasket() { store.set("fd_basket", basket); $("#bc").textContent = basket.reduce((a, b) => a + b.qty, 0); }

function seedQuotes() {
  const names = ["Arjun Mehta (Mumbai)", "Priya Interiors (Bengaluru)", "Kapoor Hotels (Delhi)", "Nair Villas (Kochi)", "Sharma Offices (Pune)"];
  quotes = names.map((n, i) => {
    const items = PRODUCTS.slice(i * 7, i * 7 + 3).map((p) => ({ id: p.id, qty: p.unit === "per m²" ? 120 : 2 + i, material: p.variants.material[0], size: p.variants.size[0] }));
    return { id: "Q-" + (1041 + i), customer: n, whatsapp: "+91 98" + (10000000 + i * 123457), city: n.split("(")[1].replace(")", ""), items, stage: STAGES[Math.min(i * 2, 7)], created: new Date(Date.now() - i * 86400e3 * 3).toISOString(), manager: ["Ravi", "Meera", "Ravi", "Anil", "Meera"][i] };
  });
  store.set("fd_quotes", quotes);
}

function lineTotal(it) { const p = PRODUCTS.find((x) => x.id === it.id); return p ? p.priceINR * it.qty : 0; }

// ---------- Catalog ----------
function renderShop() {
  const cats = [...new Set(PRODUCTS.map((p) => p.category))];
  const maxPrice = Math.max(...PRODUCTS.map((p) => p.priceINR));
  if (!filters.max) filters.max = maxPrice;
  $("#app").innerHTML = `
  <section class="hero"><h1>Factory-direct furniture from Foshan, delivered to India</h1>
  <p>Browse ${PRODUCTS.length} products from verified Foshan factories, add them to a quote basket, and a personal manager handles the contract, factory deposit, production, QC, shipping, customs and delivery.</p>
  <div class="steps">${STAGES.map((s) => `<span>${s}</span>`).join("")}</div></section>
  <div class="layout"><aside>
    <h4>Search</h4><input type="search" id="q" placeholder="Sofa, marble, chandelier…" value="${filters.q}">
    <h4>Category</h4>${cats.map((c) => `<label><input type="checkbox" value="${c}" ${filters.cats.has(c) ? "checked" : ""}> ${ICON[c]} ${c}</label>`).join("")}
    <h4>Max price</h4><input type="range" id="max" min="0" max="${maxPrice}" step="1000" value="${filters.max}" style="width:100%"><div class="meta" id="maxv">${inr(filters.max)}</div>
    <h4>Sort</h4><select id="sort"><option value="pop">Top rated</option><option value="lo">Price: low to high</option><option value="hi">Price: high to low</option><option value="lead">Fastest lead time</option></select>
  </aside><section><div class="meta" id="count" style="margin-bottom:10px"></div><div class="grid" id="grid"></div></section></div>`;
  $("#sort").value = filters.sort;
  $("#q").oninput = (e) => { filters.q = e.target.value; drawGrid(); };
  $("#max").oninput = (e) => { filters.max = +e.target.value; $("#maxv").textContent = inr(filters.max); drawGrid(); };
  $("#sort").onchange = (e) => { filters.sort = e.target.value; drawGrid(); };
  document.querySelectorAll("aside input[type=checkbox]").forEach((c) => (c.onchange = () => { c.checked ? filters.cats.add(c.value) : filters.cats.delete(c.value); drawGrid(); }));
  drawGrid();
}

function drawGrid() {
  const q = filters.q.toLowerCase();
  let list = PRODUCTS.filter((p) => (!filters.cats.size || filters.cats.has(p.category)) && p.priceINR <= filters.max && (!q || (p.name + p.category + p.variants.material.join(" ")).toLowerCase().includes(q)));
  list.sort({ pop: (a, b) => b.rating - a.rating, lo: (a, b) => a.priceINR - b.priceINR, hi: (a, b) => b.priceINR - a.priceINR, lead: (a, b) => a.leadDays - b.leadDays }[filters.sort]);
  $("#count").textContent = `${list.length} products`;
  $("#grid").innerHTML = list.map((p) => `
    <article class="card"><div class="thumb" style="background:hsl(${HUE[p.category]} 40% 92%)">${ICON[p.category]}</div>
    <div class="b"><span class="chip">${p.category}</span><b>${p.name}</b>
    <div class="meta">${p.id} · ${p.factory} · ★ ${p.rating}</div>
    <div class="price">${inr(p.priceINR)} <span class="meta">${p.unit} · ex-factory est.</span></div>
    <div class="meta">MOQ ${p.moq} · lead time ${p.leadDays} days</div>
    <div class="row"><select id="m-${p.id}">${p.variants.material.map((m) => `<option>${m}</option>`).join("")}</select><select id="s-${p.id}">${p.variants.size.map((m) => `<option>${m}</option>`).join("")}</select></div>
    <div class="row"><input type="number" id="qty-${p.id}" min="${p.moq}" value="${p.moq}" style="width:90px"><button class="btn p" onclick="addToBasket('${p.id}')" style="flex:1">Add to quote</button></div>
    </div></article>`).join("");
}

function addToBasket(id) {
  const material = $("#m-" + id).value, size = $("#s-" + id).value, qty = Math.max(+$("#qty-" + id).value || 1, 1);
  const ex = basket.find((b) => b.id === id && b.material === material && b.size === size);
  ex ? (ex.qty += qty) : basket.push({ id, material, size, qty });
  saveBasket(); toast("Added to quote basket");
}

// ---------- Basket ----------
function openBasket() { drawBasket(); $("#drawer").classList.add("open"); }
function closeBasket() { $("#drawer").classList.remove("open"); }
function drawBasket() {
  if (!basket.length) { $("#basket").innerHTML = `<p class="meta">Your basket is empty. Add products from the catalog to request a quote.</p>`; return; }
  const sub = basket.reduce((a, b) => a + lineTotal(b), 0);
  $("#basket").innerHTML = basket.map((b, i) => { const p = PRODUCTS.find((x) => x.id === b.id); return `<div class="li"><div><b>${p.name}</b><div class="meta">${b.material} · ${b.size} · ${inr(p.priceINR)} ${p.unit}</div></div><div style="text-align:right"><input type="number" min="1" value="${b.qty}" style="width:70px" onchange="basket[${i}].qty=Math.max(+this.value,1);saveBasket();drawBasket()"><div class="meta">${inr(lineTotal(b))}</div><a href="#" onclick="basket.splice(${i},1);saveBasket();drawBasket();return false" class="meta">remove</a></div></div>`; }).join("") + `
    <div style="margin-top:12px"><div class="tot"><span>Estimated goods (ex-factory)</span><b>${inr(sub)}</b></div>
    <div class="tot meta"><span>GST @18% (indicative)</span><span>${inr(sub * GST)}</span></div>
    <div class="tot meta"><span>Freight, duty & delivery</span><span>quoted by manager</span></div></div>
    <h4 style="margin:18px 0 8px">Request a quote</h4>
    <form onsubmit="submitQuote(event)"><div style="display:grid;gap:8px">
      <input type="text" name="name" required placeholder="Name / company">
      <input type="tel" name="whatsapp" required placeholder="WhatsApp number (+91…)">
      <input type="text" name="city" required placeholder="Delivery city">
      <textarea name="notes" rows="3" placeholder="Notes: finishes, room sizes, deadline…"></textarea>
      <button class="btn p">Send quote request</button></div></form>
    <p class="meta">No card payment in v1. A manager replies on WhatsApp with the final quote and contract.</p>`;
}
function submitQuote(e) {
  e.preventDefault(); const f = new FormData(e.target);
  const q = { id: "Q-" + (1041 + quotes.length), customer: f.get("name"), whatsapp: f.get("whatsapp"), city: f.get("city"), notes: f.get("notes"), items: basket.map((b) => ({ ...b })), stage: STAGES[0], created: new Date().toISOString(), manager: "Unassigned" };
  quotes.unshift(q); store.set("fd_quotes", quotes); basket = []; saveBasket(); closeBasket();
  toast(`Quote ${q.id} sent. Check the Manager admin`);
}

// ---------- Admin ----------
let adminTab = store.get("fd_tab", "pipeline");
function renderAdmin() {
  $("#app").innerHTML = `<div class="note">Prototype admin: in the real build this is behind manager login (roles: admin / manager), stored in Postgres, with WhatsApp notifications on each stage change.</div>
  <div class="tabs">${[["pipeline", "Order pipeline"], ["quotes", "Quote requests"], ["products", "Products & bulk import"]].map(([k, l]) => `<button class="${adminTab === k ? "on" : ""}" onclick="adminTab='${k}';store.set('fd_tab','${k}');renderAdmin()">${l}</button>`).join("")}</div><div id="adm"></div>`;
  ({ pipeline: drawPipeline, quotes: drawQuotes, products: drawProducts })[adminTab]();
}
function qTotal(q) { return q.items.reduce((a, b) => a + lineTotal(b), 0); }
function drawPipeline() {
  $("#adm").innerHTML = `<div class="kanban">${STAGES.map((s, si) => `<div class="col"><h5>${s} (${quotes.filter((q) => q.stage === s).length})</h5>${quotes.filter((q) => q.stage === s).map((q) => `
    <div class="q"><b>${q.id}</b> · ${q.customer}<div class="meta">${q.items.length} items · ${inr(qTotal(q))}</div><div class="meta">Manager: ${q.manager}</div>
    <div class="row" style="margin-top:6px">${si > 0 ? `<button class="btn" onclick="moveQ('${q.id}',-1)">←</button>` : ""}${si < STAGES.length - 1 ? `<button class="btn p" onclick="moveQ('${q.id}',1)">Next →</button>` : ""}</div></div>`).join("")}</div>`).join("")}</div>`;
}
function moveQ(id, d) { const q = quotes.find((x) => x.id === id); q.stage = STAGES[STAGES.indexOf(q.stage) + d]; store.set("fd_quotes", quotes); toast(`${id} → ${q.stage} (WhatsApp update queued)`); drawPipeline(); }
function drawQuotes() {
  $("#adm").innerHTML = `<table><thead><tr><th>ID</th><th>Customer</th><th>City</th><th>WhatsApp</th><th>Items</th><th>Goods value</th><th>Stage</th><th>Manager</th></tr></thead><tbody>${quotes.map((q) => `
    <tr><td>${q.id}</td><td>${q.customer}</td><td>${q.city}</td><td>${q.whatsapp}</td><td>${q.items.map((i) => { const p = PRODUCTS.find((x) => x.id === i.id); return p ? `${p.name} ×${i.qty}` : i.id; }).join("<br>")}</td><td>${inr(qTotal(q))}</td><td><span class="chip">${q.stage}</span></td>
    <td><select onchange="quotes.find(x=>x.id==='${q.id}').manager=this.value;store.set('fd_quotes',quotes)">${["Unassigned", "Ravi", "Meera", "Anil"].map((m) => `<option ${m === q.manager ? "selected" : ""}>${m}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table>`;
}
function drawProducts() {
  $("#adm").innerHTML = `<div class="row" style="margin-bottom:12px;flex-wrap:wrap"><label class="btn p" style="cursor:pointer">Bulk import CSV<input type="file" accept=".csv" hidden onchange="importCSV(this.files[0])"></label>
    <button class="btn" onclick="exportCSV()">Download CSV template / export</button><span class="meta">Columns: id,name,category,factory,priceINR,unit,moq,leadDays,materials,sizes</span></div>
    <table><thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Factory</th><th>Price</th><th>MOQ</th><th>Lead</th></tr></thead><tbody>${PRODUCTS.map((p) => `<tr><td>${p.id}</td><td>${p.name}</td><td>${p.category}</td><td>${p.factory}</td><td>${inr(p.priceINR)} <span class="meta">${p.unit}</span></td><td>${p.moq}</td><td>${p.leadDays}d</td></tr>`).join("")}</tbody></table>`;
}
function exportCSV() {
  const rows = [["id", "name", "category", "factory", "priceINR", "unit", "moq", "leadDays", "materials", "sizes"], ...PRODUCTS.map((p) => [p.id, p.name, p.category, p.factory, p.priceINR, p.unit, p.moq, p.leadDays, p.variants.material.join("|"), p.variants.size.join("|")])];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "products.csv"; a.click();
}
async function importCSV(file) {
  if (!file) return;
  const lines = (await file.text()).trim().split(/\r?\n/);
  const head = lines.shift().split(",").map((h) => h.replace(/"/g, "").trim());
  let added = 0, updated = 0;
  for (const line of lines) {
    const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"'));
    const r = Object.fromEntries(head.map((h, i) => [h, cells[i]]));
    if (!r.id || !r.name) continue;
    const p = { id: r.id, name: r.name, category: r.category || "Sofas & Seating", factory: r.factory || "—", priceINR: +r.priceINR || 0, unit: r.unit || "per piece", moq: +r.moq || 1, leadDays: +r.leadDays || 30, rating: 4.5, variants: { material: (r.materials || "Standard").split("|"), size: (r.sizes || "Standard").split("|") } };
    const i = PRODUCTS.findIndex((x) => x.id === p.id); i >= 0 ? ((PRODUCTS[i] = p), updated++) : (PRODUCTS.push(p), added++);
  }
  store.set("fd_products", PRODUCTS); toast(`Imported: ${added} new, ${updated} updated`); drawProducts();
}

// ---------- Router ----------
function route() {
  const admin = location.hash.startsWith("#/admin");
  $("#nav-shop").classList.toggle("on", !admin); $("#nav-admin").classList.toggle("on", admin);
  admin ? renderAdmin() : renderShop(); window.scrollTo(0, 0);
}
(async function init() {
  PRODUCTS = store.get("fd_products", null) || (await (await fetch("products.json")).json());
  if (!quotes) seedQuotes();
  saveBasket(); window.addEventListener("hashchange", route); route();
})();
