// Nápověda v aplikaci: tlačítko ❓ v záhlaví otevře celoobrazovkový přehled ovládání.
// Struktura: Obsah nápovědy -> Pomocné funkce -> Vykreslení -> Eventy (hledání, zavření) -> Export.
// Nápověda je čistě informační (nesahá do dat ani do stavu aplikace) a funguje i offline.

// ===== Obsah nápovědy =====
// Každá sekce: t = nadpis, h = HTML obsah (zobrazí se po rozbalení)
const SECTIONS = [
  {t: "1. Začátek a přihlášení", h: `
<ul>
<li><b>Přihlášení:</b> účtem Google, který má trenér zapsaný mezi členy týmu (⚙️ → Členové týmu). Neznámý účet nemá přístup.</li>
<li><b>Role:</b> <b>Trenér</b> smí vše. <b>Kustod</b> vede zápasy (nominace, sestava, živý zápis, opravy), soupeře a základní formaci; hráčky nemůže přidávat, mazat ani přejmenovat (zobrazí se hláška <code>permission-denied</code>).</li>
<li><b>První spuštění / přenos dat:</b> ⚙️ → Obnovit ze zálohy (jen trenér) → vyber JSON → <b>Nahradit vším</b>.</li>
<li><b>Telefon:</b> v Chrome otevři adresu aplikace → menu ⋮ → Přidat na plochu / Instalovat aplikaci. Přihlášení zůstává uložené.</li>
<li><b>Bez signálu (hala):</b> aplikace funguje dál, změny se odešlou po připojení. Živý zápis zápasu veď jen z jednoho telefonu (při souběhu vyhrává poslední zápis).</li>
<li><b>Stará verze po aktualizaci:</b> ⚙️ → Načíst novou verzi. Data zůstanou v databázi.</li>
</ul>`},
  {t: "2. Záložka Team – příprava týmu", h: `
<ul>
<li><b>Základní formace:</b> klepnutím vybereš hráčku na místo, podržením a přetažením ji přesuneš (obsazené místo se prohodí). Formace se kopíruje do každého nového zápasu.</li>
<li><b>Náhradnice:</b> všechny nezařazené aktivní hráčky. Přetažením je dáš do sestavy, prohodíš mezi sebou nebo vrátíš mezi náhradnice. Pořadí se pamatuje.</li>
<li><b>Soupiska:</b> přidání, úprava, filtry a stav hráčky (aktivní / zraněná / ukončila). Smí jen trenér. Export: ⚙️ → Soupiska (CSV).</li>
<li><b>Rotace dvou hráček na jednom místě:</b> pod každou pětkou je řádek <b>⇄ rotace</b>. Vyber druhou hráčku, hlavní nastupuje první, pořadí změníš přetažením. Po střídání se do fronty zařadí partnerka, štítek <b>⇄ jméno</b> ukazuje, kdo za hráčku skočí. Klepnutím na štítek rotaci ručně přehodíš (↩ Zpět ji vrátí). Po trestu nebo zranění se hráčka vrací bez rotace.</li>
</ul>`},
  {t: "3. Nový zápas (3 kroky)", h: `
<p><b>Zápas → Sestava → Zápas živě.</b> Nahoře je vždy přehled: soupeř, datum, doma/venku, délka třetiny a stav ✅/⛔ Nominace a Sestava.</p>
<ul>
<li><b>Krok 1 – Zápas:</b> soupeř, datum, doma/venku, délka třetiny (standardně 20 min), prodloužení Ano (5 min) / Ne, vzájemné uzavřené zápasy se soupeřem.</li>
<li><b>Krok 2A – Nominace:</b> klepnutím vyber hráčky k dispozici (min. 1 brankářka a 5 bruslařek). Tlačítka Všechny aktivní / Zrušit vše.</li>
<li><b>Krok 2B – Sestava:</b> naplní se podle základní formace (jen z nominovaných). Uprav řady, náhradnice a jednotky přesilovek a oslabení (<b>Zkopírovat z posledního zápasu</b>). <b>↻ Podle základní formace</b> sestavu přepíše. <b>✔ Uzavřít sestavu</b> umožní spustit živý zápis. Jakákoli změna sestavy uzavření zruší.</li>
<li><b>Pravidlo jednotek:</b> hráčka smí být jen v jedné přesilovce (PP1/PP2) a jen v jednom oslabení téhož druhu (4 hráčky: SH1/SH2, 3 hráčky: SH3/SH4); v běžné řadě být může.</li>
<li><b>Krok 3 – Zápas živě:</b> průběh, jmenné statistiky, zápis utkání, opravy a uzavření zápasu.</li>
<li>Živý zápis jde spustit až po uzavření sestavy a splnění nominace. Po zahájení je zamčená nominace, soupeř, datum a doma/venku.</li>
</ul>`},
  {t: "4. Živý zápis", h: `
<ul>
<li><b>Horní lišta:</b> čas s posunem ◀ ▶ o 5 s, skóre se střelami a aktuální situace (5 na 5, přesilovka, oslabení).</li>
<li><b>Celá pětka na led:</b> tlačítka 1.–4. pětka nasadí celou pětku najednou. Barvy: 1. modrá, 2. žlutá, 3. zelená, 4. růžová, mimo pětky šedá.</li>
<li><b>Střídání:</b> klepnutí na hráčku ve frontě ji pošle na led místo hráčky pod ní. Podržením a přetažením ji pošleš na jinou pozici. Nejbližší hráčka ve frontě je zvýrazněná.</li>
<li><b>Střela:</b> klepnutí na hráčku na ledě zapíše její střelu, <b>STŘELA NA NAŠI BRÁNU</b> střelu soupeře. Při přerušené hře se střely zapsat nedají.</li>
<li><b>Spodní lišta:</b> za běhu jen ↩ Zpět a Start/Přerušit. Po přerušení přibude ⚽ Gól HC Střely, ⚽ Gól soupeř, 🚫 Trest a ⋯ Další volby.</li>
<li><b>Gól naši:</b> střelkyně → 1. asistence → 2. asistence (nebo „Bez asistence“). Situaci nastaví aplikace sama, lze ji přepnout. <b>Gól soupeře:</b> jedno klepnutí.</li>
<li><b>Dlouhé střídání:</b> po překročení limitu (výchozí 2:00, ⋯ → Nastavení) se dlaždice hráčky zbarví a telefon zavibruje.</li>
<li><b>↩ Zpět</b> vrací poslední akci (střídání, střelu, gól, trest, jednotku…).</li>
</ul>`},
  {t: "5. Tresty, přesilovky a oslabení", h: `
<ul>
<li><b>🚫 Trest</b> (po přerušení): hráčka nebo soupeř → délka (2 min, 2+2, 5 min, 10 osobní, do konce) → důvod. Hráčka sejde z ledu a nahoře běží odpočet. <b>Zrušit</b> u trestu opraví omyl.</li>
<li><b>Návrat:</b> po vypršení se hráčka vrátí na svou pozici, na jiné volné místo, nebo do fronty. Po osobním trestu jde do fronty, po „do konce“ se nevrací.</li>
<li><b>Gól ukončí</b> nejstarší dvouminutový trest oslabeného týmu, pokud gól dal tým s větším počtem hráčů na ledě. Pětiminutový trest gólem nekončí. U 2+2 gól ukončí jen první dvě minuty.</li>
<li><b>IIHF pravidla:</b> na ledě min. 3 bruslaři, nejvýše 2 současně odpykávané tresty na tým. Aplikace nepovolí doplnit víc hráček, než dovolují tresty.</li>
<li><b>⚡ Přesilovka 1/2 a 🛡 Oslabení 1/2:</b> při nerovném počtu se nahoře objeví tlačítka jednotek, nasadíš je jedním klepnutím. Vyloučená hráčka se nahradí jinou. <b>↩ Zpět na řady</b> vrátí běžné řady. Při oslabení se zobrazí jen 4 resp. 3 pozice.</li>
<li><b>Úprava jednotek za zápasu:</b> ⋯ → Jednotky PP/OS.</li>
<li>Nemodelováno: odložený trest, trestné střílení a zvláštní pravidla pro tresty brankářky.</li>
</ul>`},
  {t: "6. Menu ⋯ a zranění", h: `
<ul>
<li><b>👥 Sestava:</b> změna sestavy za zápasu klepnutím nebo přetažením, promítne se do front.</li>
<li><b>🤕 Zranění → 🩹 Dočasně:</b> hráčka je mimo led a fronty, zůstává v nominaci. Vrátíš ji tlačítkem <b>↩ Vrátit</b> (zařadí se na konec fronty své pozice) nebo ji převedeš na <b>Trvalé</b>.</li>
<li><b>🤕 Trvale:</b> hráčka je odebrána z nominace i sestavy a v soupisce označena jako zraněná. Smí i kustod.</li>
<li><b>🧤 Brankářka:</b> výměna brankářky v bráně.</li>
<li><b>⬇️ Sundat z ledu:</b> ruční odstranění hráčky z ledu. <b>🔄 Sestava znovu:</b> znovu načte řady ze sestavy.</li>
<li><b>Čas na ledě</b> (⋯ → Čas na ledě): přehled časů a střídání, tabulku lze řadit klepnutím na hlavičku.</li>
<li><b>⚙️ Nastavení:</b> limit dlouhého střídání (pamatuje se v každém zařízení zvlášť).</li>
<li><b>Konec třetiny / Konec zápasu:</b> po 3. třetině se prodlužuje jen při nerozhodném stavu a povoleném prodloužení, jinak tlačítko znamená Konec zápasu. Konec jde vrátit (↩ Zpět nebo „Zrušit konec zápasu“).</li>
</ul>`},
  {t: "7. Zápis utkání a opravy", h: `
<ul>
<li><b>Zápis utkání</b> (krok 3): výsledek po třetinách, góly a asistence, sestava, průběh, statistiky a <b>Podrobný rozbor</b> (kompletní vývoj zápasu, střídání hráček s průměrem a nejdelším střídáním, dlouhá střídání označena ⚠️).</li>
<li><b>Export:</b> 🖨 Tisk / PDF, 💾 HTML, ⬇️ CSV vývoj, ⬇️ CSV střídání. Přepínače Střely / Střídání ve vývoji zkracují přehled.</li>
<li><b>✏️ Opravit zápis</b> (hodiny musí stát, zápas nesmí být uzavřený) má čtyři záložky:
 <ul>
 <li><b>Události:</b> přidání, úprava a smazání gólů, vyloučení a střel.</li>
 <li><b>Třetiny a konec:</b> délky třetin (posun změní pozdější časy), označení/zrušení konce zápasu, zrušení omylem založeného prodloužení.</li>
 <li><b>Střídání:</b> úprava časů, výměna hráčky, předání od zadaného času, přidání zapomenutého střídání, smazání a 🧹 Vyčistit prázdná a duplicitní. Nahoře se hlásí nesrovnalosti.</li>
 <li><b>Základ:</b> soupeř, datum, doma/venku, délka třetiny, prodloužení.</li>
 </ul></li>
<li><b>Uzavření zápasu:</b> po uzavření je zápas zamčený (do statistik se počítají jen uzavřené). Opravy po <b>Znovu otevřít</b>.</li>
</ul>`},
  {t: "8. Statistiky, soupeři a řazení tabulek", h: `
<ul>
<li><b>Statistiky hráčů</b> (jen uzavřené zápasy): Z, <b>Ø stř.</b> (průměrná délka střídání), střely, góly, %, asistence, body, +/-, TM, góly v PP, body doma a venku. +/- se nepočítá u gólů v přesilovce.</li>
<li><b>Ø stř.</b> = celkový čas na ledě děleno počtem střídání hráčky (jen zápasy se živým zápisem, bez střídání „–“).</li>
<li><b>Tým</b> a <b>Brankáři</b> (střely, góly, zákroky, úspěšnost). <b>Soupeři:</b> správa soupeřů a vzájemné zápasy.</li>
<li><b>Řazení:</b> klepnutím na hlavičku sloupce. První klepnutí řadí čísla a časy sestupně, text vzestupně, další přepíná ▲/▼. Funguje u všech tabulek statistik, tabulky střídání a času na ledě. Prázdné hodnoty jsou vždy na konci.</li>
</ul>`},
  {t: "9. Záloha a nastavení účtu (⚙️)", h: `
<ul>
<li><b>Stáhnout zálohu (JSON):</b> kompletní záloha (smí každý člen). Dělej ji pravidelně.</li>
<li><b>Soupiska (CSV):</b> export pro Excel.</li>
<li><b>Obnovit ze zálohy</b> (jen trenér): <b>Sloučit s daty</b> přidá/přepíše položky, <b>Nahradit vším</b> nahradí celý obsah (druhé klepnutí potvrdí). Vyžaduje internet.</li>
<li><b>Členové týmu</b> (jen trenér): přidání a odebrání e-mailů s rolí. Vlastní účet nelze odebrat.</li>
<li><b>Načíst novou verzi:</b> smaže uloženou kopii aplikace, data zůstanou. Číslo verze je vedle názvu nahoře.</li>
</ul>`},
  {t: "10. Rychlá reference", h: `
<table style="width:100%;border-collapse:collapse">
<tr><th style="text-align:left">Úkol</th><th style="text-align:left">Kde</th></tr>
<tr><td>Přidat hráčku</td><td>Team → Soupiska</td></tr>
<tr><td>Nastavit pětky</td><td>Team → Základní formace</td></tr>
<tr><td>Založit zápas</td><td>Zápasy → + Nový zápas</td></tr>
<tr><td>Vybrat nominaci</td><td>Krok 2 → A Nominace</td></tr>
<tr><td>Uzavřít sestavu</td><td>Krok 2 → ✔ Uzavřít sestavu</td></tr>
<tr><td>Spustit živý zápis</td><td>Zahájit zápas (krok 1 nebo 3)</td></tr>
<tr><td>Střídání</td><td>Klepnout na hráčku ve frontě</td></tr>
<tr><td>Střela</td><td>Klepnout na hráčku na ledě</td></tr>
<tr><td>Gól / trest</td><td>Přerušit hru → ⚽ / 🚫</td></tr>
<tr><td>Změnit sestavu za zápasu</td><td>⋯ → 👥 Sestava</td></tr>
<tr><td>Zranění</td><td>⋯ → 🤕 Zranění</td></tr>
<tr><td>Opravit událost / střídání</td><td>Krok 3 → ✏️ Opravit zápis</td></tr>
<tr><td>Vytisknout zápis</td><td>Krok 3 → 📄 Otevřít zápis utkání → 🖨</td></tr>
<tr><td>Vytvořit zálohu</td><td>⚙️ → Stáhnout zálohu (JSON)</td></tr>
</table>`}
];

