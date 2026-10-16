// Řazení tabulek kliknutím na hlavičku sloupce (<th>).
// Struktura: Konstanty -> Pomocné funkce (parsování hodnot) -> Řazení -> Inicializace tabulek -> Eventy -> Export.
// Řadí se tabulky s třídou "sortable" a tabulka času na ledě v živém zápisu (#lv table).
// Tabulky se v aplikaci překreslují přes innerHTML, proto se volba řazení pamatuje podle textu hlaviček a po překreslení se znovu použije.

// ===== Konstanty =====
const SEL = "table.sortable, #lv table"; // které tabulky se řadí
const IND = "sort-ind";                  // třída prvku se šipkou ▲/▼
const state = new Map();                 // podpis tabulky (hlavičky) -> {col, dir}; dir 1 = ASC, -1 = DESC
const TIME = /^(?:⚠️\s*)?(\d{1,3}):(\d{2})(?!\d)/;   // MM:SS (i s prefixem ⚠️ a doplňkem za časem)
const NUM = /^([+\-−]?)(\d+(?:[.,]\d+)?)\s*%?$/;       // číslo: +3, -2, 45 %, 91,7 %

// ===== Pomocné funkce =====
// Text hlavičky bez indikátoru řazení
const label = th => [...th.childNodes].filter(n => !(n.classList && n.classList.contains(IND))).map(n => n.textContent).join("").replace(/\s+/g, " ").trim();
// Podpis tabulky = spojené hlavičky (stabilní při překreslení)
const sig = t => [...t.querySelectorAll("th")].map(label).join("|");
// Hlavičkový řádek a datové řádky
const headRow = t => { const th = t.querySelector("th"); return th ? th.parentElement : null; };
const dataRows = t => { const h = headRow(t); return [...t.rows].filter(r => r !== h && r.cells.length); };

// Rozpoznání hodnoty buňky: čas, číslo, text, nebo prázdná hodnota (vždy na konec)
function parse(txt) {
  const s = String(txt || "").replace(/\s+/g, " ").trim();
  if (!s || s === "–" || s === "-") return {k: "nil", s};
  let m = TIME.exec(s);
  if (m) return {k: "time", v: +m[1] * 60 + +m[2], s};
  m = NUM.exec(s);
  if (m) { const v = parseFloat(m[2].replace(",", ".")); return {k: "num", v: m[1] === "-" || m[1] === "−" ? -v : v, s}; }
  return {k: "txt", s};
}
// Typ sloupce: čas / číslo, jen pokud jsou takové všechny neprázdné buňky; jinak text
function colType(rows, col) {
  const ks = new Set(rows.map(r => parse(r.cells[col] ? r.cells[col].textContent : "").k).filter(k => k !== "nil"));
  return ks.size === 1 && (ks.has("time") || ks.has("num")) ? [...ks][0] : "txt";
}

// ===== Řazení =====
// Seřadí řádky podle sloupce a směru, nastaví šipky a aria-sort v hlavičce
function apply(t, col, dir) {
  const h = headRow(t), rows = dataRows(t);
  if (!h || !rows.length || col >= h.children.length) return;
  const type = colType(rows, col);
  const items = rows.map((r, i) => ({r, i, p: parse(r.cells[col] ? r.cells[col].textContent : "")}));
  items.sort((a, b) => {
    const an = a.p.k === "nil", bn = b.p.k === "nil";
    if (an || bn) return an && bn ? a.i - b.i : an ? 1 : -1; // prázdné vždy na konec
    const c = type === "txt" ? a.p.s.localeCompare(b.p.s, "cs", {numeric: true, sensitivity: "base"}) : a.p.v - b.p.v;
    return c ? c * dir : a.i - b.i; // při shodě zůstává původní pořadí
  });
  const parent = rows[0].parentNode;
  items.forEach(x => parent.appendChild(x.r));
  [...h.children].forEach((th, i) => {
    const ind = th.querySelector("." + IND);
    if (ind) ind.textContent = i === col ? (dir === 1 ? " ▲" : " ▼") : "";
    th.setAttribute("aria-sort", i === col ? (dir === 1 ? "ascending" : "descending") : "none");
  });
  state.set(sig(t), {col, dir});
}

// ===== Inicializace tabulek =====
// Připraví hlavičky nových tabulek (kurzor, indikátor) a obnoví dříve zvolené řazení
function setup() {
  document.querySelectorAll(SEL).forEach(t => {
    if (t._ts || !t.querySelector("th")) return;
    t._ts = true;
    const s = sig(t); // podpis před přidáním indikátorů
    t.querySelectorAll("th").forEach(th => {
      th.style.cursor = "pointer";
      th.style.userSelect = "none";
      th.style.webkitUserSelect = "none";
      th.title = "Klepnutím seřadíš";
      const ind = document.createElement("span");
      ind.className = IND;
      th.appendChild(ind);
    });
    const st = state.get(s);
    if (st) apply(t, st.col, st.dir);
  });
}

// ===== Eventy =====
// Jeden delegovaný posluchač pro všechny tabulky.
// První klepnutí: čísla a časy sestupně, text vzestupně; další klepnutí na stejný sloupec směr přepíná.
function onClick(e) {
  const th = e.target.closest && e.target.closest("th");
  if (!th) return;
  const t = th.closest("table");
  if (!t || !t._ts) return;
  const h = headRow(t), col = [...h.children].indexOf(th), rows = dataRows(t);
  if (col < 0 || !rows.length) return;
  const st = state.get(sig(t));
  const dir = st && st.col === col ? -st.dir : (colType(rows, col) === "txt" ? 1 : -1);
  apply(t, col, dir);
}

// ===== Export =====
export function initTableSort() {
  document.addEventListener("click", onClick);
  let q = false; // sloučení více změn DOM do jednoho průchodu
  new MutationObserver(() => { if (q) return; q = true; setTimeout(() => { q = false; setup(); }, 0); })
    .observe(document.body, {childList: true, subtree: true});
  setup();
}