// Přetahování hráček (jediná implementace pro živý zápis, sestavu zápasu, editor řad a základní formace).
// Prst: podržení 320 ms (pohyb o víc než 10 px před tím = posun stránky, ne tažení); myš: tažení o víc než 6 px.
// Během tažení se pod prstem zvýrazní cíl (třída ov), tažený prvek má třídu dg a za prstem jde „duch“ (div.ghost).
// Po puštění se 450 ms ignoruje klepnutí, aby puštění nevyvolalo i klepnutí na prvek.

// ===== Konstanty =====
const HOLD_MS = 320;      // podržení prstu před začátkem tažení
const TOUCH_SLOP = 10;    // pohyb prstu (px), který tažení zruší (posun stránky)
const MOUSE_SLOP = 6;     // pohyb myši (px), od kterého začne tažení
const BLOCK_MS = 450;     // po puštění se klepnutí ignoruje

// ===== Hlavní logika =====
// Napojí přetahování na prvky items uvnitř root.
// opt.target = selektor cílů (prvek pod prstem se hledá přes closest),
// opt.start(b) → {data, text} nebo null (tažení z prvku nejde: např. prázdné místo),
// opt.drop(data, cíl) = provedení po puštění na cíl (cíl = prvek, nebo null mimo cíle; volá se jen s cílem),
// opt.click(b) → obsluha klepnutí nebo null (prvek bez vlastní obsluhy klepnutí si nechá původní onclick).
export function makeDrag(root, items, opt) {
  let D = null, timer = null, blk = false;
  const at = (x, y) => { const e = document.elementFromPoint(x, y); return e && e.closest ? e.closest(opt.target) : null; };
  const clr = () => { if (D && D.g) D.g.remove(); root.querySelectorAll(".ov,.dg").forEach(n => n.classList.remove("ov", "dg")); D = null; };
  const mv = (x, y) => {
    D.x = x; D.y = y; D.g.style.left = x + "px"; D.g.style.top = y + "px";
    root.querySelectorAll(".ov").forEach(n => n.classList.remove("ov"));
    const b = at(x, y);
    if (b && b !== D.el) b.classList.add("ov");
  };
  const begin = (b, x, y) => {
    const s = opt.start(b);
    if (!s) return;
    const g = document.createElement("div");
    g.className = "ghost"; g.textContent = s.text; document.body.appendChild(g);
    D = {data: s.data, g, el: b};
    b.classList.add("dg"); mv(x, y);
    if (navigator.vibrate) navigator.vibrate(15);
  };
  const end = (x, y) => {
    if (!D) return;
    const b = at(x, y), data = D.data;
    clr(); blk = true; setTimeout(() => { blk = false; }, BLOCK_MS);
    if (b) opt.drop(data, b);
  };

  // ===== Eventy =====
  items.forEach(b => {
    const tap = opt.click ? opt.click(b) : null;
    if (tap) b.onclick = () => { if (!blk) tap(); };
    b.addEventListener("contextmenu", e => e.preventDefault());
    b.addEventListener("touchstart", e => { const t = e.touches[0]; clearTimeout(timer); b._s = {x: t.clientX, y: t.clientY}; timer = setTimeout(() => begin(b, t.clientX, t.clientY), HOLD_MS); }, {passive: true});
    b.addEventListener("touchmove", e => { const t = e.touches[0]; if (D) { e.preventDefault(); mv(t.clientX, t.clientY); } else if (Math.abs(t.clientX - b._s.x) + Math.abs(t.clientY - b._s.y) > TOUCH_SLOP) clearTimeout(timer); }, {passive: false});
    b.addEventListener("touchend", e => { clearTimeout(timer); if (D) { e.preventDefault(); end(D.x, D.y); } });
    b.addEventListener("touchcancel", () => { clearTimeout(timer); clr(); });
    b.addEventListener("mousedown", e => {
      if (e.button !== 0) return;
      const sx = e.clientX, sy = e.clientY;
      const mm = ev => { if (!D && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > MOUSE_SLOP) begin(b, ev.clientX, ev.clientY); if (D) mv(ev.clientX, ev.clientY); };
      const mu = ev => { document.removeEventListener("mousemove", mm); document.removeEventListener("mouseup", mu); end(ev.clientX, ev.clientY); };
      document.addEventListener("mousemove", mm); document.addEventListener("mouseup", mu);
    });
  });
}
