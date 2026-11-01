# Návrhy čekající na souhlas (připraveno v noci 31. 10. → 1. 11. 2026)

Nic z tohoto souboru není v kódu ani v `firestore.rules`. Každý bod mění databázi nebo pravidla (nejde vrátit přes Git) – proto jen návrh. Po souhlasu = samostatná verze se zápisem do `main` až po testu v betě.

---

## A. ✏️ Úprava proběhlého tréninku (kolekce `tract`)

### Co uživatel získá
Po tréninku jedním místem opravit, **jak trénink skutečně proběhl**: časy bloků a cvičení (zkrácené, prodloužené, vypuštěné, vložené za běhu), kdo kde byl, pořadí štafety a výsledky měření – a statistiky (📈 Trénink, 📊 Pokrytí dovedností, minuty na kartě hráčky) počítají se skutečností, ne s plánem.

### Dnešní stav (proč nová kolekce)
- Statistiky počítají minuty z **plánu** `trplan/{eid}` (`domain/training-stats.js`, `skill-coverage.js` – `groupDrills`, `groupSkills`).
- Skutečný průběh je jen v hodinách `trlive/{eid}`: `adj` (změněné délky) a `skip` (vypuštěné bloky) – ty se do statistik nepropisují a po „↺ Spustit znovu“ se přepíšou.
- Měnit plán zpětně nechceme: plán = záměr (šablony, ⧉ Jako minule), skutečnost = jiný dokument.
- Štafeta (v22.19) a měření `trms` už opravit jdou – zůstanou, ✏️ úprava je jen otevře z jednoho místa.

### Datový model (návrh)
`tract/{eid}` – jeden dokument na trénink (id = id tréninku, jako `trplan`, `trlive`):
```
{
  v: 1,
  blocks: [                     // skutečné pořadí bloků (i vložené ⚡ za běhu, které už jsou v plánu)
    {id: "b…", dur: 12,         // skutečná délka bloku v minutách (1–90)
     skip: false,               // blok se nehrál
     lanes: {"l…": {grp: [1,2], co: ["t1"], seq: [{id: "s…", dur: 6}]}}  // jen změny proti plánu (skupiny, trenéři, délky cvičení řady)
    }
  ],
  src: "live" | "edit",         // vzniklo automaticky z ⏹ Konec, nebo ruční úpravou
  by, at                        // podpis (pravidla jako u ostatních kolekcí tréninku)
}
```
- **Vznik automaticky** při ⏹ Konec tréninku z `trlive` (adj, skip, skutečné přechody ▶ Teď / ⏭) – trenér nemusí nic dělat. Ruční ✏️ úprava v detailu tréninku pak jen opraví.
- Bez `tract` (starší tréninky) se počítá z plánu jako dnes.

### Pravidla (návrh – doplnit do `firestore.rules`)
```
// ===== ✏️ Skutečný průběh tréninku tract/{eid}: čte, kdo smí číst plán (hráčka kvůli „Můj trénink“), zapisuje, kdo smí plán upravovat =====
function tractOk(d) {
  return d.keys().hasOnly(['v', 'blocks', 'src', 'by', 'at']) && d.v == 1 && d.blocks is list && d.blocks.size() <= 30
    && d.src in ['live', 'edit'] && d.get('by', mail()) == mail();
}
match /tract/{id} {
  allow read: if can('trplan', 'r');
  allow create, update: if can('trplan', 'e') && tractOk(request.resource.data);
  allow delete: if can('trplan', 'e');
}
```

### Dopad na čtení (📉, tarif Spark)
- Statistiky už dnes čtou `trplan`, `trms`, `treval` po jednom dokumentu na trénink v období (cache `S.tst`). Přibude **+1 čtení na trénink v období** (60 dní ≈ 25 tréninků = +25 čtení na otevření 📈, jen realizační tým / hráčka u své karty).
- 📊 Pokrytí dovedností: +1 čtení na trénink v okně (14 / 30 / 60 dní).
- Žádný trvalý poslech, záloha JSON: přidat `tract` do `FETCH`.
- Zápisy: 1 při ⏹ Konec, další jen při ruční úpravě.

### Dopad na kód (odhad 1 verze + 1 oprava)
- `domain/training-actual.js` (nový): `actualPlan(plan, tract)` = plán s délkami / skupinami / vypuštěním ze skutečnosti; `tractFromLive(plan, live, endSec)`.
- `domain/training-stats.js`, `skill-coverage.js`: místo `plan` volat `actualPlan(plan, tract)` (výpočty se jinak nemění; testy `d1-baseline` zůstanou zelené pro tréninky bez `tract`).
- `views/trlive-view.js`: ⏹ Konec zapíše i `tract` (jedna dávka).
- `views/trplan-view.js`: v kartě proběhlého tréninku ✏️ Upravit průběh (stejný editor jako plán, jen délky / vypustit / skupiny / trenéři), odkaz na 🏃 štafetu a ⏲ výsledky.
- Testy: nový `tests/training-actual.test.js`, kouřový test kroku.

