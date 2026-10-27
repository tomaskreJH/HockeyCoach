# HockeyCoach

**Aktuální verze: v22.9 (27. 10. 2026)** – 📉 události a docházka se živě poslouchají jen za poslední týdny, starší data z paměti zařízení (výrazně méně čtení databáze, všechna data v aplikaci zůstávají). Předtím v22.8: 📉 odhad čtení v ⚙️. Historie v [CHANGELOG.md](CHANGELOG.md).

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

## Nasazení nové verze
1. Záloha: ⚙️ → 💾 Data → Stáhnout zálohu + zip současného repozitáře.
2. Podle CHANGELOG **publikovat firestore.rules** (před, nebo po nahrání kódu).
3. Nahrát soubory; soubory, které CHANGELOG uvádí jako odstraněné, smazat i na webu.
4. Na zařízeních ⚙️ → **Načíst novou verzi**.
5. Když to CHANGELOG uvádí: manager ⚙️ → **🔒 Vyžadovat verzi** (starší zařízení pak nic nezapisují).
6. Návrat: předchozí zip, pravidla z historie v konzoli Firebase, `settings/app.minVer` snížit ručně.

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
