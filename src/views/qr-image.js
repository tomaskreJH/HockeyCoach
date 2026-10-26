// ⚠️ Uložení QR platby do telefonu: PNG ve vysokém rozlišení s tichou zónou a popiskem (účet, IBAN, částka, VS, zpráva, datum).
// Kreslí se z TÉHOŽ objektu qrcode, který okno QR v mine.js zobrazilo – obsah QR se nemění; jen po kontrole účtu.
// Sdílet (navigator.canShare – Android, iPhone), jinde stažení; soubor QR-platba-RRRR-MM-DD-VS.png.
// ===== Konstanty =====
const QR_PX = 1000;     // cílová šířka samotného QR (bez tiché zóny) v pixelech
const QUIET = 4;        // tichá zóna kolem QR v modulech (norma QR = 4)
const PAD = 0.06;       // okraj popisku vlevo / vpravo (podíl šířky obrázku)

// ===== Pomocné funkce =====
const pad2 = n => String(n).padStart(2, "0");
// Datum ve tvaru RRRR-MM-DD podle místního času (pro název souboru)
const isoDay = d => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
// Název souboru: jen bezpečné znaky (VS je číselný, ale pro jistotu se ostatní znaky vypustí)
export const qrFileName = (vs, d = new Date()) => "QR-platba-" + isoDay(d) + (String(vs || "").replace(/[^0-9A-Za-z]/g, "") ? "-" + String(vs).replace(/[^0-9A-Za-z]/g, "") : "") + ".png";

// Zalomení textu do řádků podle šířky (canvas neumí zalamovat sám)
function wrap(ctx, text, maxW) {
  const out = [];
  String(text).split(/\n/).forEach(par => {
    let line = "";
    par.split(" ").forEach(w => {
      const t = line ? line + " " + w : w;
      if (ctx.measureText(t).width <= maxW || !line) line = t;
      else { out.push(line); line = w; }
    });
    out.push(line);
  });
  return out;
}

// Převod data URL na Blob synchronně – sdílení musí proběhnout hned v rámci klepnutí (aktivace uživatelem)
function dataUrlBlob(url) {
  const [head, b64] = url.split(","), bin = atob(b64), arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], {type: (head.match(/data:([^;]+)/) || [])[1] || "image/png"});
}

// ===== Vykreslení obrázku =====
// q = objekt qrcode po make(); info = {title, accName, cz, iban, amt, vs, msg, inst, created}
// Vrací canvas (nebo null, když prohlížeč canvas nepodporuje)
export function drawQrCanvas(q, info) {
  const n = q.getModuleCount(), cell = Math.max(4, Math.ceil(QR_PX / n));
  const W = (n + QUIET * 2) * cell, fs = Math.round(W / 30), lh = Math.round(fs * 1.45), side = Math.round(W * PAD);
  const cv = document.createElement("canvas"), ctx = cv.getContext && cv.getContext("2d");
  if (!ctx) return null;
  // Řádky popisku: [popis, hodnota, tučně?]
  const rows = [
    ["", info.title, true],
    ["Příjemce: ", info.accName, false],
    ["Účet: ", info.cz || info.iban, true],
    ["IBAN: ", info.ibanFmt || info.iban, false],
    ["Částka: ", info.amtTxt, true],
    ["Variabilní symbol: ", info.vs, true],
    ["Zpráva pro příjemce: ", info.msg, false]
  ];
  if (info.inst) rows.push(["", "Okamžitá platba (pokud ji banka podporuje)", false]);
  rows.push(["Vytvořeno: ", info.created, false]);
  // Nejdřív změřit výšku popisku (zalomení podle šířky), pak nastavit velikost plátna
  ctx.font = fs + "px sans-serif";
  const lines = [];
  rows.forEach(([k, v, b]) => wrap(ctx, k + (v == null ? "" : v), W - side * 2).forEach((t, i) => lines.push({t, b: b ? (i === 0 ? k.length : 0) : -1})));
  const capH = lines.length * lh + side;
  cv.width = W; cv.height = W + capH;
  // Bílé pozadí celého obrázku (tichá zóna i popisek – čitelné i z tmavého režimu)
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cv.width, cv.height);
  // Moduly QR – černé čtverce, posunuté o tichou zónu
  ctx.fillStyle = "#000000";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect((c + QUIET) * cell, (r + QUIET) * cell, cell, cell);
  // Popisek pod QR: popis běžným písmem, hodnota u důležitých řádků tučně
  ctx.textBaseline = "top"; ctx.fillStyle = "#14202e";
  let y = W;
  lines.forEach(({t, b}) => {
    if (b >= 0) {
      ctx.font = fs + "px sans-serif"; ctx.fillText(t.slice(0, b), side, y);
      const w = ctx.measureText(t.slice(0, b)).width;
      ctx.font = "bold " + fs + "px sans-serif"; ctx.fillText(t.slice(b), side + w, y);
    } else { ctx.font = fs + "px sans-serif"; ctx.fillText(t, side, y); }
    y += lh;
  });
  return cv;
}

// ===== Uložení (Sdílet / stažení) =====
// Vrací "share" | "download" | "cancel" | "error"
export async function saveQrImage(q, info, name) {
  const cv = drawQrCanvas(q, info);
  if (!cv) return "error";
  const url = cv.toDataURL("image/png"), blob = dataUrlBlob(url);
  // Sdílet se souborem (Android: Uložit do Galerie / bankovní aplikace) – jen kde to prohlížeč umí
  let file = null;
  try { file = new File([blob], name, {type: "image/png"}); } catch (e) { file = null; }
  if (file && navigator.canShare && navigator.share && navigator.canShare({files: [file]})) {
    try { await navigator.share({files: [file], title: "QR platba"}); return "share"; }
    catch (e) { if (e && e.name === "AbortError") return "cancel"; }   // zrušení uživatelem nic nedělá; jiná chyba → stažení
  }
  // Stažení souboru (PC, prohlížeče bez sdílení souborů)
  const href = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = href; a.download = name; a.style.display = "none";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10000);
  return "download";
}
