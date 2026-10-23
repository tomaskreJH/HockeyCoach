// Nápověda v aplikaci: tlačítko ❓ v záhlaví otevře celoobrazovkový přehled ovládání.
// Struktura: Obsah nápovědy -> Pomocné funkce -> Vykreslení -> Eventy (hledání, zavření) -> Export.
// Nápověda je čistě informační (nesahá do dat ani do stavu aplikace) a funguje i offline. Je jediným návodem k aplikaci;
// při změně ovládání se upravuje jen pole SECTIONS. Texty popisují současný stav bez čísel verzí (historie je v CHANGELOG.md).

// ===== Obsah nápovědy =====
// Každá sekce: t = nadpis, h = HTML obsah (zobrazí se po rozbalení)
const SECTIONS = [
  {t: "1. Začátek, přihlášení a role", h: `
<ul>
<li><b>Přihlášení:</b> účtem Google, který má trenér zapsaný mezi členy týmu (⚙️ → Členové týmu).</li>
<li><b>✋ Žádost o přijetí do týmu:</b> účet, který ještě není členem, po přihlášení vyplní přezdívku, číslo dresu (nepovinné), zda je hráčka, nebo člen realizačního týmu, a poznámku – e-mail se převezme z přihlášeného účtu a nejde změnit. Pak vidí ⏳ Čeká na schválení (žádost jde zrušit); po schválení se aplikace sama načte. Zamítnutá žádost ukáže důvod, novou lze poslat nejdřív za 24 h.</li>
<li><b>Trenér</b> smí vše. <b>Kustod</b> vede zápasy (nominace, sestava, živý zápis, opravy), soupeře, základní formaci, události a docházku; u hráčky mění jen stav. <b>Hráčka</b> vidí 🏠 Domů, Události, Statistiky a Moje platby a zapisuje docházku jen za sebe. <b>Pokladník</b> je příznak navíc k roli: spravuje pokladnu, skupiny plateb a platy.</li>
<li><b>Telefon:</b> v Chrome otevři adresu aplikace → menu ⋮ → Přidat na plochu / Instalovat aplikaci. Přihlášení zůstává uložené.</li>
<li><b>Bez signálu (hala):</b> aplikace funguje dál, změny se odešlou po připojení. Živý zápis zápasu veď jen z jednoho telefonu (při souběhu vyhrává poslední zápis).</li>
<li><b>Tlačítko Zpět na telefonu</b> funguje uvnitř aplikace: zavře otevřené okno nebo panel, z detailu se vrátí na seznam, z karty zápasu o krok zpět, z Minulých / Kalendáře / Docházky na Nadcházející, z jiné záložky do 🏠 Domů. V Domů se zeptá „Ukončit aplikaci?“. V živém zápisu nejdřív zavře rychlý zápis nebo menu, jinak se zeptá „Odejít ze živého zápisu?“ – odchod <b>zastaví čas</b>. Zpět hned po spuštění aplikace (před prvním klepnutím) ji může zavřít bez dotazu – tak to vyžaduje prohlížeč. Každé klepnutí do aplikace přidá jeden krok zpět (nejvýš 5); když se při mačkání Zpět po sobě kroky vyčerpají, aplikace se zeptá „Ukončit aplikaci?“ – klepni na <b>Ne</b> a můžeš pokračovat.</li>
<li><b>Stará verze po aktualizaci:</b> ⚙️ → Načíst novou verzi (nebo tlačítko v červeném pruhu ⚠️ Starší verze aplikace – v něm se nic neuloží, dokud verzi nenačteš). Data zůstanou v databázi.</li>
</ul>`},
  {t: "2. 🏠 Domů – úvodní přehled", h: `
<ul>
<li><b>🏠 Domů</b> je první záložka (ikona domečku vlevo v liště) a otevře se po spuštění aplikace. Vidí ji každý člen; nic se v ní nezapisuje – klepnutím se dostaneš tam, kde se věc vyřizuje.</li>
<li><b>🔴 Zápas právě běží:</b> skóre a třetina běžícího zápasu. Trenér a kustod jdou tlačítkem <b>▶ Do živého zápisu</b> rovnou do zápisu; ostatní vidí jen skóre (průběh je v detailu po uzavření zápasu).</li>
<li><b>🆚 Příští zápas:</b> soupeř, datum a čas, místo, doma / venku, uzávěrka přihlašování, počet ✅ a tvoje odpověď. Klepnutím otevřeš detail zápasu a odpovíš tam (tlačítko ← Domů tě vrátí zpět).</li>
<li><b>📅 Tento týden</b> (pondělí – neděle): tréninky a zápasy s tvojí odpovědí; <b>❔ Odpověz</b> = odpověď ještě chybí a přihlašování je otevřené. Trenér / kustod bez propojení s realizačním týmem vidí počet přihlášených ✅.</li>
<li><b>💳 Moje platby:</b> ✅ vše zaplaceno, 💳 k úhradě (s nejbližší splatností), ⛔ po splatnosti (přihlášení „Jdu“ je zablokované, pokud nemáš výjimku). Klepnutím otevřeš Moje platby.</li>
<li><b>💰 Pokladna týmu</b> (jen trenér a pokladník): nezaplaceno celkem, po splatnosti s počtem dlužníků, otevřené žádosti ✋ (klepnutím Team → 💰 Platby) a varování cashflow z rozpočtu sezóny (klepnutím Team → 📊 Rozpočet).</li>
<li><b>Zpět</b> z kterékoli jiné záložky vede do 🏠 Domů; v Domů se aplikace zeptá „Ukončit aplikaci?“.</li>
</ul>`},
  {t: "3. Události a docházka", h: `
<ul>
<li><b>Záložka Události</b> obsahuje tréninky i zápasy: Nadcházející (nejbližší nahoře), Minulé a Kalendář (nejnovější nahoře; klepnutím na den se seznam zúží) a 📊 Docházka.</li>
<li><b>📊 Docházka</b> (vidí všichni, jen ke čtení): účast hráček a realizačního týmu na <b>uplynulých</b> událostech v období <b>Od – Do</b> (výchozí zimní sezóna 1. 8. – 1. 7.; „Tato sezóna“ ji vrátí). Typ: Vše / 🏒 Tréninky / 🏠 Domácí zápasy / 🚌 Venkovní zápasy (v závorce počet událostí). Sloupce: ✅ účast (Jdu) z počtu událostí, %, ❌ nejdu, ❓ nejistá, bez odpovědi – ❓ a bez odpovědi se do účasti nepočítají. Řazení klepnutím na hlavičku. Ukončené hráčky ⛔ jsou vidět jen s odpovědí v období. Důvody omluv se tu nezobrazují.</li>
<li><b>⛓ Dlužnice</b>: u jména v Docházce a v detailu události značka ⛓ (mříže) a počet dní po splatnosti nejstaršího nezaplaceného předpisu – přihlášení „Jdu“ je zablokováno; 🔓 = po splatnosti, ale s výjimkou od pokladníka. Částky vidí jen dlužnice sama a správci pokladny. Realizační tým značku nemá.</li>
<li><b>✅ Jdu / ❌ Nejdu / ❓ Nejsem jistý:</b> Jdu se zapíše hned (opakované klepnutí ho zruší), Nejdu vyžaduje důvod, u Nejsem jistý je nepovinný. Důvod vidí jen ten, kdo omluvu podal, a trenér a kustod (ostatním ho nepustí ani databáze).</li>
<li><b>Termín přihlašování:</b> po termínu (a po dni události) se tlačítka zamknou 🔒. Trenér a kustod mohou odpovědi měnit i potom.</li>
<li><b>Trenér a kustod</b> odklikávají docházku hráček i realizačního týmu v detailu události (klepni na událost). Trenér / kustod propojený s realizačním týmem má na kartě události rychlá tlačítka za sebe.</li>
<li><b>Detail události:</b> nahoře docházka, výsledek zápasu a rozdělení do pětek; pokladna (vyúčtování) je až na konci stránky.</li>
<li><b>+ Trénink / + Zápas:</b> založení události. U zápasu se zadává i čas začátku, místo a konečný termín přihlašování (výchozí den předem v 18:00); po vytvoření se otevře detail události a hráčky se mohou přihlašovat. Zápas se otevře klepnutím na něj → 🏒 Otevřít zápas.</li>
<li><b>🔁 Opakovat (série tréninků, trenér a kustod):</b> v novém tréninku klepni na 🔁 Opakovat a vyber dny v týdnu, každý / každý 2. týden a datum „do“ (nejdéle konec sezóny 30. 6.; datum tréninku je první den série). Termín přihlašování se zadá relativně (např. 1 den předem v 18:00), trenér a pokladník volí i šablonu pokladny. V náhledu klepnutím vynecháš termíny (prázdniny, svátky) a tlačítkem <b>Vytvořit N tréninků</b> se založí všechny najednou.<br>Detail tréninku ze série ukazuje „🔁 Série: 3. z 30“. <b>✏️ Upravit</b> nabídne <b>Jen tato</b> (trénink se pak bere jako ručně upravený) nebo <b>Tato a další</b> (čas, místo a termín přihlašování – stejně dní předem – u této a dalších; ručně upravené vynechá a ukáže). <b>🗑 Jen tato</b> smaže jeden trénink, <b>🗑 Tato a další</b> smaže budoucí tréninky série bez odpovědí v docházce a bez vyúčtování (ostatní ponechá a vypíše).</li>
<li><b>Rozdělení do pětek</b> (detail tréninku): 1.–4. pětka nebo „–“ u přihlášených hráček i u přihlášeného <b>realizačního týmu</b> 🎓 (kdo vede stanoviště nebo jde s pětkou; v souhrnu „+ 🎓1“). ↻ Podle základní formace rozdělí jen hráčky, přiřazení trenérů zůstane. Hráčka vidí rozdělení jen ke čtení.</li>
<li><b>Uzavřený zápas:</b> v detailu události je výsledek, tlačítko <b>📋 Zápis utkání</b> (celý zápis jako v záložce Soupeři – vývoj zápasu, střely, střídání, čas na ledě, tisk a export) a statistiky zápasu pro všechny členy týmu.</li>
<li><b>Dluh po splatnosti</b> blokuje vlastní přihlášení „Jdu“, dokud ho nezaplatíš (nebo pokladník neudělí výjimku). Červený banner vede do Moje platby.</li>
</ul>`},
  {t: "4. Záložka Team – příprava týmu", h: `
<ul>
<li><b>Základní formace:</b> klepnutím vybereš hráčku na místo, podržením a přetažením ji přesuneš (obsazené místo se prohodí). Formace se kopíruje do každého nového zápasu a slouží k rozdělení do pětek na tréninku.</li>
<li><b>Náhradnice:</b> všechny nezařazené aktivní hráčky. Přetažením je dáš do sestavy, prohodíš mezi sebou nebo vrátíš mezi náhradnice. Pořadí se pamatuje.</li>
<li><b>Soupiska:</b> přidání a smazání hráčky jen trenér; úprava stavu (aktivní / zraněná / ukončila) i kustod; skupina plateb (Příspěvek / Za událost), osvobozená (zvýhodněná), koeficient v procentech (0–100 % z ceny) a poznámka trenér a pokladník (i hráčka s příznakem pokladník: Upravit → okno <b>Platby</b>; jméno, pozici, stav ani sestavu nemění).</li>
<li><b>Realizační tým:</b> členy přidává a maže trenér, plat (měsíčně / za událost) nastavuje trenér nebo pokladník (Upravit → Plat). Plat vidí jen trenér, pokladník a člen sám.</li>
<li><b>Soukromí plateb:</b> skupinu plateb, osvobození, koeficient a poznámku k platbám vidí jen trenér a pokladník (a hráčka svoje) – ostatním se štítek plateb u hráčky nezobrazuje.</li>
<li><b>Správa pokladny:</b> trenér a pokladník mají nahoře v Teamu přepínač <b>Team | 💰 Platby | 🏦 Pokladna | 📅 Měsíce | 📊 Rozpočet</b>. Hráčka-pokladník vidí formaci jen ke čtení; u hráček a realizačního týmu mění jen platby (skupina, osvobozená, koeficient, poznámka, plat).</li>
<li><b>Rotace dvou hráček na jednom místě:</b> pod každou pětkou je řádek <b>⇄ rotace</b>. Hlavní hráčka nastupuje první, pořadí změníš přetažením. V živém zápisu je partnerka malé tlačítko <b>⇄ číslo jméno</b> pod hráčkou ve frontě – viz kapitola 5.</li>
</ul>`},
  {t: "5. Nový zápas (3 kroky)", h: `
<p><b>Zápas → Sestava → Zápas živě.</b> Nahoře je vždy přehled: soupeř, datum, doma/venku, délka třetiny a stav ✅/⛔ Nominace a Sestava.</p>
<ul>
<li><b>Postup:</b> 1) vytvořit zápas (= zveřejněná událost), 2) hráčky se přihlásí (✅ Jdu), 3) nominace z přihlášených, 4) sestava, 5) ✔ Uzavřít sestavu, 6) Zahájit zápas. Dokud přihlášky nestačí na nominaci (1 brankářka + 5 bruslařek), karta zápasu ukazuje ⏳ Přihlášky, uzávěrku a tlačítko 📅 Přihlášky – detail události.</li>
<li><b>Krok 1 – Zápas:</b> soupeř, datum, čas a místo (mění se v Událostech → ✏️ Upravit), doma/venku, délka třetiny (standardně 20 min), prodloužení Ano (5 min) / Ne, vzájemné uzavřené zápasy se soupeřem.</li>
<li><b>Krok 2A – Nominace:</b> nominovat jde jen hráčky přihlášené na událost (✅ Jdu). Minimum 1 brankářka a 5 bruslařek. Tlačítka Všechny přihlášené / Zrušit vše.</li>
<li><b>Krok 2B – Sestava:</b> naplní se podle základní formace (jen z nominovaných). Uprav řady, náhradnice a jednotky přesilovek a oslabení (<b>Zkopírovat z posledního zápasu</b>). <b>✔ Uzavřít sestavu</b> umožní spustit živý zápis. Jakákoli změna sestavy uzavření zruší.</li>
<li><b>Pravidlo jednotek:</b> hráčka smí být jen v jedné přesilovce (PP1/PP2) a jen v jednom oslabení téhož druhu (4 hráčky: SH1/SH2, 3 hráčky: SH3/SH4); v běžné řadě být může.</li>
<li><b>Krok 3 – Zápas živě:</b> průběh, jmenné statistiky, zápis utkání, opravy a uzavření zápasu (u trenéra a pokladníka vznikne vyúčtování plateb).</li>
<li>Živý zápis jde spustit až po uzavření sestavy a splnění nominace. Po zahájení je zamčená nominace, soupeř, datum a doma/venku.</li>
</ul>`},
  {t: "6. Živý zápis", h: `
<ul>
<li><b>Horní lišta:</b> v řádku třetiny aktuální situace (5 na 5, přesilovka, oslabení) a malé štítky trestů, pod ním čas s posunem ◀ ▶ o 5 s, vpravo skóre se střelami.</li>
<li><b>Rozložení</b> shora dolů: horní lišta → <b>hřiště</b> (světlý obdélník jako led: nahoře <b>STŘELA NA NAŠI BRÁNU</b>, uprostřed tlustá červená středová čára, pod ní <b>hráčky na ledě</b>) → <b>mantinel</b> (bílo-modrý pruh) → tlačítka pětek → pod každým místem sloupec čekajících (nahoře ta <b>na řadě</b> – větší, zeleně orámovaná, pod ní rotující partnerka, dole partnerky hráček na ledě). Dole průběh.</li>
<li><b>Štítky v řádku třetiny</b>: každý trest jako malý štítek <b>🚫 #číslo odpočet ✕</b> (soupeř „Soup.“; ✕ trest zruší), při přesilovce nebo oslabení štítek <b>⚡ PP / 🛡 OS</b> (otevře nabídku jednotky), po skončení nerovnosti <b>↩ Řady</b>. Když se štítky nevejdou, posuneš řádek prstem do strany – výška lišty se nemění, tlačítka pod ní se nepohnou.</li>
<li><b>Rotace</b>: každá dlaždice má jen jednu akci – poslat hráčku na led. Rotující partnerka je malé čárkované tlačítko <b>⇄ číslo jméno</b> přímo pod hráčkou, se kterou rotuje: <b>klepnutí</b> ji pošle rovnou na led, <b>podržení</b> (asi půl sekundy) změní pořadí rotace – partnerka se postaví do fronty místo hráčky. Tečkované tlačítko úplně dole ve sloupci je partnerka hráčky, která je právě na ledě (klepnutím ji vystřídá). Při aktivní přesilovce nebo oslabení se rotace nezobrazuje.</li>
<li><b>Odezva</b>: po střídání, střele, gólu, trestu, nasazení pětky nebo jednotky a ↩ Zpět telefon krátce zavibruje a tlačítko zabliká. Vibraci vypneš v ⋯ → ⚙️ Nastavení; zablikání zůstává (iPhone vibrace nepodporuje).</li>
<li><b>Celá pětka na led:</b> tlačítka 1.–4. pětka nasadí celou pětku najednou. Barvy: 1. modrá, 2. žlutá, 3. zelená, 4. růžová, mimo pětky šedá.</li>
<li><b>Střídání:</b> klepnutí na hráčku ve frontě ji pošle na led místo hráčky nad ní. Podržením a přetažením ji pošleš na jinou pozici. Nejbližší hráčka ve frontě je zvýrazněná.</li>
<li><b>Střela:</b> klepnutí na hráčku na ledě zapíše její střelu, <b>STŘELA NA NAŠI BRÁNU</b> střelu soupeře. Při přerušené hře se střely zapsat nedají.</li>
<li><b>Spodní lišta:</b> za běhu jen ↩ Zpět a Start/Přerušit. Po přerušení přibude 🥅 Gól naši, 🥅 Gól soupeř, 🚫 Trest a ⋯ Další volby.</li>
<li><b>Gól naši:</b> střelkyně → 1. asistence → 2. asistence (nebo „Bez asistence“). Situaci nastaví aplikace sama. <b>Gól soupeře:</b> jedno klepnutí.</li>
<li><b>Průběh</b> (dole): všechny kroky zápasu včetně střídání – góly, střely, tresty, návraty z trestu, pětky a jednotky, zranění, brankářka, konce třetin. Nejnovější nahoře, seznam se posouvá prstem. Góly jsou podsvícené: náš gól zeleně, gól soupeře červeně. V horním řádku průběhu jsou <b>upozornění</b> – jen když nějaké je: chybějící nebo přebývající hráčka na ledě, dlouhé střídání, jednotka PP/OS po skončení nerovnosti, nevybraná brankářka, kdo sedí na trestu a kdo je v ošetřování. Průběh je dole, takže tlačítka neposkakují.</li>
<li><b>Dlouhé střídání:</b> po překročení limitu (výchozí 2:00, ⋯ → Nastavení) se dlaždice hráčky zbarví, telefon zavibruje a upozornění se objeví v horním řádku průběhu; v průběhu je takové střídání zvýrazněné.</li>
<li><b>Odchod ze živého zápisu</b> (⋯ → ✕ Zavřít živý zápis nebo Zpět na telefonu) zastaví čas zápasu. Pokračuješ z karty zápasu a tlačítkem ▶ Start.</li>
<li><b>↩ Zpět</b> vrací poslední akci (střídání, střelu, gól, trest, jednotku…).</li>
<li>Za živého zápisu živá obrazovka překrývá záhlaví s ❓ – nápovědu otevři před zápasem nebo po ✕ Zavřít živý zápis (čas se zastaví).</li>
</ul>`},
  {t: "7. Tresty, přesilovky a oslabení", h: `
<ul>
<li><b>🚫 Trest</b> (po přerušení): hráčka nebo soupeř → délka (2 min, 2+2, 5 min, 10 osobní, do konce) → důvod. Hráčka sejde z ledu a nahoře běží odpočet. <b>Zrušit</b> u trestu opraví omyl.</li>
<li><b>Návrat:</b> po vypršení se hráčka vrátí na svou pozici, na jiné volné místo, nebo do fronty. Po osobním trestu jde do fronty, po „do konce“ se nevrací.</li>
<li><b>Gól ukončí</b> nejstarší dvouminutový trest oslabeného týmu, pokud gól dal tým s větším počtem hráčů na ledě. Pětiminutový trest gólem nekončí. U 2+2 gól ukončí jen první dvě minuty.</li>
<li><b>IIHF pravidla:</b> na ledě min. 3 bruslaři, nejvýše 2 současně odpykávané tresty na tým. Aplikace nepovolí doplnit víc hráček, než dovolují tresty.</li>
<li><b>Nabídka jednotky</b>: po zapsání trestu, který vytvoří přesilovku nebo oslabení, se hned otevře navržená jednotka (ta s nejvíce dostupnými hráčkami; druhou vybereš nahoře). Vyloučená hráčka je červeně a nahradí ji hráčka z fronty, nesestavená jednotka se doplní z front. <b>✓ Potvrdit a nasadit</b> přepne obrazovku do režimu PP/OS, <b>Ponechat pětky</b> nabídku zavře (otevřeš ji znovu štítkem ⚡ PP / 🛡 OS v řádku třetiny).</li>
<li><b>Více trestů</b>: formace se řídí počtem našich hráček na ledě – 5 = pětky (při přesilovce PP 1 / PP 2), 4 = OS 1 / OS 2, 3 = OS 3 / OS 4. Když se počet změní a hra je dál nevyrovnaná (skončí jeden ze dvou trestů, gól ukončí trest, ✕ trest zruší – např. 3 na 5 → 4 na 5), hned se nabídne jednotka nové skupiny. Režim PP/OS zůstává (tlačítka a fronty nové skupiny), k pětkám se obrazovka vrátí až při vyrovnané hře.</li>
<li><b>Režim PP/OS:</b> pod bílo-modrým mantinelem jsou místo pětek tlačítka <b>⚡ PP 1 / PP 2</b> nebo <b>🛡 OS 1 / OS 2</b> (při 3 hráčkách <b>🛡 OS 1 / OS 2</b> pro OS3 / OS4) a <b>↩ Řady</b>; fronty ukazují jen hráčky jednotek, bez rotace. Když nerovnost skončí, obrazovka se sama vrátí k pětkám a upozornění připomene poslat pětku nebo ↩ Řady. Při oslabení se zobrazí jen 4 resp. 3 pozice.</li>
<li><b>Úprava jednotek za zápasu:</b> ⋯ → Jednotky PP/OS.</li>
<li>Nemodelováno: odložený trest, trestné střílení a zvláštní pravidla pro tresty brankářky.</li>
</ul>`},
  {t: "8. Menu ⋯ a zranění", h: `
<ul>
<li><b>👥 Sestava:</b> změna sestavy za zápasu klepnutím nebo přetažením, promítne se do front.</li>
<li><b>Po zranění</b> se hned otevře <b>Sestava</b> s červeně vyznačeným místem zraněné hráčky (u trvalého zranění prázdné místo) – doplníš ho klepnutím nebo přetažením náhradnice.</li>
<li><b>🤕 Zranění → 🩹 Dočasně:</b> hráčka je mimo led a fronty, zůstává v nominaci. Vrátíš ji tlačítkem <b>↩ Vrátit</b> (zařadí se na konec fronty své pozice) nebo ji převedeš na <b>Trvalé</b>.</li>
<li><b>🤕 Trvale:</b> hráčka je odebrána z nominace i sestavy a v soupisce označena jako zraněná. Smí i kustod.</li>
<li><b>🧤 Brankářka:</b> výměna brankářky v bráně.</li>
<li><b>⬇️ Sundat z ledu:</b> ruční odstranění hráčky z ledu. <b>🔄 Sestava znovu:</b> znovu načte řady ze sestavy.</li>
<li><b>📊 Čas na ledě:</b> přehled časů a střídání, tabulku lze řadit klepnutím na hlavičku. <b>Počet střídání</b> se všude (statistiky zápasu, rozbor, celkové statistiky) počítá stejně: nulové záznamy se vynechají a když hráčka plynule pokračuje (návrat do řad po přesilovce, Sestava znovu, změna jednotky), je to jedno střídání.</li>
<li><b>⚙️ Nastavení:</b> limit dlouhého střídání a vibrace při zápisu (odezva). Obojí se pamatuje v každém zařízení zvlášť.</li>
<li><b>Konec třetiny / Konec zápasu:</b> po 3. třetině se prodlužuje jen při nerozhodném stavu a povoleném prodloužení, jinak tlačítko znamená Konec zápasu. Konec jde vrátit (↩ Zpět nebo „Zrušit konec zápasu“).</li>
</ul>`},
  {t: "9. Zápis utkání a opravy", h: `
<ul>
<li><b>Zápis utkání</b> (krok 3; uzavřený zápas i z Událostí → detail zápasu → 📋 Zápis utkání a ze Soupeřů): výsledek po třetinách, góly a asistence, sestava, průběh, statistiky a <b>Podrobný rozbor</b> (kompletní vývoj zápasu, střídání hráček s průměrem a nejdelším střídáním, dlouhá střídání označena ⚠️).</li>
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
  {t: "10. Statistiky, soupeři a řazení tabulek", h: `
<ul>
<li><b>Záložka Statistiky</b> je přístupná všem členům týmu, včetně hráček (jen ke čtení).</li>
<li><b>Statistiky hráčů</b> (jen uzavřené zápasy): Z, <b>Ø stř.</b> (průměrná délka střídání), střely, góly, %, asistence, body, +/-, TM, góly v PP, body doma a venku. +/- se nepočítá u gólů v přesilovce.</li>
<li><b>Ø stř.</b> = celkový čas na ledě děleno počtem střídání hráčky (jen zápasy se živým zápisem, bez střídání „–“).</li>
<li><b>Tým</b> a <b>Brankáři</b> (střely, góly, zákroky, úspěšnost). <b>Soupeři</b> (všichni členové týmu; přidat, přejmenovat a smazat jen trenér a kustod): u každého soupeře rovnou bilance V–R–P a skóre, po rozkliknutí jednotlivé zápasy – klepnutím na zápas se otevře zápis utkání s kompletním vývojem zápasu.</li>
<li><b>Řazení:</b> klepnutím na hlavičku sloupce. První klepnutí řadí čísla a časy sestupně, text vzestupně, další přepíná ▲/▼. Prázdné hodnoty jsou vždy na konci.</li>
</ul>`},
  {t: "11. Moje platby", h: `
<ul>
<li><b>Moje platby</b> vidí každý, kdo má účet propojený s hráčkou nebo členem týmu: dluh, částka po splatnosti a seznam předpisů (události i měsíční příspěvky).</li>
<li><b>📱 Zaplatit (QR):</b> QR platba pro bankovní aplikaci (účet, částka, variabilní symbol a zpráva pro příjemce bez diakritiky velkými písmeny, např. „ZAPAS 10.10. SOKOL - JANA“ nebo „TRENINK 14.10. - JANA“; i požadavek na okamžitou platbu, pokud ho tým zapnul a banka podporuje). Při ruční platbě opiš účet, VS a zprávu z okna platby. Zaplacení se v aplikaci objeví, až ho pokladník zapíše.</li>
<li><b>Bezpečnost platby</b>: účet je v okně platby v českém tvaru (např. 19-2000145399/0800) i jako IBAN. <b>Před odesláním vždy zkontroluj v bance číslo účtu příjemce.</b> Pokud se účet týmu změnil od tvé minulé platby (nebo v posledních 14 dnech), aplikace nejdřív ukáže varování s datem změny a kdo ji navrhl a potvrdil – QR uvidíš až po klepnutí „Ověřila jsem účet“; ověř si ho přímo u trenéra. Účet, který neprojde kontrolou čísla, QR nevytvoří – neplať a ozvi se. Aplikace ani správci týmu neodpovídají za platbu odeslanou na jiný účet.</li>
<li><b>⬇️ Uložit QR</b>: platíš z téhož telefonu? Pod QR klepni na <b>⬇️ Uložit QR</b>. Na Androidu (i iPhonu) se otevře <b>Sdílet</b> – zvol <b>Uložit do Galerie</b> (Fotky) nebo rovnou svou bankovní aplikaci; na počítači se obrázek stáhne jako soubor <b>QR-platba-RRRR-MM-DD-VS.png</b>. V bankovní aplikaci pak zvol načtení QR <b>z obrázku / z galerie</b>. Obrázek má pod kódem popisek (účet, IBAN, částka, VS, zpráva, datum vytvoření) a obsahuje přesně stejný QR jako okno platby. Tlačítko je jen u zobrazeného QR – tedy až po kontrole účtu a případném „Ověřila jsem účet“. <b>I u uloženého obrázku zkontroluj v bance číslo účtu příjemce</b>; starý obrázek po změně účtu nebo částky už nepoužívej.</li>
<li><b>Dva účty:</b> tým může mít hlavní účet (např. příspěvky) a provozní účet (např. platby za události). U každého předpisu je vidět, na který účet patří, a QR vede právě tam.</li>
<li><b>📱 Zaplatit vše (souhrnná platba):</b> víc předpisů na <b>stejný účet</b> zaplatíš jedním QR s osobním VS a zprávou „Souhrn: …“. Platby na různé účty sloučit nejde – každý účet se platí zvlášť.</li>
<li><b>Blokace:</b> neuhrazený předpis po splatnosti zablokuje vlastní přihlášení „Jdu“. Odhlásit se a „Nejdu“ jde vždy.</li>
<li><b>📅 Po měsících:</b> přepínač nahoře (📄 Předpisy / 📅 Po měsících). Za každý měsíc sezóny (1. 8. – 30. 6., šipkami ◀ ▶ předchozí a další sezóna) vidíš, kolik je předepsáno (zvlášť příspěvek a události), kolik je zaplaceno a kolik zbývá; klepnutím na měsíc se rozbalí jeho předpisy (i s tlačítkem QR). Měsíc se řídí datem události a měsícem příspěvku, ne splatností.</li>
<li><b>⚖️ Kdybych platila jinak</b> (hráčka): porovnání se druhým způsobem placení po měsících a za sezónu. S příspěvkem uvidíš, kolik bys zaplatila za uzavřené události, na kterých jsi byla přihlášená (cena na hlavu × tvůj koeficient); při placení za události, kolik by stál příspěvek (dnešní výše × koeficient). Neuzavřené události se nepočítají. Je to jen informace. V sezóně se změnou se každý měsíc porovnává s druhým způsobem toho měsíce.</li>
<li><b>✋ Požádat o změnu placení</b> (hráčka, v pohledu 📅 Po měsících): vyber měsíc, od kterého chceš platit druhým způsobem (Příspěvek ↔ Za událost; nejdřív od příštího měsíce, nejvýše 6 měsíců dopředu), a případně poznámku. Najednou můžeš mít jen jednu otevřenou žádost; dokud není vyřízená, můžeš ji zrušit. Stav (čeká / ✅ schváleno / ❌ zamítnuto, s odpovědí pokladníka) vidíš nahoře v Moje platby. O osvobození nebo jiný koeficient se žádá osobně.</li>
</ul>`},
  {t: "12. Pokladna (trenér a pokladník)", h: `
<ul>
<li><b>Kdo platí:</b> každá skupina (s příspěvkem, za událost, osvobozené) má vlastní volbu Platí ANO / NE a Výpočet / Pevná částka – v šablonách i u každé události. Cena se dělí všemi přihlášenými hráčkami (každá jako jeden celý kus) a násobí koeficientem hráčky v %.</li>
<li><b>Vyúčtování události</b> (detail události → 💰 Pokladna na konci stránky): šablona, náklady, kdo platí (výpočet / pevná částka), náhled „vybereme X z Y“ a <b>Uzavřít vyúčtování</b> → vzniknou předpisy. Po uzavření se nic samo nepřepočítává; úprava jen přes ↩ Znovu otevřít.</li>
<li><b>Událost krytá příspěvkem</b> (skupina Příspěvek neplatí a událost má náklady – pravidelný trénink, domácí zápas): pod náhledem řádek <b>náklady · vybereme · podíl příspěvků · výsledek</b>. Příspěvky měsíce (předepsané i zaplacené; dokud nejsou vystavené, odhad ze soupisky) se dělí mezi kryté události měsíce podle nákladů – příspěvek hráčky, která nepřišla, propadá ve prospěch události. ✅ kryto / přebytek, ⚠️ schodek jen když ztrátu nekryje ani podíl příspěvků. Při uzavření se podíl uloží a už se nemění.</li>
<li><b>💡 Navrhnout poplatek</b> (u vyúčtování, když platí skupina Za událost nebo Osvobozené): a) výpočet – náklady ÷ hráčky v poli, b) paušál – pevná částka na hráčku, aby výsledek vyšel na nulu. <b>Použít</b> jen předvyplní hodnoty u této události; ulož je tlačítkem Uložit nastavení nebo Uzavřít vyúčtování. Šablony a nastavení pokladny se nemění.</li>
<li><b>Team → 💰 Platby:</b> dluhy podle hráček a podle událostí a příspěvků; u předpisu VS, účet a zpráva pro příjemce (stejné jako v QR – pro párování s výpisem), osobní VS hráčky pro souhrnnou platbu, 💳 úhrada (i částečná), ✅ Zaplatila vše (zvlášť za každý účet), 🔒 výjimka z blokace u předpisu po splatnosti, neuzavřená vyúčtování.</li>
<li><b>Team → 🏦 Pokladna:</b> zůstatek, při dvou účtech zůstatek každého účtu, ➕ vklad / příjem, ➖ výdaj (s volbou účtu), součty podle kategorií, seznam pohybů s filtry (účet, typ, kategorie) – u úhrady je VS a zpráva „za co“, 🗑 storno (u úhrady vrátí částku na předpis).</li>
<li><b>Team → 📅 Měsíce – příspěvky:</b> vyber měsíc ◀ ▶, zkontroluj návrh (příspěvek × koeficient; jen skupina Příspěvek, bez brankářek a ukončených; osvobozené jsou předem vynechané a klepnutím na – je pro měsíc zahrneš), případně hráčku vynech (–) nebo uprav částku a <b>📨 Vystavit příspěvky</b>. Už vystavené se nepřepisují, nezaplacený příspěvek jde smazat 🗑.</li>
<li><b>📅 Měsíce – platy:</b> návrh podle platu člena týmu (měsíčně, nebo za událost × počet událostí měsíce, na které byl přihlášen „Jdu“). <b>💸 Vyplatit</b> zapíše výdaj do pokladny (kategorie Platy trenérů), jeden plat za člena a měsíc. Oprava = storno v 🏦 Pokladna a nové vyplacení.</li>
<li><b>📅 Měsíce – ⚖️ hospodaření měsíce:</b> příspěvky (předepsáno / zaplaceno), platby za události (uzavřené + odhad neuzavřených), náklady událostí (vyúčtované + plánované ze šablon), vyplacené platy a <b>výsledek měsíce</b>; řádek <b>Led</b> ukáže, zda se kryté události vyplatily, nebo jsou ve ztrátě. Měsíc podle data události a měsíce příspěvku. Pod tím seznam událostí měsíce s výsledkem každé.</li>
<li><b>📅 Měsíce – hospodaření:</b> příjmy, výdaje, saldo a zůstatek po měsících vybraného roku; klepnutím na měsíc rozpad podle kategorií a předpisů se splatností v měsíci.</li>
<li><b>📊 Rozpočet sezóny</b> (jen trenér a pokladník; sezóna 1. 8. – 30. 6., ◀ ▶): <b>🆕 Založit ze soupisky a nastavení</b> (počty hráček podle skupiny plateb, výše příspěvku, platy týmu, účast z posledních tréninků), nebo <b>📋 Převzít</b> minulou sezónu. <b>Parametry:</b> hráčky s příspěvkem / za událost / osvobozené, předpokládaná účast na událost, příspěvek a jeho změna od měsíce, měsíce, kdy se vybírá, cílový přebytek. <b>Položky událostí</b> podle šablon pokladny: 🔁 opakování (dny v týdnu, každý / každý 2. týden, od–do, vynechané dny), # počet za sezónu nebo za měsíc, nebo 📎 převzatá série tréninků z kalendáře; náklady a příjem na jednu událost (bez ruční hodnoty odhad ze šablony – kdo platí). <b>Platy</b> (měsíčně / za událost) a <b>ostatní příjmy a výdaje</b> (měsíčně / jednorázově). Výsledek: <b>📅 plán po měsících</b> (události, náklady, příjmy, příspěvky, platy, saldo, kumulativně) a <b>💡 odhad příspěvku</b> – kolik musí hráčka s příspěvkem platit měsíčně, aby sezóna vyšla na nulu (nebo na cílový přebytek), i při změně počtu hráček. Změny se ukládají tlačítkem <b>💾 Uložit rozpočet</b> (↺ Zahodit změny vrátí uložený stav). Rozpočet jen plánuje – pokladnu, předpisy, šablony ani kalendář nemění.</li>
<li><b>✅ Schválení rozpočtu:</b> hotový a uložený rozpočet schválí trenér nebo pokladník tlačítkem <b>✅ Schválit rozpočet</b> (dvě klepnutí). Schválená verze je závazná – nejde přepsat ani smazat a její čísla jsou zmrazená. Každá další změna je <b>úprava</b>: před 💾 Uložit úpravu je povinný důvod (např. dražší led od ledna); v 📝 Plán je porovnání <b>schválený / aktuální</b> (události, příjmy, výdaje, saldo, měsíce se změnou salda) a seznam úprav (kdy, kdo, důvod). <b>🖨 Export pro valnou hromadu:</b> schválený rozpočet, aktuální plán, plnění, cashflow, úpravy a komentář – <b>🖨 Tisk / PDF</b> (v tisku zvol Uložit jako PDF) nebo <b>⬇️ CSV (Excel)</b>; export je z uloženého rozpočtu, komentář se neukládá.</li>
<li><b>📈 Plnění rozpočtu</b> (přepínač 📝 Plán / 📈 Plnění / 💧 Cashflow): po měsících plán a skutečnost – události (plán / proběhlo / v kalendáři), výdaje, příjmy (a kolik je zaplaceno), saldo, kumulativně a <b>odhad sezóny</b> (skutečnost uplynulých měsíců + plán zbytku). ⚠️ = uplynulý měsíc s výdaji o víc než 10 % nad plánem nebo příjmy o víc než 10 % pod plánem. <b>Položky:</b> plán sezóny, plán do dneška, proběhlo, v kalendáři a skutečné náklady na událost. Události se k položkám přiřazují podle šablony pokladny, u dvou položek se stejnou šablonou podle série a dne v týdnu; ostatní jsou „mimo rozpočet“.</li>
<li><b>💧 Cashflow:</b> zůstatek pokladny dnes (i po účtech) a odhad zůstatku na konci každého dalšího měsíce – očekávané příjmy (nevybraná část plánu a nezaplacené předpisy) a výdaje podle plánu. Pod <b>rezervou</b> (parametr v 📝 Plán, výchozí 0 Kč) nebo pod nulou se měsíc obarví a varování se ukáže nahoře v Rozpočtu. Staré dluhy se ukážou zvlášť a do odhadu se nepočítají. <b>💡 Návrh úpravy</b> (jen text, nic se nemění samo): o kolik zvýšit příspěvek od příštího měsíce, platbu za událost, nebo kolik událostí vynechat.</li>
<li><b>⬇️ CSV:</b> pohyby za rok nebo vše, předpisy a přehled po měsících (pro Excel, oddělovač středník).</li>
<li><b>🏦 Účty pro QR platby</b> (⚙️ → Nastavení pokladny): účet se zadává jako české číslo účtu (např. 19-2000145399/0800) nebo IBAN; aplikace hned při psaní ověří kontrolní součty a dopočítá IBAN. <b>Změnu navrhuje jen trenér</b> (📝 Navrhnout změnu účtů) a <b>platí až po potvrzení jiným trenérem nebo pokladníkem</b> (✓ Potvrdit / ✕ Zamítnout) – do té doby QR vede na dosavadní účet. Před potvrzením ověř číslo s navrhovatelem telefonem nebo osobně. Čekající návrh ukáže správcům pokladny upozornění v Událostech. Návrh, potvrzení, zamítnutí i zrušení se zapisují do auditu (Historie změn účtů) a pravidla databáze jiný postup nedovolí. Hráčkám se nový účet zobrazí s varováním.</li>
<li><b>⚙️ → Nastavení pokladny:</b> okamžitá platba v QR (ANO / NE), na který účet se platí příspěvky, u šablony účet pro platby za událost (u konkrétní události lze účet změnit), výše příspěvku a den splatnosti, splatnost událostí, kategorie a šablony událostí.</li>
</ul>`},
  {t: "13. Záloha a nastavení účtu (⚙️)", h: `
