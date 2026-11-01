# HockeyCoach

**Aktuální verze: v22.34 (1. 11. 2026, 🧪 beta)** – 🚫⭐ přepínač „Nehodnotit“ u bloku plánu (místo celé části rozcvička) a ⚠️ plat za událost jen bez 🚫 nedorazil(a). v22.33 – ⏱ variabilní trénink: 📋 Co následuje s hodinami začátků pro celý realizační tým, ⚠ upozornění na zdržení (2 / 5 / 10 min), nepovinné ⭐ hodnocení (🙂 Ostatním, ⏰ Později, 🔕 Dnes nehodnotit), 📝 cvičení jen do plánu (bez banky) a ⚡ hledání podle části tréninku. v22.32.1 – oprava kouřového testu (nasazení v22.32 neproběhlo). v22.32 – 🧹 úklid: 🚫 nedorazil(a) i u realizačního týmu, nový člen týmu rovnou s e-mailem a rolí (manager), 📊 pokrytí dovedností bez hostujících hráček. v22.31 – 💸 ➖ výdaj v 🏦 Pokladně předvyplní kategorii, příjemce a účet posledního výdaje (stačí doplnit částku). v22.30 – 💬 jednotné hlášky (✅ uloženo, ⚠️ nepovedlo se s důvodem, 📶 bez připojení – odešle se po připojení; vše 3,5 s) a potvrzení druhým klepnutím všude stejně (i odebrání přístupu a zamítnutí návrhu účtu). v22.29 – 🏒 zápas: ⧉ sestava „Jako minule“ (poslední sestava proti komukoli, jen nominované hráčky) a po uzavření rovnou 📤 souhrn zápasu ke sdílení. v22.28 – ⏱ přehlednější živý trénink: ▶ Teď (moje linka) hned pod odpočtem, ostatní linky jedním řádkem „kdo kde“, ⏭ Potom, méně časté ovládání sbalené pod 🎛, krátká ⌚ oznámení pro hodinky. v22.27 – 📋 plán tréninku pohodlněji: 🎓 trenéři linky jedním klepnutím přímo u linky, ➕ nové cvičení přímo z výběru cvičení (uloží se do 📚 banky a vloží do plánu), nový blok rovnou otevře výběr cvičení, ⭐ Výkonnost bez skoku obrazovky. v22.26 – 🎨 podbarvený nadpis karty události a čitelný počet v tlačítkách ✅ ❌ ❓. v22.25 – 🟢 kdo je online a poslední aktivita členů s verzí aplikace (jen manager, ⚙️ → 👥 Členové týmu; `firestore.rules` – publikovat ručně). v22.24 – 📉 pokladna na vyžádání: manager-trenér načítá předpisy a pohyby pokladny až při otevření pokladny (⚙️ → 💾 Data, přehled dlužníků a žádostí v Domů zůstává). v22.23 – útokový test QR platby (`tests/qr-attack.test.js`: hráčka ani hráčka-pokladník účet, částku ani VS v QR nepodvrhne). v22.22 – pravidla databáze: změna účtu pokladny jen s kódem návrhu (ibanCode, `firestore.rules` – publikovat ručně); v22.21 – kontrolní kód účtu u QR platby (porovnání s nastavením pokladny; druhý správce přepisuje kód při potvrzení změny účtu). v22.20 – hráčky vidí v plánu tréninku u cvičení popis, pomůcky, video a PDF (příprava na trénink). v22.19.1 – oprava: ⏹ Konec tréninku jde i po doběhnutí času plánu. v22.19: 🏃 oprava pořadí uložené štafety i zpětně po tréninku (✏️ Opravit pořadí: jména se prohodí, časy úseků zůstanou na místě a přesunou se k hráčkám). v22.18.2 – opravy z kontroly kódu: úhrada předpisu se nezapíše dvakrát ze dvou zařízení (transakce, jen online), zápas nejde uzavřít s běžícími hodinami, testy před nasazením na GitHub Pages. v22.18.1 – oprava: 💾 Uložit plán tréninku, 📑 šablona a ⭐ Výkonnost se znovu ukládají. v22.18: ⚡ improvizace na ledě: ➕ cvičení nebo ☕ pauza do plánu během tréninku (z banky i nové názvem, ▶ Hned / po bloku / na konec), trénink bez připraveného plánu, 👥 kdo je na ledě a 🚫 chybějící hráčky. Předtím v22.17: živý trénink na ledě (lišta řídícího, 🔒, ☀). Historie v [CHANGELOG.md](CHANGELOG.md).