### Otázky k rozhodnutí
1. Má se `tract` zakládat automaticky při ⏹ Konec (doporučuji ano), nebo jen ručně?
2. Mají hráčky v „Můj trénink“ vidět skutečné minuty (doporučuji ano – stejný údaj jako trenér, bez hodnocení)?
3. Rušit `tract` při „↺ Spustit znovu od začátku“? (doporučuji ne – přepíše se až dalším ⏹ Konec)

---

## B. Otevřená pravidla z kontroly kódu v22.18.1

### B1. `settings/beta` číst jen manager / vývojář
- **Dnes:** čtou všichni členové týmu (`isTeam()`), protože aplikace z dokumentu zjišťuje, zda je přihlášený účet tester (`isTester` v `storage.js`). Zúžením pravidla by tester přestal poznat, že je tester.
- **Návrh (2 kroky – rozšířit → převést → zúžit):**
  1. verze A: příznak testera i v `members/{e-mail}.beta = true` (zapisuje manager / vývojář při úpravě testerů – `cfg-api.saveTesters` zapíše dávkou i do `members`); aplikace čte příznak z vlastního `members` dokumentu (už ho čte vždy). Pravidla `members`: dovolit pole `beta` jen manager / vývojář.
  2. verze B (po aktualizaci všech zařízení – 🔒 Vyžadovat verzi): `settings/beta` číst jen `isMgr() || isDevAcct()`:
  ```
  allow read: if (id == 'beta' ? (isMgr() || isDevAcct()) : (isTeam() || (isHost() && id in ['cash', 'events', 'app'])));
  ```
- **Riziko:** nízké (seznam testerů není citlivý údaj; jde o zásadu „vidí jen kdo potřebuje“). Lze i ponechat.

### B2. `budgetKeep` – starší revize rozpočtu neměnné
- **Dnes:** po schválení nejde změnit `approved`, revize `rev` se nesmí ubrat (jen počet) – starší revizi ale jde přepsat.
- **Návrh:** starší revize musí zůstat beze změny (prefix seznamu):
  ```
  function budgetKeep(o, d) { return (!('approved' in o) || (('approved' in d) && d.approved == o.approved))
    && (!('rev' in o) || (('rev' in d) && d.rev.size() >= o.rev.size() && d.rev[0:o.rev.size()] == o.rev)); }
  ```
- Aplikace revize jen přidává na konec (`budget-review.js`) – změna by ji neměla zasáhnout; ověřit testem `tests/budget-review.test.js` a ručně (📊 Rozpočet → úprava schváleného).

### B3. `treval` u hráček vynutit pravidly
- **Dnes:** čtení podle matice práv `can('treval', 'r')`. Výchozí matice hráčce čtení nedává, ale manager by ho v ⚙️ → 🔐 Práva rolí mohl omylem zapnout – a hráčky by viděly hodnocení trenérů (trvalé rozhodnutí: **nikdy**).
- **Návrh:**
  ```
  match /treval/{id} {
    allow read: if can('treval', 'r') && isStaff();
    allow create, update: if can('treval', 'e') && isStaff() && trevalOk(request.resource.data);
    allow delete: if can('treval', 'e') && isStaff();
  }
  ```
  a v `domain/permissions.js` buňky `hracka.treval` neupravitelné (`EDITABLE`) – aby matice nenabízela, co pravidla stejně zakážou.

### B4. Mimo kód
- Porovnat nasazená pravidla v konzoli s `firestore.rules` (zvlášť blok `seen` z v22.25 – publikace k ověření).
- Zvážit Firebase App Check (omezí přístup k databázi jen z aplikace).

---

## C. ~~Drobnost k rozhodnutí z v22.32~~ – hotovo v22.34 (plat jen bez 🚫, rozhodnutí 1. 11. 2026) – 🚫 u realizačního týmu a plat
Od v22.32 jde 🚫 označit i u člena realizačního týmu. **Plat za událost se dál počítá podle odpovědi „Jdu“** (`salaryRows` v `domain/cash.js` – výpočet pokladny se bez souhlasu nemění). Má se člen týmu s 🚫 do platu za událost nepočítat? (změna výpočtu pokladny – jedna podmínka `!isNos(a)` + test)