<ul>
<li><b>Stáhnout zálohu (JSON):</b> záloha všech načtených dat (trenér a kustod) včetně důvodů omluv, platů a plateb hráček, pokud je účet smí číst (trenér vše). Dělej ji pravidelně.</li>
<li><b>Soupiska (CSV):</b> export pro Excel.</li>
<li><b>Obnovit ze zálohy</b> (jen trenér): <b>Sloučit s daty</b> přidá/přepíše položky, <b>Nahradit vším</b> nahradí obsah kolekcí ze zálohy (potvrzení druhým klepnutím do 4 s, jinak se tlačítko vrátí). Vyžaduje internet.</li>
<li><b>✋ Žádosti o přijetí do týmu</b> (jen trenér): pruh v 🏠 Domů a tlačítko v ⚙️ → Členové týmu otevřou okno žádostí. <b>Přijmout</b> = vybrat roli (Hráčka / Kustod / Trenér) a založit novou hráčku (jméno = přezdívka, číslo dresu; pozici a platby doplň v Team) nebo přiřadit hráčku bez účtu (shoda čísla dresu se nabídne první, obsazené číslo jen upozorní); u trenéra / kustoda založit nebo přiřadit člena realizačního týmu, případně bez propojení. Vznikne účet v Členech týmu – vše jednou dávkou se záznamem v auditu (potvrzení druhým klepnutím). <b>Zamítnout</b> jen s důvodem, který uchazeč uvidí. Příznak Pokladník se nastaví v ⚙️ jako dřív.</li>
<li><b>Členové týmu</b> (trenér a pokladník): e-mail, role, propojení s hráčkou nebo členem realizačního týmu, příznak Pokladník. Vlastní účet nelze odebrat. <b>Pokladník</b> (bez role trenér) přidává, mění a odebírá jen členy s rolí Hráčka a nemůže měnit vlastní účet – ostatní role spravuje trenér (vynucují pravidla databáze).</li>
<li><b>⛓ Přepočítat dlužníky</b> (trenér a pokladník): naplní veřejný souhrn dlužníků (bez částek) ze všech předpisů. Spusť po ruční změně předpisů v databázi nebo když značky ⛓ nesedí; jinak se souhrn zapisuje sám s každou změnou předpisů. Vyžaduje publikovaná pravidla databáze.</li>
<li><b>✋ Žádosti o změnu placení</b> (trenér a pokladník): otevřené žádosti ukáže pruh v Team → 💰 Platby (a odkaz v Událostech). V okně žádosti je náhled dopadu – porovnání způsobu placení hráčky v sezóně, už vystavené příspěvky a uzavřená vyúčtování od měsíce změny. <b>✓ Schválit</b> (potvrzení druhým klepnutím) nastaví vše samo: hráčce se zapíše historie způsobu placení a příspěvky od zvoleného měsíce i vyúčtování událostí od toho měsíce se počítají podle nového způsobu. Už vystavené příspěvky a uzavřená vyúčtování se <b>nepřepočítají</b> – nezaplacený příspěvek lze smazat v 📅 Měsíce, vyúčtování ručně znovu otevřít. <b>✕ Zamítnout</b> s krátkou odpovědí. Vlastní žádost vyřizuje jiný správce pokladny. Ruční změna skupiny v Upravit → Platby u hráčky se změnou v historii platí od běžného měsíce.</li>
<li><b>💲 Doplnit ceny pro hráčky</b> (⚙️ → Pokladna, trenér a pokladník): hráčky v Moje platby porovnávají způsob placení podle <b>ceny události na hlavu</b> (bez celkových nákladů a dodavatelů). Cena se zapíše sama při uzavření vyúčtování a smaže při znovuotevření; pro dříve uzavřené události a po obnově zálohy ji doplň tímto tlačítkem (opakování nic nepokazí).</li>
<li><b>Kontrola dat</b> (jen trenér): ukáže hráčky bez pole osvobození (<b>ex</b>, starší data) a tlačítkem <b>Doplnit pole ex</b> ho doplní (potvrzení druhým klepnutím; před zápisem se stáhne záloha). Bez doplnění se hráčka se starými daty a koeficientem 0 % nepočítá jako osvobozená – doplnění jí vrátí osvobození a koeficient 100 %. Když je vše v pořádku, ukáže ✅.<br><b>🔒 Převést citlivá data</b>: zkopíruje důvody omluv, platy realizačního týmu a platební údaje hráček do samostatných částí databáze, které čte jen vlastník a správci (náhled „co se přesune“, potvrzení druhým klepnutím, před zápisem se stáhne záloha). Kopíruje jen chybějící hodnoty, lze spustit znovu; když je hotovo, ukáže ✅.<br><b>🧹 Smazat stará citlivá pole</b>: po převodu smaže kopie těchto údajů ze soupisky, realizačního týmu a docházky (tam je dosud čte každý člen). Nabídne se, až je nastavené <b>🔒 Vyžadovat verzi</b> (starší verze aplikace stará pole ještě používají); maže jen to, co už je v nové části databáze, nebo je prázdné; potvrzení druhým klepnutím, před smazáním se stáhne záloha. Potom je potřeba publikovat pravidla databáze. Obnova ze staré zálohy údaje rozdělí do nových částí sama.</li>
<li><b>Načíst novou verzi:</b> smaže uloženou kopii aplikace, data zůstanou. Číslo verze je vedle názvu nahoře.</li>
<li><b>🔒 Vyžadovat verzi</b> (jen trenér, potvrzení druhým klepnutím do 4 s): po nahrání nové verze nastaví minimální verzi aplikace. Zařízení se starší verzí pak nic nezapisuje (nesmaže tak nová data) a nahoře ukáže červený pruh <b>⚠️ Starší verze aplikace</b> s tlačítkem Načíst novou verzi. Minimum jde jen zvýšit a ze zálohy se neobnovuje.</li>
<li><b>👁 Náhled role</b> (jen účet vývojáře): ukáže aplikaci tak, jak ji vidí Hráčka (vybraná ze soupisky), Kustod, Pokladník nebo Trenér – volitelně s propojeným členem realizačního týmu. Platí jen v tomto zařízení (do zavření okna), v databázi se nic nemění. Nahoře je stálý pruh <b>Náhled: … · Ukončit náhled</b>. Načtou se jen data, která by role směla číst (cizí předpisy, vyúčtování a audit ne). Výchozí je jen ke čtení – každý zápis skončí hláškou „V náhledu se nezapisuje“; zaškrtnutím <b>Povolit zápis</b> se zapisuje pod tvým účtem za vybranou roli (např. docházka za hráčku). Odhlášení náhled ukončí.</li>
</ul>`},
  {t: "14. Rychlá reference", h: `
