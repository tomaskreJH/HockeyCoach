// Akce měnící data: ukládání do databáze, aktualizace zápasu, synchronizace soupeřů, oprava uzavřených zápasů, potvrzení druhým klepnutím.
// Struktura: Importy -> Soupeři -> Ukládání (strip, save, upd) -> Oprava uzavřených zápasů -> Potvrzení druhým klepnutím (confirm2).
// V náhledu role jen ke čtení save nic neodešle a upd nezmění místní kopii zápasu (hláška „V náhledu se nezapisuje“).
import {HK} from "../data/storage.js";
import {compactRot} from "./selectors.js";
import {S} from "./state.js";
import {clone, failMsg, norm, oidOf, toast} from "./utils.js";
import {render} from "../views/shell.js";

// ===== Soupeři =====
export const ensureOp=n=>{n=(n||"").trim();if(n&&!S.op.some(o=>norm(o.name)===norm(n)))S.db.doc("opponents/"+oidOf(n)).set({name:n})};
export const syncOps=()=>{const have=new Set(S.op.map(o=>norm(o.name)));S.ma.forEach(m=>{const k=norm(m.opp);if(k&&!have.has(k)){have.add(k);S.db.doc("opponents/"+oidOf(m.opp)).set({name:m.opp.trim()})}})};

// ===== Ukládání =====
export const save=m=>HK.blocked()?Promise.resolve():S.db.doc("matches/"+m.id).set(strip(m)).catch(e=>toast(failMsg("Uložení", (e.message||e.code))));
// Kopie bez id pro zápis. Uzavřený zápas nesmí mít běžící hodiny (statistiky by dál rostly), proto se při zápisu hodiny zastaví.
export const strip=m=>{const o={...m};delete o.id;
if(o.closed&&o.live&&o.live.running){const L=o.live;o.live={...L,acc:L.acc+(L.t0?Date.now()-L.t0:0),running:false,t0:0}}
return o};
export const saveDef=(lu,bn)=>S.db.doc("settings/lineup").set({lu:compactRot(lu),bn});
// V náhledu jen ke čtení zůstane zápas beze změny (jen se překreslí, aby zmizel rozpracovaný stav)
export function upd(n){if(HK.blocked()){render();return}const i=S.ma.findIndex(x=>x.id===n.id);if(i>=0)S.ma[i]=n;save(n);render()}

// ===== Oprava uzavřených zápasů =====
// Zápasy uzavřené ve starších verzích mohou mít stále běžící hodiny. Hodiny se zastaví na posledním zaznamenaném čase (acc).
export const fixClosed=()=>S.ma.filter(m=>m.closed&&m.live&&m.live.running).forEach(m=>{const n=clone(m);n.live.running=false;n.live.t0=0;save(n)});

// ===== Potvrzení druhým klepnutím =====
// Délka označení před automatickým zrušením (ms)
export const CONFIRM_MS = 4000;
// Je akce s klíčem označená (čeká na druhé klepnutí)? Pohledy podle toho mění text a barvu tlačítka.
export const armed = key => S.cf === key;
// První klepnutí jen označí klíč a překreslí, druhé klepnutí do 4 s provede fn; jinak se označení po 4 s samo zruší.
// redraw = překreslení (výchozí celá obrazovka; editor zápasu a opravy střídání předají vlastní).
export function confirm2(key, fn, redraw = render) {
  if (S.cf === key) { S.cf = null; fn(); return; }
  S.cf = key; redraw();
  setTimeout(() => { if (S.cf === key) { S.cf = null; redraw(); } }, CONFIRM_MS);
}
