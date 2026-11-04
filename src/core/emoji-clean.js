// 🎨 Černobílé ikony pro vzhled „Čistý“ (jen zobrazení): emoji v textech se obalí do <span class="em"> a styl je zešedí;
// ✅ ❌ ❓ se nahradí prostými znaky ✓ ✕ ?. Text (textContent), obsluha tlačítek ani data se nemění; mimo vzhled „Čistý“ modul nic nedělá.
// Pozorovatel změn stránky zpracuje jen nově vložené nebo změněné texty (jednou za snímek), takže vykreslování zůstává rychlé.

// ===== Konstanty =====
// Emoji (včetně spojených ZWJ a se selektorem varianty); znaky pod U+2100 (©, ®, ‼) se přeskočí
const EMOJI = /\p{Extended_Pictographic}(?:️|︎)?(?:‍\p{Extended_Pictographic}️?)*/gu;
// Emoji, která mají v čistém vzhledu prostý znak místo šedého obrázku
export const PLAIN = {"✅": "✓", "❌": "✕", "❓": "?"};
// Prvky, jejichž text se nikdy nemění (hodnoty polí, volby, skripty)
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "OPTION", "SELECT", "INPUT", "TITLE", "SVG"]);

// ===== Pomocné funkce =====
// Rozdělí text na části: {t: text} a {e: emoji}; prostý znak z PLAIN je část {t}, ostatní emoji část {e}
export function splitEmoji(text) {
  const out = [], s = String(text == null ? "" : text);
  let last = 0, m;
  EMOJI.lastIndex = 0;
  while ((m = EMOJI.exec(s))) {
    if (m[0].codePointAt(0) < 0x2100) continue;
    if (m.index > last) out.push({t: s.slice(last, m.index)});
    const base = m[0].replace(/️|︎/g, "");
    out.push(PLAIN[base] ? {t: PLAIN[base]} : {e: m[0]});
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({t: s.slice(last)});
  return out;
}
// Změnil by se text (je v něm emoji nebo ✅ ❌ ❓)?
export const hasEmoji = text => splitEmoji(text).some(p => p.e !== undefined) || /[✅❌❓]/u.test(String(text == null ? "" : text));

// ===== Hlavní logika =====
// Zpracuje jeden textový uzel: nahradí ho řadou textů a <span class="em">
function fixText(node) {
  const p = node.parentNode;
  if (!p || SKIP.has(String(p.nodeName).toUpperCase()) || (p.closest && p.closest(".em, [data-noclean], svg"))) return;
  const val = node.nodeValue;
  if (!/[℀-\u{1FFFF}]/u.test(val)) return;
  const parts = splitEmoji(val);
  if (!parts.some(x => x.e !== undefined) && parts.map(x => x.t || "").join("") === val) return;
  const frag = document.createDocumentFragment();
  parts.forEach(x => {
    if (x.e !== undefined) { const s = document.createElement("span"); s.className = "em"; s.textContent = x.e; frag.appendChild(s); }
    else frag.appendChild(document.createTextNode(x.t));
  });
  p.replaceChild(frag, node);
}
// Projde uzel a všechny jeho textové uzly
function fixTree(root) {
  if (!root) return;
  if (root.nodeType === 3) return fixText(root);
  if (root.nodeType !== 1 || (root.closest && root.closest(".em"))) return;
  const w = document.createTreeWalker(root, 4), list = [];
  while (w.nextNode()) list.push(w.currentNode);
  list.forEach(fixText);
}

// ===== Spuštění a zastavení =====
let obs = null, queue = new Set(), planned = false;
const later = fn => (typeof requestAnimationFrame === "function" ? requestAnimationFrame(fn) : setTimeout(fn, 16));
function flush() {
  planned = false;
  const items = [...queue];
  queue = new Set();
  items.forEach(n => { if (n.isConnected !== false) fixTree(n); });
}
// Zapne pozorování celé stránky (opakované volání nic nezdvojí) a hned upraví, co už je vykreslené
export function startEmojiClean() {
  if (typeof MutationObserver === "undefined" || typeof document === "undefined" || !document.body || obs) return;
  obs = new MutationObserver(list => {
    list.forEach(m => { if (m.type === "characterData") queue.add(m.target); else m.addedNodes.forEach(n => queue.add(n)); });
    if (queue.size && !planned) { planned = true; later(flush); }
  });
  obs.observe(document.body, {childList: true, subtree: true, characterData: true});
  fixTree(document.body);
}
// Vypne pozorování (už upravené texty zůstanou; styl .em platí jen ve vzhledu „Čistý“, mimo něj jsou emoji barevná jako dřív)
export function stopEmojiClean() {
  if (obs) obs.disconnect();
  obs = null; queue = new Set(); planned = false;
}