<table style="width:100%;border-collapse:collapse">
<tr><th style="text-align:left">Úkol</th><th style="text-align:left">Kde</th></tr>
<tr><td>Co mě čeká, příští zápas, stav plateb</td><td>🏠 Domů</td></tr>
<tr><td>Přihlásit se na trénink</td><td>Události → ✅ Jdu</td></tr>
<tr><td>Založit trénink / zápas</td><td>Události → + Trénink / + Zápas</td></tr>
<tr><td>Série tréninků</td><td>Události → + Trénink → 🔁 Opakovat</td></tr>
<tr><td>Přidat hráčku</td><td>Team → Soupiska (trenér)</td></tr>
<tr><td>Nastavit pětky</td><td>Team → Základní formace</td></tr>
<tr><td>Vybrat nominaci</td><td>Zápas → krok 2 → A Nominace</td></tr>
<tr><td>Spustit živý zápis</td><td>Zahájit zápas (krok 1 nebo 3)</td></tr>
<tr><td>Střídání / střela</td><td>Klepnout na hráčku ve frontě / na ledě</td></tr>
<tr><td>Gól / trest</td><td>Přerušit hru → 🥅 / 🚫</td></tr>
<tr><td>Opravit událost / střídání</td><td>Krok 3 → ✏️ Opravit zápis</td></tr>
<tr><td>Statistiky sezóny</td><td>Statistiky</td></tr>
<tr><td>Zaplatit dluh</td><td>Moje platby → 📱 Zaplatit (QR)</td></tr>
<tr><td>Zapsat úhradu</td><td>Team → 💰 Platby → 💳</td></tr>
<tr><td>Vystavit příspěvky / platy</td><td>Team → 📅 Měsíce</td></tr>
<tr><td>Rozpočet sezóny, odhad příspěvku</td><td>Team → 📊 Rozpočet</td></tr>
<tr><td>Plnění rozpočtu, cashflow a rezerva</td><td>Team → 📊 Rozpočet → 📈 Plnění / 💧 Cashflow</td></tr>
<tr><td>Schválení rozpočtu, úpravy, export pro valnou hromadu</td><td>Team → 📊 Rozpočet → ✅ Schválit / 🖨 Export</td></tr>
<tr><td>Vklad / výdaj</td><td>Team → 🏦 Pokladna</td></tr>
<tr><td>Odklikat docházku</td><td>Události → klepnout na událost</td></tr>
<tr><td>Vytvořit zálohu</td><td>⚙️ → Stáhnout zálohu (JSON)</td></tr>
<tr><td>Zavřít okno / vrátit se</td><td>Tlačítko Zpět na telefonu</td></tr>
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