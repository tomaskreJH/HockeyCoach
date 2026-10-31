// Drobné pomocné funkce bez znalosti domény: DOM, formátování, čas, hlášky.

export const norm=t=>String(t||"").trim().toLowerCase();
export const oidOf=t=>{let h=5381;const n=norm(t);for(let i=0;i<n.length;i++)h=((h<<5)+h+n.charCodeAt(i))|0;return"o"+(h>>>0).toString(36)};
export const Q=x=>document.querySelector(x)||{};
export const $=s=>document.querySelector(s);
// Hláška je nad všemi okny (z-index 80), aby byla vidět i nad nastavením pokladny a oknem úhrady
export const toast=t=>{let e=$("#toast");if(!e){e=document.createElement("div");e.id="toast";e.style.cssText="position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#14202e;color:#fff;padding:12px 18px;border-radius:10px;z-index:80;max-width:90%;font-size:15px";document.body.appendChild(e)}e.textContent=t;e.style.display="block";clearTimeout(e._t);e._t=setTimeout(()=>e.style.display="none",3500)};
export const esc=t=>String(t==null?"":t).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const td=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
export const fd=s=>{const[a,b,c]=s.split("-");return+c+". "+ +b+". "+a};
export const clone=o=>JSON.parse(JSON.stringify(o));
// Číslo omezené do rozsahu a – b; zaokrouhlení nahoru na celé Kč s tolerancí chyby desetinných čísel
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export const ceil=x=>Math.ceil(x-1e-9);
// Tvar slova „žádost“ podle počtu (1 žádost, 2–4 žádosti, 5 žádostí)
export const reqWord=n=>(n===1?"žádost":n>=2&&n<=4?"žádosti":"žádostí");
export const uid=()=>Math.random().toString(36).slice(2,10);
export const LS={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
export const cd=ms=>ms<0?"+"+mmss(-ms):mmss(Math.ceil(ms/1000)*1000);
// Termín přihlašování (formát input datetime-local "RRRR-MM-DDTHH:MM"): výchozí den před událostí v 18:00 a text pro zobrazení „21. 10. 18:00“
const p2=n=>String(n).padStart(2,"0");
export const dlDefault=date=>{if(!date)return"";const d=new Date(date+"T18:00:00");d.setDate(d.getDate()-1);return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate())+"T18:00"};
export const dlText=dl=>{const d=new Date(dl);return !dl||isNaN(d)?"":d.getDate()+". "+(d.getMonth()+1)+". "+p2(d.getHours())+":"+p2(d.getMinutes())};
// Termín přihlašování musí být před začátkem události (bez času začátku = konec dne)
export const dlBeforeStart=(dl,date,time)=>!dl||new Date(dl)<=new Date(date+"T"+(time||"23:59"));
export const mmss=ms=>{const t=Math.floor(Math.max(0,ms)/1000);return String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0")};
// Text CSV pro Excel (jediná implementace): oddělovač středník, každá hodnota v uvozovkách (uvozovky zdvojené), BOM UTF-8, konce řádků CRLF
export const csv=rows=>"\ufeff"+rows.map(r=>r.map(v=>'"'+String(v==null?"":v).replace(/"/g,'""')+'"').join(";")).join("\r\n");
// Stažení textového souboru (záloha, zápis, CSV)
export function downloadFile(name,text,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
// 📤 Sdílení textu (jediná implementace): nabídka sdílení telefonu (WhatsApp, SMS …), jinak zkopírovat do schránky s hláškou copied;
// vrací "share" | "copy" | "cancel" (zavřené sdílení) | "fail" (ani schránka – volající ukáže text k ručnímu zkopírování)
export async function shareText(text,copied){if(navigator.share){try{await navigator.share({text});return"share"}catch(e){if(e&&e.name==="AbortError")return"cancel"}}try{await navigator.clipboard.writeText(text);toast(copied||"Text zkopírován");return"copy"}catch(e){return"fail"}}