// ===== Pomocné funkce =====
// Vykreslí celý obsah nápovědy (styl jen pro #hlp, aby se nemusel měnit main.css)
const html = () => `<style>
#hlp ul{margin:6px 0 6px 20px;padding:0}#hlp li{margin:4px 0}
#hlp details{background:var(--cd);border:1px solid var(--bd);border-radius:12px;padding:0 14px;margin-bottom:10px}
#hlp summary{cursor:pointer;font-weight:700;padding:14px 0;font-size:16px}
#hlp details[open] summary{border-bottom:1px solid var(--bd);margin-bottom:8px}
#hlp details>*:last-child{margin-bottom:12px}
#hlp code{background:var(--a2);padding:1px 5px;border-radius:4px}
#hlp td,#hlp th{border-bottom:1px solid var(--bd);padding:6px 4px}
</style>
<div style="max-width:800px;margin:0 auto">
<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px"><h2 style="margin:0">❓ Nápověda</h2><button class="p" id="hlx">Zavřít</button></div>
<input id="hlq" placeholder="Hledat v nápovědě (např. trest, záloha, rotace)">
${SECTIONS.map(s => `<details><summary>${s.t}</summary>${s.h}</details>`).join("")}
<div class="mu" style="text-align:center;margin-top:14px">Podrobný návod ke stažení: soubor <code>hockeycoach-navod.html</code> (jde vytisknout do PDF).</div>
<button class="s w" id="hlx2" style="margin-top:14px;min-height:52px">Zavřít</button>
</div>`;

