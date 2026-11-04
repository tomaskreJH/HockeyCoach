// ⏳ Tikající odpočty bez překreslení aplikace: prvek s data-cdt (cílový čas v ms) a data-cdf ("clock" HH:MM:SS | "left" zbývá do termínu)
// se přepisuje jednou za sekundu jediným časovačem; nic se nečte ani nezapisuje do databáze. Texty počítá domain/countdown.js.

// ===== Importy =====
import {clockText, leftText} from "../domain/countdown.js";

// ===== Konstanty a stav =====
let timer = null;                                                // jediný časovač pro celou aplikaci

// ===== Pomocné funkce =====
// Text odpočtu k cílovému času at (ms); „left“ po termínu ukáže „uzavřeno“, „clock“ zůstane na 00:00:00
const textOf = (at, f, now) => (f === "left" ? (at - now > 0 ? leftText(at - now) : "uzavřeno") : clockText(at - now));
// Přepsat všechny odpočty na stránce (jen když se text změnil – bez zbytečných zásahů do stránky)
function tick() {
  if (typeof document === "undefined") return;
  const now = Date.now();
  document.querySelectorAll("[data-cdt]").forEach(el => {
    const t = textOf(+el.dataset.cdt, el.dataset.cdf, now);
    if (el.textContent !== t) el.textContent = t;
  });
}

// ===== Exporty =====
// HTML odpočtu k času at (ms) s okamžitým výchozím textem; první použití spustí časovač
export function cdHtml(at, f) {
  if (!timer && typeof setInterval === "function") {
    timer = setInterval(tick, 1000);
    if (timer && timer.unref) timer.unref();                     // v testech (Node) časovač neudržuje proces naživu
  }
  return `<span data-cdt="${at}" data-cdf="${f}">${textOf(at, f, Date.now())}</span>`;
}
