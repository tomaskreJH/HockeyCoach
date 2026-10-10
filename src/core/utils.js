// Drobné pomocné funkce bez znalosti domény: DOM, formátování, čas, hlášky.

export const norm=t=>String(t||"").trim().toLowerCase();
export const oidOf=t=>{let h=5381;const n=norm(t);for(let i=0;i<n.length;i++)h=((h<<5)+h+n.charCodeAt(i))|0;return"o"+(h>>>0).toString(36)};
export const Q=x=>document.querySelector(x)||{};
export const $=s=>document.querySelector(s);
export const toast=t=>{let e=$("#toast");if(!e){e=document.createElement("div");e.id="toast";e.style.cssText="position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#14202e;color:#fff;padding:12px 18px;border-radius:10px;z-index:50;max-width:90%;font-size:15px";document.body.appendChild(e)}e.textContent=t;e.style.display="block";clearTimeout(e._t);e._t=setTimeout(()=>e.style.display="none",3500)};
export const esc=t=>String(t==null?"":t).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const td=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
export const fd=s=>{const[a,b,c]=s.split("-");return+c+". "+ +b+". "+a};
export const clone=o=>JSON.parse(JSON.stringify(o));
export const uid=()=>Math.random().toString(36).slice(2,10);
export const LS={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
export const cd=ms=>ms<0?"+"+mmss(-ms):mmss(Math.ceil(ms/1000)*1000);
export const mmss=ms=>{const t=Math.floor(Math.max(0,ms)/1000);return String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0")};