// ===== Vykreslení =====
function openHelp() {
  let el = document.getElementById("hlp");
  if (!el) { el = document.createElement("div"); el.id = "hlp"; document.body.appendChild(el); }
  // Nad živým zápisem (z-index 15), zápisem utkání (40) a opravami (41)
  el.style.cssText = "position:fixed;inset:0;z-index:55;background:var(--bg);overflow:auto;padding:12px;padding-top:calc(12px + env(safe-area-inset-top,0px));padding-bottom:calc(40px + env(safe-area-inset-bottom,0px));display:block";
  el.innerHTML = html();
  el.scrollTop = 0;
  const close = () => { el.style.display = "none"; el.innerHTML = ""; document.removeEventListener("keydown", onKey); };
  const onKey = e => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);
  el.querySelector("#hlx").onclick = close;
  el.querySelector("#hlx2").onclick = close;
  // Hledání: skryje nevyhovující sekce a vyhovující rozbalí
  el.querySelector("#hlq").oninput = ev => {
    const q = ev.target.value.trim().toLowerCase();
    el.querySelectorAll("details").forEach(d => {
      const hit = !q || d.textContent.toLowerCase().includes(q);
      d.style.display = hit ? "" : "none";
      d.open = !!q && hit;
    });
  };
}

// ===== Export =====
// Napojení tlačítka ❓ v záhlaví (index.html)
export function initHelp() {
  const b = document.getElementById("help");
  if (b) b.onclick = openHelp;
}