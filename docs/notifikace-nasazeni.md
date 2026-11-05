# 🔔 Notifikace – nasazení a vypnutí (v22.51)

Stav: kód je v betě (commit „v22.51“). **Nic neběží, dokud neuděláš kroky 1–6.** Bez kroku 1 (pravidla) aplikace zařízení nezapíše, bez kroku 4 (funkce) nic neodejde, a bez kroku 6 je celý systém VYPNUTÝ (chybějící `settings/notif` = vypnuto).

## Co se posílá (a nic jiného)
1. **❌🕒 Zrušení / změna času** (zrušení, obnovení, změna data, začátku, konce tréninku nebo srazu) – jen členům, kteří jsou na události ✅ Jdu nebo ❓ Nejsem jistý, jen pro události do 30 dní.
2. **⏳ Hodinu před uzávěrkou přihlašování** – jen členům, kteří na událost ještě neodpověděli (hráčka, nebo člen realizačního týmu; čistý manager bez hráčky a člena týmu nic nedostane).

## Pojistky proti nákladům a chybám
- Hlavní vypínač `settings/notif.on` – výchozí stav VYPNUTO; funkce při vypnutí nic nečtou ani neposílají (jediné čtení je vypínač).
- Živý zápis zápasu funkci nespouští do práce: změna, která se netýká data / času / srazu, skončí na prvním řádku bez čtení databáze.
- Jedna instance funkcí (`maxInstances: 1`), 256 MiB, limit 120 s, žádné opakování po chybě.
- Denní strop 200 oznámení na tým, nejvýš 3 oznámení o změně za hodinu na zařízení (4. je souhrn, další se zahodí) – hromadná úprava série tréninků tým nezahltí.
- Stejná změna ani stejná uzávěrka se nepošle dvakrát (záznamy `pushLog`, nočně se mažou po 45 dnech).
- Zařízení se zrušeným tokenem se samo smaže. Odhlášení v aplikaci smaže zařízení účtu (sdílený telefon).
- Plánovač běží každých 15 minut a čte jen události s uzávěrkou v nejbližší hodině.

## Kroky (děláš ty)

### 1. Zkontroluj oblast databáze (30 s)
Firebase konzole → Firestore Database → záložka Data → „Location“. Soubor `functions/config.js` má `REGION = "europe-west1"`. Pokud je databáze jinde (např. `eur3`, `europe-west3`), a nasazení v kroku 4 napíše, že se oblast neshoduje, změň `REGION` na oblast, kterou hláška uvede (nebo napiš mně).

### 2. Pravidla Firestore – ke schválení a publikaci (ty)
Změna `firestore.rules` (větev `beta`) přidává:
- `settings/notif` – zapisuje jen manager nebo vývojář, nejde smazat, pevná pole `on, vapid, by, at`;
- kolekci **`devices`** – člen týmu si zapíše jen své zařízení (e-mail, `pid`, `tid` musí sedět s jeho členstvím; čas z serveru), čte vlastník a manager;
- kolekce `pushLog` pravidlo **nemá** (klient ji nevidí ani nezapíše; používají ji jen funkce přes Admin SDK).
Přečti si změnu v PR / commitu a publikuj ručně: Firebase konzole → Firestore → Rules → vložit obsah `firestore.rules` → Publish. Změny pravidel nejdou vrátit přes Git (starou verzi pravidel najdeš v konzoli v historii). Stabilní verze nové pravidlo snese (jen přidává).

### 3. Klíč VAPID (2 min)
Firebase konzole → ⚙️ Project settings → Cloud Messaging → Web configuration → **Web Push certificates → Generate key pair**. Zkopíruj veřejný klíč (začíná „B…“, cca 87 znaků). Vložíš ho v kroku 6.

### 4. Nasazení funkcí (ty ručně, v počítači)
Předpoklad: projekt je na plánu **Blaze** (schváleno). Potřebuješ Node 22.
```
npm install -g firebase-tools
firebase login
cd functions
npm install
cd ..
firebase deploy --only functions --project hockeycoach-bb2f3
```
Při prvním nasazení se zeptá na zapnutí API (Cloud Build, Artifact Registry, Eventarc, Cloud Scheduler…) – potvrď. Na dotaz o „cleanup policy“ obrazů odpověz např. 1 den (ať se neplatí za staré obrazy). Vzniknou tři funkce: `notifyEventChange`, `notifyMatchChange`, `notifyDeadlines`.

### 5. Rozpočtové upozornění (2 min, důležité)
Plán Blaze **nemá tvrdý strop** nákladů. Google Cloud Console → Billing → Budgets & alerts → Create budget → např. 1 € / měsíc, upozornění na 50 %, 90 % a 100 % e-mailem. Očekávané náklady jsou při běžném provozu nulové (bezplatné limity), ale upozornění tě ochrání před chybou.

### 6. Zapnutí v aplikaci
1. ⚙️ → **🔔 Notifikace** → vložit klíč VAPID → Uložit klíč.
2. **▶️ Zapnout notifikace týmu** (potvrdit druhým klepnutím).
3. Každý člen: ⚙️ → 🔔 → zaškrtnout, co chce → **🔔 Zapnout na tomto zařízení** → povolit oznámení. iPhone / iPad: aplikace musí být přidaná na plochu (Sdílet → Přidat na plochu).

## Jak to hned vypnout (od nejrychlejšího)
1. **⛔ STOP** v aplikaci: ⚙️ → 🔔 Notifikace → červené tlačítko (jedno klepnutí, manager nebo vývojář). Okamžitě zastaví veškeré posílání.
2. Firebase konzole → Firestore → `settings` → `notif` → pole `on` = `false` (stejný účinek, když není po ruce aplikace).
3. Smazání funkcí: `firebase functions:delete notifyEventChange notifyMatchChange notifyDeadlines --region europe-west1 --project hockeycoach-bb2f3`.
4. Krajní řešení: v Google Cloud Billing odpojit fakturační účet (funkce přestanou běžet).
Jednotlivec si notifikace vypne sám: ⚙️ → 🔔 → Vypnout na tomto zařízení (nebo v nastavení prohlížeče).

## Odhad nákladů (ověřit v konzoli – limity se mohou měnit)
- Cloud Functions: 2 mil. volání měsíčně zdarma; plánovač 2 880 volání měsíčně; zápis do `matches` při živém zápisu = jedno volání, které skončí hned.
- Cloud Scheduler: 3 úlohy na fakturační účet zdarma (tady 1).
- FCM (push): zdarma.
- Firestore: čtení při vypnutém systému ≈ 1 na běh plánovače (≈ 2 900 měsíčně z 50 000 denně zdarma).
- Možná halíře: úložiště obrazů funkcí (Artifact Registry) nad 0,5 GB zdarma – řeší cleanup policy z kroku 4.

## Řešení potíží
- Zařízení po zapnutí nic nedostává: je tým zapnutý (🟢)? Je klíč VAPID uložený? Zkontroluj Firebase konzole → Functions → Logs (hledej „změna události“ / „uzávěrky“). Nízká priorita baterie na Androidu může zprávu zdržet.
- „Missing or insufficient permissions“ při zapnutí zařízení: nejsou publikovaná pravidla (krok 2).
- Nasazení hlásí chybu oblasti: viz krok 1.