Aplikace pro managery, trenéry, asistenty a hráčky jednoho týmu: soupiska, formace, události a docházka, trénink (banka cvičení, plán, živý trénink, měření, hodnocení), pokladna a rozpočet, zápasy s živým zápisem, soupeři, statistiky.
Běží v prohlížeči jako PWA (instalace na plochu, offline), bez vlastního serveru. Data ve Firebase (Firestore, bezplatný tarif Spark), přihlášení účtem Google. Uživatelský návod = nápověda ❓ v aplikaci.

| Dokument | Obsah |
|---|---|
| [docs/STAV.md](docs/STAV.md) | kde projekt stojí – **vstup pro vývoj** |
| [docs/KONVENCE.md](docs/KONVENCE.md) | práce s Claude (kap. 0), programovací řád, mapa souborů, testy, vydání verze |
| [docs/plan.md](docs/plan.md) | nehotové fáze |
| [docs/testy-rucni.md](docs/testy-rucni.md) | ruční test na telefonu |
| `docs/archiv/` | starší CHANGELOG (do v20) |

## Spuštění a testy
- Lokálně: `npm start` a otevřít `http://localhost:3000` (z `file://` se moduly nenačtou).
- `npm test` – Node 22+, nic se neinstaluje. `npm run smoke` – kouřový test všech rolí (jednou `npm install`).

## Nastavení Firebase (jednorázově)
1. Projekt v console.firebase.google.com, *Firestore Database* v EU.
2. *Firestore → Rules*: vložit `firestore.rules` → **Publish**.
3. *Authentication → Google → Enable*; v *Authorized domains* doména hostingu.
4. *Project settings → Your apps → Web app* → hodnoty do `src/data/firebase-config.js` (klíč není tajný, chrání pravidla).
5. První manager ručně: kolekce `members`, ID dokumentu = e-mail malými písmeny, `role` = `manager`, `rv` = `2` (číslo). Další členy přidává manager v ⚙️ → 👥 Tým a členové.

Hosting kdekoli přes HTTPS (Firebase Hosting, Netlify, GitHub Pages) – nahrát celou složku kromě `node_modules/`.

## Kanály: stabilní a 🧪 beta (od v22.11)
Web staví GitHub Actions (`.github/workflows/pages.yml`) z obou větví: **`main` = stabilní** verze pro všechny (kořen webu), **`beta` = 🧪 beta** pro testery (složka `beta/`, např. `https://tomaskrejh.github.io/HockeyCoach/beta/`). Databáze je jedna, kód stejný – kanál se pozná podle adresy. Před nasazením běží testy nahrané větve (`npm test` + kouřový test); červený test = nic se nenasadí (Actions → detail běhu ukáže chybu).

**Jednorázové nastavení repozitáře (po nahrání v22.11 do `main`):**
1. *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
2. Na hlavní stránce repozitáře rozbalit větev `main` → napsat `beta` → **Create branch: beta from main**.
3. *Settings → Environments → github-pages → Deployment branches and tags* → **Add deployment branch or tag rule** → `beta` (jinak se beta nenasadí).
4. *Actions* → Nasazení (stabilní + beta) → **Run workflow** (nebo počkat na další nahrání). Za 1–2 min běží obě adresy.
5. Manager v aplikaci: ⚙️ → **🧪 Beta testování** → zaškrtnout testery (vývojář je tester vždy).

