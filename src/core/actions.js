// Akce měnící data: ukládání do databáze, aktualizace zápasu, synchronizace soupeřů.
import {S} from "./state.js";
import {norm, oidOf, toast} from "./utils.js";
import {render} from "../views/shell.js";

export const ensureOp=n=>{n=(n||"").trim();if(n&&!S.op.some(o=>norm(o.name)===norm(n)))S.db.doc("opponents/"+oidOf(n)).set({name:n})};
export const syncOps=()=>{const have=new Set(S.op.map(o=>norm(o.name)));S.ma.forEach(m=>{const k=norm(m.opp);if(k&&!have.has(k)){have.add(k);S.db.doc("opponents/"+oidOf(m.opp)).set({name:m.opp.trim()})}})};
export const save=m=>S.db.doc("matches/"+m.id).set(strip(m)).catch(e=>toast("Uložení se nepovedlo: "+(e.message||e.code)));
export const strip=m=>{const o={...m};delete o.id;return o};
export const saveDef=(lu,bn)=>S.db.doc("settings/lineup").set({lu,bn});
export function upd(n){const i=S.ma.findIndex(x=>x.id===n.id);if(i>=0)S.ma[i]=n;save(n);render()}
