// Nápověda v aplikaci: tlačítko ❓ v záhlaví otevře celoobrazovkový přehled ovládání.
// Struktura: Obsah nápovědy -> Pomocné funkce -> Vykreslení -> Eventy (hledání, zavření) -> Export.
// Nápověda je čistě informační (nesahá do dat ani do stavu aplikace) a funguje i offline. Je jediným návodem k aplikaci
// (samostatný soubor hockeycoach-navod.html byl v17.3 odstraněn); při změně ovládání se upravuje jen pole SECTIONS.

// ===== Obsah nápovědy =====
// Každá sekce: t = nadpis, h = HTML obsah (zobrazí se po rozbalení)
const SECTIONS = [
  {t: "1. Začátek, přihlášení a role", h: `
<ul>
<li><b>Přihlášení:</b> účtem Google, který má trenér zapsaný mezi členy týmu (⚙️ → Členové týmu). Neznámý účet nemá přístup.</li>
<li><b>Trenér</b> smí vše. <b>Kustod</b> vede zápasy (nominace, sestava, živý zápis, opravy), soupeře, základní formaci, události a docházku; u hráčky mění jen stav. <b>Hráčka</b> vidí Události, Statistiky a Moje platby a zapisuje docházku jen za sebe. <b>Pokladník</b> je příznak navíc k roli: spravuje pokladnu, skupiny plateb a platy.</li>
<li><b>Telefon:</b> v Chrome otevři adresu aplikace → menu ⋮ → Přidat na plochu / Instalovat aplikaci. Přihlášení zůstává uložené.</li>
<li><b>Bez signálu (hala):</b> aplikace funguje dál, změny se odešlou po připojení. Živý zápis zápasu veď jen z jednoho telefonu (při souběhu vyhrává poslední zápis).</li>
<li><b>Stará verze po aktualizaci:</b> ⚙️ → Načíst novou verzi. Data zůstanou v databázi.</li>
</ul>`},
  {t: "2. Události a docházka", h: `
<ul>
<li><b>Záložka Události</b> obsahuje tréninky i zápasy: Nadcházející, Minulé a Kalendář (klepnutím na den se seznam zúží).</li>
<li><b>✅ Jdu / ❌ Nejdu / ❓ Nejsem jistý:</b> Jdu se zapíše hned (opakované klepnutí ho zruší), Nejdu vyžaduje důvod, u Nejsem jistý je nepovinný.</li>
<li><b>Termín přihlašování:</b> po termínu (a po dni události) se tlačítka zamknou 🔒. Trenér a kustod mohou odpovědi měnit i potom.</li>
<li><b>Trenér a kustod</b> vybírají nahoře „Zapisuji účast za“ (hráčku nebo člena realizačního týmu); propojený člen týmu má tlačítko 👤 Přihlašuji se sám za sebe.</li>
<li><b>+ Trénink / + Zápas:</b> založení události. Zápas se otevře klepnutím na něj → 🏒 Otevřít zápas.</li>
<li><b>Rozdělení do pětek</b> (detail tréninku): 1.–4. pětka nebo „–“, ↻ Podle základní formace. Hráčka vidí rozdělení jen ke čtení.</li>
<li><b>Uzavřený zápas:</b> v detailu události je výsledek a statistiky zápasu pro všechny členy týmu.</li>
<li><b>Dluh po splatnosti</b> blokuje vlastní přihlášení „Jdu“, dokud ho nezaplatíš (nebo pokladník neudělí výjimku). Červený banner vede do Moje platby.</li>
</ul>`},
  {t: "3. Záložka Team – příprava týmu", h: `
<ul>
<li><b>Základní formace:</b> klepnutím vybereš hráčku na místo, podržením a přetažením ji přesuneš (obsazené místo se prohodí). Formace se kopíruje do každého nového zápasu a slouží k rozdělení do pětek na tréninku.</li>
<li><b>Náhradnice:</b> všechny nezařazené aktivní hráčky. Přetažením je dáš do sestavy, prohodíš mezi sebou nebo vrátíš mezi náhradnice. Pořadí se pamatuje.</li>
<li><b>Soupiska:</b> přidání a smazání hráčky jen trenér; úprava stavu (aktivní / zraněná / ukončila) i kustod; skupina plateb (Příspěvek / Za událost), osvobozená (zvýhodněná), koeficient v procentech (0–100 % z ceny) a poznámka trenér a pokladník.</li>
<li><b>Realizační tým:</b> členy přidává a maže trenér, plat (měsíčně / za událost) nastavuje trenér nebo pokladník (Upravit → Plat).</li>
<li><b>Rotace dvou hráček na jednom místě:</b> pod každou pětkou je řádek <b>⇄ rotace</b>. Hlavní hráčka nastupuje první, pořadí změníš přetažením. Štítek <b>⇄ jméno</b> ve frontě ukazuje, kdo za hráčku skočí, klepnutím rotaci ručně přehodíš.</li>
</ul>`},
  {t: "4. Nový zápas (3 kroky)", h: `
<p><b>Zápas → Sestava → Zápas živě.</b> Nahoře je vždy přehled: soupeř, datum, doma/venku, délka třetiny a stav ✅/⛔ Nominace a Sestava.</p>
<ul>
<li><b>Krok 1 – Zápas:</b> soupeř, datum, doma/venku, délka třetiny (standardně 20 min), prodloužení Ano (5 min) / Ne, vzájemné uzavřené zápasy se soupeřem.</li>
<li><b>Krok 2A – Nominace:</b> nominovat jde jen hráčky přihlášené na událost (✅ Jdu). Minimum 1 brankářka a 5 bruslařek. Tlačítka Všechny přihlášené / Zrušit vše.</li>
<li><b>Krok 2B – Sestava:</b> naplní se podle základní formace (jen z nominovaných). Uprav řady, náhradnice a jednotky přesilovek a oslabení (<b>Zkopírovat z posledního zápasu</b>). <b>✔ Uzavřít sestavu</b> umožní spustit živý zápis. Jakákoli změna sestavy uzavření zruší.</li>
<li><b>Pravidlo jednotek:</b> hráčka smí být jen v jedné přesilovce (PP1/PP2) a jen v jednom oslabení téhož druhu (4 hráčky: SH1/SH2, 3 hráčky: SH3/SH4); v běžné řadě být může.</li>
<li><b>Krok 3 – Zápas živě:</b> průběh, jmenné statistiky, zápis utkání, opravy a uzavření zápasu (u trenéra a pokladníka vznikne vyúčtování plateb).</li>
<li>Živý zápis jde spustit až po uzavření sestavy a splnění nominace. Po zahájení je zamčená nominace, soupeř, datum a doma/venku.</li>
</ul>`},
  {t: "5. Živý zápis", h: `
<ul>
<li><b>Horní lišta:</b> čas s posunem ◀ ▶ o 5 s, skóre se střelami a aktuální situace (5 na 5, přesilovka, oslabení).</li>
<li><b>Celá pětka na led:</b> tlačítka 1.–4. pětka nasadí celou pětku najednou. Barvy: 1. modrá, 2. žlutá, 3. zelená, 4. růžová, mimo pětky šedá.</li>
<li><b>Střídání:</b> klepnutí na hráčku ve frontě ji pošle na led místo hráčky pod ní. Podržením a přetažením ji pošleš na jinou pozici. Nejbližší hráčka ve frontě je zvýrazněná.</li>
<li><b>Střela:</b> klepnutí na hráčku na ledě zapíše její střelu, <b>STŘELA NA NAŠI BRÁNU</b> střelu soupeře. Při přerušené hře se střely zapsat nedají.</li>
<li><b>Spodní lišta:</b> za běhu jen ↩ Zpět a Start/Přerušit. Po přerušení přibude ⚽ Gól naši, ⚽ Gól soupeř, 🚫 Trest a ⋯ Další volby.</li>
<li><b>Gól naši:</b> střelkyně → 1. asistence → 2. asistence (nebo „Bez asistence“). Situaci nastaví aplikace sama. <b>Gól soupeře:</b> jedno klepnutí.</li>
<li><b>Dlouhé střídání:</b> po překročení limitu (výchozí 2:00, ⋯ → Nastavení) se dlaždice hráčky zbarví a telefon zavibruje.</li>
<li><b>↩ Zpět</b> vrací poslední akci (střídání, střelu, gól, trest, jednotku…).</li>
<li>Za živého zápisu živá obrazovka překrývá záhlaví s ❓ – nápovědu otevři před zápasem nebo po ✕ Zavřít živý zápis.</li>
</ul>`},
  {t: "6. Tresty, přesilovky a oslabení", h: `
<ul>
<li><b>🚫 Trest</b> (po přerušení): hráčka nebo soupeř → délka (2 min, 2+2, 5 min, 10 osobní, do konce) → důvod. Hráčka sejde z ledu a nahoře běží odpočet. <b>Zrušit</b> u trestu opraví omyl.</li>
<li><b>Návrat:</b> po vypršení se hráčka vrátí na svou pozici, na jiné volné místo, nebo do fronty. Po osobním trestu jde do fronty, po „do konce“ se nevrací.</li>
<li><b>Gól ukončí</b> nejstarší dvouminutový trest oslabeného týmu, pokud gól dal tým s větším počtem hráčů na ledě. Pětiminutový trest gólem nekončí. U 2+2 gól ukončí jen první dvě minuty.</li>
<li><b>IIHF pravidla:</b> na ledě min. 3 bruslaři, nejvýše 2 současně odpykávané tresty na tým. Aplikace nepovolí doplnit víc hráček, než dovolují tresty.</li>
<li><b>⚡ Přesilovka 1/2 a 🛡 Oslabení 1/2:</b> při nerovném počtu se nahoře objeví tlačítka jednotek, nasadíš je jedním klepnutím. Vyloučená hráčka se nahradí jinou. <b>↩ Zpět na řady</b> vrátí běžné řady. Při oslabení se zobrazí jen 4 resp. 3 pozice.</li>
<li><b>Úprava jednotek za zápasu:</b> ⋯ → Jednotky PP/OS.</li>
<li>Nemodelováno: odložený trest, trestné střílení a zvláštní pravidla pro tresty brankářky.</li>
</ul>`},
  {t: "7. Menu ⋯ a zranění", h: `
<ul>
<li><b>👥 Sestava:</b> změna sestavy za zápasu klepnutím nebo přetažením, promítne se do front.</li>
<li><b>🤕 Zranění → 🩹 Dočasně:</b> hráčka je mimo led a fronty, zůstává v nominaci. Vrátíš ji tlačítkem <b>↩ Vrátit</b> (zařadí se na konec fronty své pozice) nebo ji převedeš na <b>Trvalé</b>.</li>
<li><b>🤕 Trvale:</b> hráčka je odebrána z nominace i sestavy a v soupisce označena jako zraněná. Smí i kustod.</li>
<li><b>🧤 Brankářka:</b> výměna brankářky v bráně.</li>
<li><b>⬇️ Sundat z ledu:</b> ruční odstranění hráčky z ledu. <b>🔄 Sestava znovu:</b> znovu načte řady ze sestavy.</li>
<li><b>📊 Čas na ledě:</b> přehled časů a střídání, tabulku lze řadit klepnutím na hlavičku.</li>
<li><b>⚙️ Nastavení:</b> limit dlouhého střídání (pamatuje se v každém zařízení zvlášť).</li>
<li><b>Konec třetiny / Konec zápasu:</b> po 3. třetině se prodlužuje jen při nerozhodném stavu a povoleném prodloužení, jinak tlačítko znamená Konec zápasu. Konec jde vrátit (↩ Zpět nebo „Zrušit konec zápasu“).</li>
</ul>`},
  {t: "8. Zápis utkání a opravy", h: `
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
<li><b>Smazání zápasu</b> smaže i jeho docházku. Vyúčtovaný zápas smaže jen trenér nebo pokladník a jen bez nezaplacených předpisů.</li>
</ul>`},
  {t: "9. Statistiky, soupeři a řazení tabulek", h: `
<ul>
<li><b>Záložka Statistiky</b> je přístupná všem členům týmu, včetně hráček (jen ke čtení).</li>
<li><b>Statistiky hráčů</b> (jen uzavřené zápasy): Z, <b>Ø stř.</b> (průměrná délka střídání), střely, góly, %, asistence, body, +/-, TM, góly v PP, body doma a venku. +/- se nepočítá u gólů v přesilovce.</li>
<li><b>Ø stř.</b> = celkový čas na ledě děleno počtem střídání hráčky (jen zápasy se živým zápisem, bez střídání „–“).</li>
<li><b>Tým</b> a <b>Brankáři</b> (střely, góly, zákroky, úspěšnost). <b>Soupeři</b> (trenér, kustod): správa soupeřů a vzájemné zápasy.</li>
<li><b>Řazení:</b> klepnutím na hlavičku sloupce. První klepnutí řadí čísla a časy sestupně, text vzestupně, další přepíná ▲/▼. Prázdné hodnoty jsou vždy na konci.</li>
</ul>`},
  {t: "10. Moje platby", h: `
<ul>
<li><b>Moje platby</b> vidí každý, kdo má účet propojený s hráčkou nebo členem týmu: dluh, částka po splatnosti a seznam předpisů (události i měsíční příspěvky).</li>
<li><b>📱 Zaplatit (QR):</b> QR platba pro bankovní aplikaci (účet, částka, variabilní symbol). Zaplacení se v aplikaci objeví, až ho pokladník zapíše.</li>
<li><b>Blokace:</b> neuhrazený předpis po splatnosti zablokuje vlastní přihlášení „Jdu“. Odhlásit se a „Nejdu“ jde vždy.</li>
</ul>`},
  {t: "11. Pokladna (trenér a pokladník)", h: `
<ul>
<li><b>Kdo platí:</b> každá skupina (s příspěvkem, za událost, osvobozené) má vlastní volbu Platí ANO / NE a Výpočet / Pevná částka – v šablonách i u každé události. Cena se dělí všemi přihlášenými hráčkami (každá jako jeden celý kus) a násobí koeficientem hráčky v %.</li>
<li><b>Vyúčtování události</b> (detail události → 💰 Pokladna): šablona, náklady, kdo platí (výpočet / pevná částka), náhled „vybereme X z Y“ a <b>Uzavřít vyúčtování</b> → vzniknou předpisy. Po uzavření se nic samo nepřepočítává; úprava jen přes ↩ Znovu otevřít.</li>
<li><b>💰 Platby:</b> dluhy podle hráček a podle událostí a příspěvků, 💳 úhrada (i částečná), ✅ Zaplatila vše, 🔒 výjimka z blokace u předpisu po splatnosti, neuzavřená vyúčtování.</li>
<li><b>🏦 Pokladna:</b> zůstatek, ➕ vklad / příjem, ➖ výdaj, součty podle kategorií, seznam pohybů s filtry, 🗑 storno (u úhrady vrátí částku na předpis).</li>
<li><b>📅 Měsíce – příspěvky:</b> vyber měsíc ◀ ▶, zkontroluj návrh (příspěvek × koeficient; jen skupina Příspěvek, bez brankářek a ukončených; osvobozené jsou předem vynechané a klepnutím na – je pro měsíc zahrneš), případně hráčku vynech (–) nebo uprav částku a <b>📨 Vystavit příspěvky</b>. Už vystavené se nepřepisují, nezaplacený příspěvek jde smazat 🗑.</li>
<li><b>📅 Měsíce – platy:</b> návrh podle platu člena týmu (měsíčně, nebo za událost × počet událostí měsíce, na které byl přihlášen „Jdu“). <b>💸 Vyplatit</b> zapíše výdaj do pokladny (kategorie Platy trenérů), jeden plat za člena a měsíc. Oprava = storno v 🏦 Pokladna a nové vyplacení.</li>
<li><b>📅 Měsíce – hospodaření:</b> příjmy, výdaje, saldo a zůstatek po měsících vybraného roku; klepnutím na měsíc rozpad podle kategorií a předpisů se splatností v měsíci.</li>
<li><b>⬇️ CSV:</b> pohyby za rok nebo vše, předpisy a přehled po měsících (pro Excel, oddělovač středník).</li>
<li><b>⚙️ → Nastavení pokladny:</b> IBAN pro QR, výše příspěvku a den splatnosti, splatnost událostí, kategorie a šablony událostí.</li>
</ul>`},
  {t: "12. Záloha a nastavení účtu (⚙️)", h: `
<ul>
<li><b>Stáhnout zálohu (JSON):</b> záloha všech načtených dat (trenér a kustod). Dělej ji pravidelně.</li>
<li><b>Soupiska (CSV):</b> export pro Excel.</li>
<li><b>Obnovit ze zálohy</b> (jen trenér): <b>Sloučit s daty</b> přidá/přepíše položky, <b>Nahradit vším</b> nahradí obsah kolekcí ze zálohy (druhé klepnutí potvrdí). Vyžaduje internet.</li>
<li><b>Členové týmu</b> (trenér a pokladník): e-mail, role, propojení s hráčkou nebo členem realizačního týmu, příznak Pokladník. Vlastní účet nelze odebrat.</li>
<li><b>Načíst novou verzi:</b> smaže uloženou kopii aplikace, data zůstanou. Číslo verze je vedle názvu nahoře.</li>
</ul>`},
  {t: "13. Rychlá reference", h: `
<table style="width:100%;border-collapse:collapse">
<tr><th style="text-align:left">Úkol</th><th style="text-align:left">Kde</th></tr>
<tr><td>Přihlásit se na trénink</td><td>Události → ✅ Jdu</td></tr>
<tr><td>Založit trénink / zápas</td><td>Události → + Trénink / + Zápas</td></tr>
<tr><td>Přidat hráčku</td><td>Team → Soupiska (trenér)</td></tr>
<tr><td>Nastavit pětky</td><td>Team → Základní formace</td></tr>
<tr><td>Vybrat nominaci</td><td>Zápas → krok 2 → A Nominace</td></tr>
<tr><td>Spustit živý zápis</td><td>Zahájit zápas (krok 1 nebo 3)</td></tr>
<tr><td>Střídání / střela</td><td>Klepnout na hráčku ve frontě / na ledě</td></tr>
<tr><td>Gól / trest</td><td>Přerušit hru → ⚽ / 🚫</td></tr>
<tr><td>Opravit událost / střídání</td><td>Krok 3 → ✏️ Opravit zápis</td></tr>
<tr><td>Statistiky sezóny</td><td>Statistiky</td></tr>
<tr><td>Zaplatit dluh</td><td>Moje platby → 📱 Zaplatit (QR)</td></tr>
<tr><td>Zapsat úhradu</td><td>Události → 💰 Platby → 💳</td></tr>
<tr><td>Vystavit příspěvky / platy</td><td>Události → 📅 Měsíce</td></tr>
<tr><td>Vklad / výdaj</td><td>Události → 🏦 Pokladna</td></tr>
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
<input id="hlq" placeholder="Hledat v nápovědě (např. trest, příspěvek, rotace)">
${SECTIONS.map(s => `<details><summary>${s.t}</summary>${s.h}</details>`).join("")}
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