**Běžný postup (malé a střední verze bez zásahu do dat):**
1. Claude zapíše verzi do větve **`beta`** jako jeden commit `vX.Y – název` (do `main` nikdy; návrat = revert commitu).
2. Testeři dostanou ve stabilní verzi pruh **🧪 Nová beta v… k vyzkoušení** (nebo ⚙️ → 👤 Účet → 🧪 Otevřít betu); v betě je nahoře fialový pruh **🧪 Beta v…**. Beta jde přidat na plochu jako druhá ikona „HockeyCoach β“.
3. Takto lze nasadit a testovat více verzí za sebou.
4. **Vydání do stabilní:** *Pull requests → New → base: `main` ← compare: `beta`* → Create → **Merge**. Pak v aplikaci (stabilní) Načíst novou verzi a případně 🔒 Vyžadovat verzi.

**Mimo betu:** změny dat nebo pravidel, které nesnesou souběh starší stabilní verze, a naléhavé opravy připraví Claude také jako commit v `beta`; do `main` je dostane uživatel PR `beta → main` (případně hned po commitu). CHANGELOG u každé verze uvádí, zda je potřeba vydat hned. Pravidla `firestore.rules` publikuje uživatel ručně v konzoli Firebase – Claude se před jejich změnou vždy zeptá.

**V betě platí:** 🔒 Vyžadovat verzi se nenastavuje (vyšší číslo bety by zablokovalo stabilní verzi) – až ve stabilní po vydání. Pravidla databáze musí fungovat pro stabilní i betu (data jen přidávat).

## Nasazení nové verze
1. Záloha dat: ⚙️ → 💾 Data → Stáhnout zálohu (kód má historii v Gitu).
2. Podle CHANGELOG **publikovat firestore.rules** (před, nebo po commitu).
3. Commit verze je v `beta` (zapisuje Claude, včetně smazaných souborů); vydání pro všechny PR `beta → main`.
4. Na zařízeních ⚙️ → **Načíst novou verzi** (maže jen kopii svého kanálu).
5. Když to CHANGELOG uvádí: manager ve **stabilní** verzi ⚙️ → **🔒 Vyžadovat verzi** (starší zařízení pak nic nezapisují).
6. Návrat: revert commitu verze (beta), ve stabilní revert merge PR; pravidla z historie v konzoli Firebase, `settings/app.minVer` snížit ručně.

**Starou verzi po nahrání** vyřeší ⚙️ → Načíst novou verzi (data zůstanou v databázi). Na webu musí být všechny soubory včetně `sw.js` a celé složky `src/`.

## Role
| Role | Smí |
|---|---|
| Manager | vše; managerů víc, aspoň jeden zůstává; pokladna vždy |
| Trenér | sport (zápasy a živý zápis, události, docházka, soupeři, formace), soupiska a realizační tým, celý Trénink; pokladna jen s 💰 |
| Asistent | sport jako trenér bez soupisky; Trénink podle matice práv |
| Hráčka | čte týmová data, zapisuje vlastní docházku; plán tréninku a výsledky měření vidí, hodnocení trenérů ne; Moje platby jen své |
| Hostující 🎟 | vidí jen sebe a události, na které jde |
| 💰 Pokladník (příznak) | pokladna, předpisy, platby; členy jen s rolí Hráčka, nikdy vlastní účet |

Manager / trenér / asistent může mít propojenou hráčku – na události se pak hlásí jako hráčka. Práva Trenér / Asistent / Hráčka po modulech mění manager v ⚙️ → 🔐 Práva rolí. Účet bez členství smí jen poslat ✋ žádost o přijetí. Skutečná ochrana = `firestore.rules`.

## Provoz a správa (připravit před předáním aplikace)
- **Teď** vše spravuje vývojář. Po uvolnění k distribuci převezme provoz **manager – vedoucí týmu**.
- **Týmový Google účet** (spravuje manager): složka „Cvičení“ s videi (.mp4 / .webm) a PDF, sdílení „Kdokoli s odkazem“, odkaz se vloží do cvičení. Soubory nepatří jednomu trenérovi.
- Doporučení: týmový účet je vlastníkem projektu Firebase a managerem v ⚙️, vývojář má jen přístup vývojáře (`DEV_EMAILS`); záloha (⚙️ → 💾 Data) pravidelně na týmový Disk.
