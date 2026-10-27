# HockeyCoach

**Aktuální verze: v22.16 (27. 10. 2026, 🧪 beta)** – ✅ dresy vidí hráčky až po potvrzení trenérem, ⏳ výchozí termín přihlášení v ⚙️, ⏰ pozdní odpovědi v 📊 Docházce, ⌛ bez odpovědi = nejde. Předtím v22.15: dresy místo pětek, kratší detail, sbalené bloky plánu. Historie v [CHANGELOG.md](CHANGELOG.md).

Aplikace pro managery, trenéry, asistenty a hráčky jednoho týmu: soupiska, formace, události a docházka, trénink (banka cvičení, plán, živý trénink, měření, hodnocení), pokladna a rozpočet, zápasy s živým zápisem, soupeři, statistiky.
Běží v prohlížeči jako PWA (instalace na plochu, offline), bez vlastního serveru. Data ve Firebase (Firestore, bezplatný tarif Spark), přihlášení účtem Google. Uživatelský návod = nápověda ❓ v aplikaci.

| Dokument | Obsah |
|---|---|
| [docs/STAV.md](docs/STAV.md) | kde projekt stojí – **vstup pro vývoj** |
| [docs/KONVENCE.md](docs/KONVENCE.md) | programovací řád, mapa souborů, testy, vydání verze |
| [docs/plan.md](docs/plan.md) | nehotové fáze |
| [docs/testy-rucni.md](docs/testy-rucni.md) | ruční test na telefonu |
| [docs/prompt-dalsi-vlakno.md](docs/prompt-dalsi-vlakno.md) | šablona zadání pro nové vlákno s Claude |
| `docs/archiv/` | hotové plány, starší CHANGELOG a testy |

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
Web staví GitHub Actions (`.github/workflows/pages.yml`) z obou větví: **`main` = stabilní** verze pro všechny (kořen webu), **`beta` = 🧪 beta** pro testery (složka `beta/`, např. `https://tomaskrejh.github.io/HockeyCoach/beta/`). Databáze je jedna, kód stejný – kanál se pozná podle adresy.

**Jednorázové nastavení repozitáře (po nahrání v22.11 do `main`):**
1. *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
2. Na hlavní stránce repozitáře rozbalit větev `main` → napsat `beta` → **Create branch: beta from main**.
3. *Settings → Environments → github-pages → Deployment branches and tags* → **Add deployment branch or tag rule** → `beta` (jinak se beta nenasadí).
4. *Actions* → Nasazení (stabilní + beta) → **Run workflow** (nebo počkat na další nahrání). Za 1–2 min běží obě adresy.
5. Manager v aplikaci: ⚙️ → **🧪 Beta testování** → zaškrtnout testery (vývojář je tester vždy).

**Běžný postup (malé a střední verze bez zásahu do dat):**
1. ZIP verze nahrát do větve **`beta`** (v GitHubu přepnout větev na `beta` → Add file → Upload files).
2. Testeři dostanou ve stabilní verzi pruh **🧪 Nová beta v… k vyzkoušení** (nebo ⚙️ → 👤 Účet → 🧪 Otevřít betu); v betě je nahoře fialový pruh **🧪 Beta v…**. Beta jde přidat na plochu jako druhá ikona „HockeyCoach β“.
3. Takto lze nasadit a testovat více verzí za sebou.
4. **Vydání do stabilní:** *Pull requests → New → base: `main` ← compare: `beta`* → Create → **Merge**. Pak v aplikaci (stabilní) Načíst novou verzi a případně 🔒 Vyžadovat verzi.

**Přímo do `main` (i do `beta`) jdou:** změny dat nebo pravidel, které nesnesou souběh starší stabilní verze, a naléhavé opravy. CHANGELOG u každé verze uvádí kanál. Po nahrání do `main` stejný ZIP nahrát i do `beta` (nebo PR `main → beta`), aby beta nebyla pozadu.

**V betě platí:** 🔒 Vyžadovat verzi se nenastavuje (vyšší číslo bety by zablokovalo stabilní verzi) – až ve stabilní po vydání. Pravidla databáze musí fungovat pro stabilní i betu (data jen přidávat).

## Nasazení nové verze
1. Záloha: ⚙️ → 💾 Data → Stáhnout zálohu + zip současného repozitáře.
2. Podle CHANGELOG **publikovat firestore.rules** (před, nebo po nahrání kódu).
3. Nahrát soubory do větve podle CHANGELOG (**beta**, nebo **main**); soubory, které CHANGELOG uvádí jako odstraněné, smazat i ve větvi.
4. Na zařízeních ⚙️ → **Načíst novou verzi** (maže jen kopii svého kanálu).
5. Když to CHANGELOG uvádí: manager ve **stabilní** verzi ⚙️ → **🔒 Vyžadovat verzi** (starší zařízení pak nic nezapisují).
6. Návrat: předchozí zip, pravidla z historie v konzoli Firebase, `settings/app.minVer` snížit ručně. Beta: nahrát do `beta` obsah `main` (PR `main → beta`).

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
