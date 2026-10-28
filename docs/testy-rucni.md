# Ruční testy na Androidu

Kontrolní seznam po nasazení. `npm test` a `npm run smoke` ověří výpočty, zápisy a vykreslení, **ne** telefon, pravidla databáze, vibrace, oznámení ani hodinky.
Po každé verzi se přidá kapitola netestované verze; otestované kapitoly se smažou (historie v `CHANGELOG.md` a v Gitu). Výsledek zapiš do vlákna: číslo kroku + ✅ / ❌ + co se stalo.

**Příprava:** na všech telefonech ⚙️ → 👤 Účet → Načíst novou verzi (číslo v záhlaví). Druhý telefon nebo 👁 Náhled role (⚙️ → 🛠 Vývojář) pro ostatní role.

## 1. Rychlá kontrola, že se nic nerozbilo (po každé verzi, 5 minut)
- [ ] 🏠 Domů se načte bez chyby, nadcházející události a moje platby.
- [ ] Události: odpověď ✅ / ❌ / ❓ u tréninku a zápasu, počty v tlačítkách.
- [ ] Zápas: sestava a 🔴 živý zápis – gól, střela, trest, časomíra (start / stop).
- [ ] Statistiky a Soupeři se otevřou.
- [ ] Team → Pokladna / Platby (správce pokladny) se otevřou, Moje platby u hráčky.
- [ ] ⚙️ všechny sekce se otevřou, 🔐 Práva rolí – přehled.

## 2. v22.1 – úklid (dokumentace, texty pokladny)
- [ ] 2.1 V záhlaví je **v22.1**.
- [ ] 2.2 ❓ Nápověda → kapitola 12 Pokladna: místo „trenér a pokladník“ píše **„správce pokladny“**. Ostatní kapitoly beze změny.
- [ ] 2.3 Detail tréninku s plánem: 📋 plán, ⏱ živý trénink (start / pauza), ⏲ stopky a ⭐ hodnocení se otevřou jako dřív.
- [ ] 2.4 Rychlá kontrola z kap. 1.

## 3. v22.1.1 – úklid (rozdělení Událostí a datové vrstvy)
- [ ] 3.1 Události: seznam, kalendář, ✅ / ❌ (okno s důvodem) / ❓ na kartě i v detailu, 🚫 nedorazila u minulého tréninku.
- [ ] 3.2 + Trénink (i 🔁 Opakovat – jen náhled), ✏️ Upravit trénink, ❌ Zrušit / ↩ Obnovit, 🗑 Smazat prázdnou událost.
- [ ] 3.3 ⚙️ → 👥 Tým a členové: seznam členů, změna člena (stejné údaje → Přidat člena), 👁 Náhled role (vývojář) a návrat.
- [ ] 3.4 ⚙️ → 💾 Data: Stáhnout zálohu (soubor se stáhne), CSV soupisky. Obnovu jen na testovacích datech.
- [ ] 3.5 ⚙️ → 🔐 Práva rolí: přehled, u managera úprava buňky a ↩ Výchozí (neukládat, nebo vrátit).

## 4. v22.1.2 – úklid (plán a živý trénink)
- [ ] 4.1 Detail tréninku → 📋 ✏️ Upravit: + blok, ⏱ −/+, ☕ pauza, 🔁 řada cvičení, ⭐ Jen moje linky, 💾 Uložit plán, Zahodit změny.
- [ ] 4.2 ⏱ Živý trénink: ▶ start, ⏸ pauza, ⏭, 📋 Zbytek plánu; 🔔 zvuk a vibrace 60 s / 10 s před koncem kola; ⌚ zapnout oznámení – přijde oznámení (i na hodinky), akce ⏸ / ⏭.
- [ ] 4.3 Obrazovka během živého tréninku nezhasne.

## 5. v22.1.3 – ⚖️ Tarify a 📊 Moje docházka
- [ ] 5.1 V záhlaví je **v22.1.3**.
- [ ] 5.2 Hráčka (👁 Náhled role nebo druhý telefon): Moje platby → 📅 Po měsících – **není** karta ⚖️ Kdybych platila jinak; je karta **📊 Moje docházka** (účast z počtu, %, 🚫, řádky tréninky / domácí / venkovní) a u měsíce „účast X z N“. Tlačítko ✋ Požádat o změnu placení zůstává.
- [ ] 5.3 Pokladník: Team → 💰 Platby → čip **⚖️ Tarify** – hráčky s verdiktem (nevyužívá / 💡 příspěvek / stejně / využívá), docházka sezóny, sezóna skutečně → druhý způsob; dole osvobozené. Bez brankářek, ukončených a hostujících.
- [ ] 5.4 Pokladník: okno ✋ žádosti o změnu placení dál ukazuje dopad (porovnání sezóny).
- [ ] 5.5 Rychlá kontrola z kap. 1.

## 6. v22.2 – ▶ Teď v živém tréninku, ☑ hromadné úhrady, 🏦 výpis z banky
- [ ] 6.1 V záhlaví je **v22.2**.
- [ ] 6.2 ⏱ Živý trénink (plán aspoň se 4 bloky): ▶ spustit, rozbalit 📋 Zbytek plánu – přeskočit / zkrátit. U posledního bloku **▶ Teď** → „Klepni znovu“ → druhé klepnutí: hodiny skočí na začátek posledního bloku, bloky mezi zmizí ze zbytku plánu, druhý telefon ukazuje totéž. Uložený plán (✏️ Upravit) je beze změny.
- [ ] 6.3 ⏮ Zpět po skoku vrátí na začátek bloku; ▶ Teď na sousední blok = jako ⏭ (nic se nevypustí).
- [ ] 6.4 Pokladník: Team → 💰 Platby → **☑ Hromadně**: ruční výběr – zaškrtnout 2 předpisy (lišta dole ukáže počet a součet, obrazovka neposkočí), Vybrat vše u události, 🔍 hledání jména. ✅ Zapsat → „Klepni znovu“ → zapsáno; v Pokladně 2 příjmy, dluhy klesly.
- [ ] 6.5 🏦 Výpis: v bankovnictví týmu stáhnout pohyby jako CSV, 📥 Načíst výpis. Souhrn (spárováno / přesně / nespárováno / výdaje), přesné shody zaškrtnuté, platba se souhrnným osobním VS rozdělená do předpisů. Zapsat → v Pokladně datum platby z výpisu.
- [ ] 6.6 Stejný výpis načíst znovu – zapsané platby se nenabídnou („už zapsáno“).
- [ ] 6.7 Dva účty (pokud jsou nastavené): volba účtu výpisu – páruje se jen s předpisy na tento účet.
- [ ] 6.8 Hráčka: Moje platby beze změny, ☑ Hromadně nevidí.
- [ ] 6.9 Rychlá kontrola z kap. 1.

## 7. v22.3 – 🕘 zpětná změna placení, ⚙ sloupce výpisu
- [ ] 7.1 V záhlaví je **v22.3**.
- [ ] 7.2 Pokladník: hráčka s Příspěvkem → okno hráčky → **🕘 Historie placení** (okno hráčky se zavře). Dosud: „od začátku dosud – Příspěvek“.
- [ ] 7.3 Od = do = minulý měsíc, Za událost → text „…pak zpět Příspěvek“ → 💾 Uložit → Klepni znovu → ✅ Uloženo. Dole nezaplacený příspěvek toho měsíce → 🗑 Smazat → Smazat? → zmizí (v 📅 Měsíce také).
- [ ] 7.4 Uzavřené vyúčtování události, kde byla: ↩ otevřít → ⚠️ Pokladna → ↩ Znovu otevřít → uzavřít: hráčka má předpis za událost. Příspěvek od dalšího měsíce se vystaví jako dřív.
- [ ] 7.5 Totéž z Team → 💰 Platby → Podle hráček → rozbalit → 🕘. Hráčka v Moje platby vidí nový způsob za daný měsíc.
- [ ] 7.6 ☑ Hromadně → načíst CSV z banky týmu: pokud se sloupce poznají, ⚙ ukazuje „automaticky“. Zkusit ⚙ → změnit sloupec VS na jiný → páry se změní; ↺ Automaticky vrátí.
- [ ] 7.7 Soubor s jinými sloupci (např. upravené záhlaví v Excelu, uložit jako CSV): ⚙ se otevře sám, přiřadit částku a VS → páry; 💾 Uložit → načíst znovu → „sloupce: uložené pro účet“. 🗑 Zapomenout uložené.
- [ ] 7.8 Rychlá kontrola z kap. 1.

## 8. v22.4 – stav na kartě události, ⚖️ detail tarifu, 🔓 Výjimky
- [ ] 8.1 V záhlaví je **v22.4**.
- [ ] 8.2 Pokladník / manager: Události → Minulé – u události s uzavřeným vyúčtováním štítky **💰 vyúčtováno** a **✅ / 💳 zaplaceno X/Y · částka**, případně **⏰ N po splatnosti**; u uplynulé události s náklady bez uzavření **⚠️ vyúčtování neuzavřeno**. Po úhradě se štítek změní.
- [ ] 8.3 Trenér: u tréninků dnes a v minulosti **📋 plán / bez plánu**, **⏱ uzavřen / probíhá / nespuštěn**, **⭐ ohodnoceno N / bez hodnocení** (načte se chvíli po otevření seznamu; po novém hodnocení se obnoví nejpozději do 5 min nebo po znovuotevření aplikace).
- [ ] 8.4 Hráčka a hostující štítky nevidí; asistent bez práva pokladny nevidí 💰.
- [ ] 8.5 Team → 💰 Platby → ⚖️ Tarify → klepnout na hráčku: souhrn sezóny, hodnota ledu a využití %, **Kdyby neplatila** (pokladna −, zvýšení ostatním), 📅 Po měsících a událostech (předpisy + navštívené uzavřené události: led, platila / v příspěvku, druhý způsob). Hráčka s nízkým využitím a příspěvkem má 💡 tip na úlevu. 🕘 Historie placení se otevře z detailu. Osvobozené – klepnutí na jméno.
- [ ] 8.6 Team → 💰 Platby → **🔓 Výjimky**: ⛓ Blokované – zaškrtnout 2 hráčky (nebo Vybrat vše), důvod → 🔓 Udělit výjimku → Klepni znovu. Hráčky přejdou do 🔓 S výjimkou, v Docházce mají 🔓, přihlášení „Jdu“ funguje. Volba „i na předpisy před splatností“ zahrne i budoucí splatnosti.
- [ ] 8.7 🔓 S výjimkou → vybrat → ⛓ Zrušit výjimku → hráčka je znovu blokovaná. V detailu události (Záznamy) / auditu je „výjimka udělena hromadně“ s důvodem.
- [ ] 8.8 Rychlá kontrola z kap. 1.

## 9. v22.5 – 🔁 převod, datum platby, 🧾 Náklady, QR s číslem účtu
- [ ] 9.1 V záhlaví je **v22.5**.
- [ ] 9.2 Team → 🏦 Pokladna (dva účty): **🔁 Převod** → Z účtu Hlavní, 1 000 Kč, datum → Uložit převod. Karta Účty: hlavní −1 000, provozní +1 000 (řádek „převody“), celkový zůstatek, příjmy a výdaje beze změny. V seznamu 🔁 Převod Hlavní → Provozní, filtr Převody, při filtru účtu znaménko podle směru. 🗑 storno převod odebere.
- [ ] 9.3 ➖ Výdaj: datum platby, Komu (nabídka známých příjemců), Za měsíc. Uložit → v seznamu „Zimní stadion · za 10/2026“. CSV pohybů: převod jako „Převod“, výdaj s příjemcem v poznámce.
- [ ] 9.4 Šablona Pravidelný trénink (⚙️ → Nastavení pokladny): náklad Pronájem ledu, příjemce, částka. Team → **🧾 Náklady**: měsíc s tréninky – ⏳ čeká na platbu (součet za proběhlé tréninky), klepnutí ukáže události. **➖ Zapsat platbu** → 🏦 Pokladna s předvyplněným výdajem (kategorie, příjemce, Za měsíc, částka) → Uložit → v 🧾 Náklady ✅ zaplaceno. Výdaj zapsaný v listopadu „za říjen“ se počítá do října.
- [ ] 9.5 Výdaj stejné kategorie bez příjemce se rozdělí na řádky kategorie; výdaj kategorie bez událostí = ❔ výdaj bez události. 🗓 I budoucí měsíce ukáže plán, ⬇️ CSV stáhne sezónu.
- [ ] 9.6 Team → 💰 Platby → rozbalit hráčku → 💳 Zaplatit: okno má **Datum platby** (zkusit včerejšek) – v 🏦 Pokladna má úhrada zvolené datum. **✅ Zaplatila vše** otevře okno se seznamem předpisů, součtem a datem → Zapsat úhrady.
- [ ] 9.7 ☑ Hromadně → Ruční výběr: Datum platby → zaškrtnout → ✅ Zapsat úhrady → úhrady mají zvolené datum. Výpis z banky: nespárovaná platba → **➕ Příjem** → Zapsat? → příjem (Jiné příjmy), po novém načtení stejného výpisu se nenabídne. Pár s přeplatkem → po zápisu je přeplatek v pokladně jako příjem.
- [ ] 9.8 📅 Měsíce → 💸 Platy: Datum výplaty → Vyplatit → výdaj má zvolené datum.
- [ ] 9.9 Hráčka: Moje platby → 📱 Zaplatit: v okně název účtu s číslem; ⬇️ Uložit QR → obrázek má pod názvem „Účet: …“, příjemce s číslem účtu, soubor má v názvu číslo účtu. Banka QR načte jako dosud.
- [ ] 9.10 Rychlá kontrola z kap. 1.

## 10. v22.6 – 📈 Statistiky → 🏒 Trénink
- [ ] 10.1 V záhlaví je **v22.6**. Statistiky → nahoře přepínač 📊 Zápasy / 🏒 Trénink; Zápasy vypadají jako dosud.
- [ ] 10.2 Trenér: 🏒 Trénink → souhrn „Tréninků v období“ (60 dní). Přepnout 30 / 90 / 180 dní – počty se změní.
- [ ] 10.3 ⏲ Výsledky měření: výběr cvičení se změřenými výsledky z ⏲ stopek; nejlepší s datem, poslední, ▲ / ▼ zlepšení proti minulému tréninku, pořadí. Klepnutí na hlavičku řadí. ⬇️ CSV všech měření se otevře v Excelu.
- [ ] 10.4 👤 Karta hráčky: výběr hráčky, počet tréninků, minuty po dovednostech, výsledky s grafem (od 2 měření), ⭐ hodnocení trenérů s poznámkami.
- [ ] 10.5 🌡 Tým × dovednosti: minuty po dovednostech, tmavší = víc; 🔍 Kdo netrénoval – výběr dovednosti, seznam hráček; ⬇️ CSV tým × dovednosti.
- [ ] 10.6 Hráčka (👁 Náhled role nebo vlastní účet): 🏒 Trénink → **Můj trénink** (jen svá karta, minuty po cvičeních, výsledky), tabulka měření celého týmu s jejím řádkem zvýrazněným. **Žádné ⭐ hodnocení**, žádné Tým × dovednosti.
- [ ] 10.7 Hostující: Statistiky bez přepínače (beze změny).
- [ ] 10.8 Rychlá kontrola z kap. 1.

## 11. v22.7 – 🕘 Historie přihlášek
Před testem publikovaná **firestore.rules** z v22.7 (jinak se historie nezapisuje a okno ukáže „nepodařilo načíst“; samotné přihlašování funguje).
- [ ] 11.1 V záhlaví je **v22.7**. Hráčka (vlastní účet): u budoucí události ✅ Jdu, pak ❌ Nejdu s důvodem, pak ❓ a nakonec odpověď zruší. Vše funguje jako dosud.
- [ ] 11.2 Trenér: detail té události → rozbalit 👥 Docházka. U hráčky řádek 🕘 s časem poslední změny (bez ✍ – psala sama).
- [ ] 11.3 Trenér změní odpověď jiné hráčce (např. ❌ s důvodem). Po chvíli je u ní 🕘 čas a **✍ zapsal(a) jméno trenéra**.
- [ ] 11.4 🕘 Historie přihlášek: všechny změny z 11.1 a 11.3 nejnovější nahoře (✅, ❌, ❓, ↩ Odpověď zrušena), souhrn Změn / osob / za někoho / po termínu. Filtr ✍ Za někoho = jen změna trenérem. 👥 Podle osob = seskupení po hráčkách. ↻ Obnovit, Zavřít i systémové Zpět okno zavřou.
- [ ] 11.5 Po termínu přihlašování změnit odpověď trenérem → v historii štítek ⏰ po termínu; po začátku 🚫 Nedorazila → „🚫 Označeno: nedorazila“ se štítkem po začátku.
- [ ] 11.6 🏖 Nepřítomnost přes budoucí událost → v historii ❌ Nejdu „🏖 z nepřítomnosti“; zrušení nepřítomnosti → ↩ Odpověď zrušena. ✋ schválená žádost o změnu účasti → „✋ schválená žádost“.
- [ ] 11.7 Starší odpovědi (před v22.7) jsou v historii dole jako „(poslední změna)“ s účtem, který je zapsal.
- [ ] 11.8 Hráčka, pokladník bez trenérské role a hostující: žádné 🕘 v docházce ani tlačítko Historie.
- [ ] 11.9 Rychlá kontrola z kap. 1.

## 12. v22.8 – 📉 Čtení databáze
- [ ] 12.1 V záhlaví je **v22.8**. ⚙️ → 💾 Data → dole **📉 Čtení databáze**: počet dokumentů na jedno spuštění, největší kolekce, odhad pro hráčku, počet spuštění do limitu. **Čísla poslat Claudovi** (manager na PC i na telefonu).
- [ ] 12.2 Události → Minulé (trenér): u tréninků se po chvíli objeví 📋 / ⏱ / ⭐ jako dosud. Nadcházející: beze změny.
- [ ] 12.3 Otevřít minulý trénink, ohodnotit hráčku, zpět → na kartě se stav po chvíli obnoví (⭐ ohodnoceno).
- [ ] 12.4 Team → 💰 Platby → uzavřená událost: dole „Záznamy“ (uzavřeno, výjimky) jako dosud. Dát / zrušit výjimku → záznam přibude.
- [ ] 12.5 ⚙️ → 💰 Nastavení pokladny: 🏦 Historie změn účtů jako dosud.
- [ ] 12.6 ⚙️ → 💾 Data → Stáhnout zálohu (manager): soubor obsahuje `audit`.
- [ ] 12.7 Firebase konzole → Firestore → Usage: druhý den porovnat čtení s 27. 10. (30 000).
- [ ] 12.8 Rychlá kontrola z kap. 1.

## 22. v22.18 (beta) – ⚡ Improvizace na ledě
- [ ] 22.1 V betě je v záhlaví **v22.18**.
- [ ] 22.2 Trénink **bez plánu** (trenér): 📋 Plán tréninku → **⚡ Bez plánu – improvizovat na ledě** → otevře se okno ➕ Cvičení. Napsat část názvu → nabídka z 📚 banky; vybrat → délka podle banky → **✅ Vložit a začít** → hodiny běží, ostatní trenéři vidí stejný blok.
- [ ] 22.3 Během tréninku **➕ Cvičení** → napsat nový název (v bance není) → 💾 Uložit i do banky + kategorie → délka 5 → **▶ Hned** → současné cvičení skončí, odpočet běží na novém; ostatním přijde vibrace / ⌚ „↪ Změna“. V 📚 bance je nové cvičení s poznámkou ⚡.
- [ ] 22.4 **⏭ Po tomto bloku** a **⤓ Na konec**: hodiny se nezmění, blok je v 📋 Zbytek plánu a „zbývá plán“ naroste. **☕ Pauza** stejně.
- [ ] 22.5 **🥅 Brankářky zvlášť**: blok má druhou linku brankářek („vlastní cvičení“), trenér brankářek ji vidí jako své stanoviště.
- [ ] 22.6 **👥 Na ledě** (po začátku tréninku): počty v dresech; 🚫 u hráčky → zmizí z linek a počtů, v docházce události má 🚫; **↩ Je tu** vrátí.
- [ ] 22.7 Hodiny řídí jiný trenér: ✅ Vložit s ▶ Hned se nejdřív zeptá na převzetí řízení, druhé klepnutí vloží.
- [ ] 22.8 Po tréninku: detail tréninku ukazuje plán i s vloženými bloky, ⭐ hodnocení a 🏒 Statistiky je započítají.

## 21. v22.17 (beta) – ⏱ Živý trénink na ledě (ostrý test 28. 10. 2026)
**Před ledem (doma / v šatně, 5 minut, každý trenér na svém telefonu):**
- [ ] 21.1 V betě je v záhlaví **v22.17** (⚙️ → 👤 Účet → Načíst novou verzi).
- [ ] 21.2 Telefon: vypnutý **úsporný režim baterie** (jinak systém nedovolí držet obrazovku), Chrome / HockeyCoach má povolená oznámení; v aplikaci hodinek (Garmin Connect) povolená oznámení z Chrome / HockeyCoach.
- [ ] 21.3 Detail tréninku → 📋 Plán → ⏱ Živý trénink → klepnout **⌚** (systém se zeptá na povolení) → přijde zkušební oznámení „⌚ Oznámení zapnuta“ i na hodinky; tlačítko ukazuje ⌚✓.
- [ ] 21.4 Nahoře v okně svítí **☀ obrazovka nezhasne** (⚠ = úsporný režim nebo starý prohlížeč).
- [ ] 21.5 Řídící trenér (jediný) ▶ Spustit trénink. Ostatní trenéři mají stejný odpočet (rozdíl do 1 s) a **nic neovládají** – jen sledují své stanoviště (📍 Moje stanoviště, u řady cvičení vlastní odpočet).

**Na ledě:**
- [ ] 21.6 Odpočet běží všem stejně; 60 s a 10 s před koncem kola / cvičení vibrace + ⌚ oznámení „co teď / co potom“, při točení dlouhá vibrace.
- [ ] 21.7 Řídící: dole pevná lišta **⏸ Pauza · ⏭ Další · +1 min** (vždy stejné místo). Po ⏸ / ⏭ / +1 min dostanou ostatní trenéři vibraci a oznámení „⏸ Trénink pozastaven“ / „↪ Změna: …“ / „▶ Pokračujeme“.
- [ ] 21.8 Nahoře vždy vidět **zbývá plán** a **do konce tréninku** (i když se obrazovka posune dolů).
- [ ] 21.9 **🔒** → černá obrazovka s velkým odpočtem; telefon do kapsy – nic se omylem nezmáčkne, vibrace a oznámení chodí dál; **dvojité klepnutí** odemkne.
- [ ] 21.10 Obrazovka během celého tréninku nezhasne (telefon položený i v kapse se zámkem dotyku). Po zhasnutí tlačítkem a odemčení telefonu se ☀ obnoví samo.
- [ ] 21.11 (bez signálu) Řídící spustí / posune hodiny s vypnutými daty → po zapnutí dat mají ostatní stejný čas jako řídící (ne o dobu bez signálu pozadu).
- [ ] 21.12 Baterie: kolik % ubylo za trénink se svítící obrazovkou (se 🔒 by mělo být méně) – napiš do vlákna.

## 20. v22.16 (beta) – Potvrzení dresů, termín přihlášení, ⏰ pozdě
- [ ] 20.1 V betě je v záhlaví **v22.16**.
- [ ] 20.2 Trenér: detail tréninku → 🎽 „⏳ Nepotvrzeno – hráčky dresy zatím nevidí“ → **✅ Potvrdit dresy** → „✅ Potvrzeno …“.
- [ ] 20.3 Hráčka (👁 Náhled role) před potvrzením: v 🎽 „Dresy uvidíš, až trenér…“, v plánu „🎽 Barvu dresu uvidíš…“; po potvrzení dresy i „vezmi si … dres“.
- [ ] 20.4 Trenér změní dres jedné hráčce → „⚠️ Změněno po potvrzení“ + Potvrdit znovu; hráčka vidí ⚠️ upozornění.
- [ ] 20.5 ⚙️ → 📅 Události → ⏰ Nastavení událostí: trénink 2 dny předem, čas 20:00 → Uložit → + Trénink na čtvrtek předvyplní termín úterý 20:00; + Zápas podle nastavení zápasu.
- [ ] 20.6 Události → 📊 Docházka: sloupec ⏰ Pozdě (odpověď po termínu, i zapsaná trenérem). Moje platby → 📅 Po měsících → 📊 Moje docházka: „⏰ pozdě N“.
- [ ] 20.7 Detail události po uzávěrce: hráčka bez odpovědi má štítek „⌛ bez odpovědi = nejde“ (jen u událostí od 1. 11. 2026).
- [ ] 20.8 (v22.16.2) 📊 Docházka: počet událostí stejný jako před v22.16; u říjnových událostí žádné ⏰ pozdě, ❓ ani bez odpovědi – kromě „Jdu“ je vše ve sloupci ❌.

## 19. v22.15 (beta) – Dresy, kratší detail, sbalené bloky plánu
- [ ] 19.1 V betě je v záhlaví **v22.15**.
- [ ] 19.2 🏠 Domů: nahoře 🆚 Příští zápas (karta s ✅ ❌ ❓), pod ním 📅 Tréninky – příštích 7 dní bez zápasů.
- [ ] 19.3 Detail tréninku: hlavička jen název a datum; pod ní 📋 Plán tréninku, pak 🎽 Rozdělení do dresů („Modrá: …“); ℹ️ Podrobnosti po rozbalení ukážou místo, čas, termín a počty.
- [ ] 19.4 Trenér: ✏️ Upravit dresy → volby – / M / Ž / Z / R, ↻ Rozdělit automaticky; ✓ Hotovo vrátí zkrácený přehled.
- [ ] 19.5 Plán: štítky skupin Modrá / Žlutá (krátce M / Ž), hráčka vidí „🎽 vezmi si modrý dres“; ⏱ živý trénink ukazuje barvy místo pětek. Zápas a živý zápis dál pětky.
- [ ] 19.6 ✏️ Upravit plán: bloky sbalené (▸ čas, délka, cvičení), klepnutí rozbalí, + nový blok je rozbalený, ▾ Rozbalit vše / ▸ Sbalit vše.
- [ ] 19.7 Nový trénink → ✨ Připravit trénink → ⧉ Jako minule nabízí trénink stejného dne v týdnu.
- [ ] 19.8 ⚙️ → 👥 Tým a členové → role: „Asistent (zápasy, události)“, nikde „Kustod“.

## 18. v22.14 (beta) – Přihlášení z Domů, karta události, nápověda podle role
- [ ] 18.1 V betě je v záhlaví **v22.14**.
- [ ] 18.2 Události → Nadcházející: karta v pořadí název · datum → 📍 místo → **🕔 čas · ⏰ sraz** (větší písmo) → Přihlášení do … → Útočnice / Obránkyně / Brankářky / Trenéři → tlačítka ✅ ❌ ❓.
- [ ] 18.3 Detail události: hlavička ve stejném pořadí (místo, čas a sraz větší, termín, počty a útočnice…).
- [ ] 18.4 Hráčka (telefon nebo 👁 Náhled role s Povolit zápis): 🏠 Domů → 📅 Příštích 7 dní – stejné karty; **✅ Jdu** se zapíše hned (číslo v tlačítku se změní), **❌ Nejdu** otevře okno s důvodem, klepnutí na důvod uloží. Klepnutí mimo tlačítka otevře detail, ← Domů vrátí.
- [ ] 18.5 Trenér propojený s realizačním týmem: v Domů tlačítka za sebe; trenér, který je zároveň hráčka, za hráčku.
- [ ] 18.6 Hráčka s nezaplaceným předpisem: **💳 Moje platby** je úplně nahoře; bez dluhu (vše zaplaceno) se karta v Domů neukazuje.
- [ ] 18.7 🆚 Příští zápas: zápas do 7 dní je jen mezi kartami týdne; zápas za více než 7 dní je pod nimi zvlášť.
- [ ] 18.8 ❓ Nápověda: hráčka vidí 9 kapitol (bez Team, živého zápisu, pokladny, plánu tréninku), má bod „Trénink pro hráčku“; trenér 14 kapitol bez Pokladny; manager vše kromě 👁 Náhledu role (ten jen vývojář). Hledání v nápovědě funguje.

## 17. v22.13 (beta) – Docházka bez posouvání, počty v Domů, okno událostí hráčky
- [ ] 17.1 V betě je v záhlaví **v22.13**.
- [ ] 17.2 Trenér: detail události → 👥 Docházka → zapsat odpověď za několik hráček za sebou. Seznam se neposouvá, pod jménem není 🕘 / ✍ řádek.
- [ ] 17.3 **🕘 Historie přihlášek** pod docházkou: okno ukáže právě zapsané změny s ✍ kdo zapsal.
- [ ] 17.4 🏠 Domů: u událostí v 📅 Příštích 7 dnech a u 🆚 Příštího zápasu řádek **✅ N hráček · 🥅 N brankářek**; čísla sedí s počtem ✅ v detailu (bez realizačního týmu). Hostující řádek nevidí.
- [ ] 17.5 Hráčka (nebo 👁 Náhled role Hráčka): Události → Nadcházející končí dnem +15, dole **⬇ Načíst další události (od …)**; po klepnutí se objeví vzdálenější tréninky, odpověď na vzdálený trénink se hned ukáže.
- [ ] 17.6 Hráčka: Minulé ukazují 8 dní, **⬇ Starší události (N)** ukáže zbytek.
- [ ] 17.7 Hráčka: ⚙️ → 💾 Data → 📉 (jen vývojář / náhled) – „živě od … do …“. Trenér vidí vše jako dřív (bez tlačítek).

## 16. v22.12 (beta) – 🏠 Chybí odpověď a 📲 připomenutí
- [ ] 16.1 V betě (`…/beta/`) je v záhlaví **v22.12**; stabilní verze zůstává v22.11 a testerovi ukáže pruh **🧪 Nová beta v22.12 k vyzkoušení**.
- [ ] 16.2 Trenér v betě: nahoře v 🏠 Domů pruh **❔ Chybí odpověď: N** s nejbližší událostí s otevřeným přihlašováním; N sedí s „bez odpovědi“ v detailu události.
- [ ] 16.3 Klepnutí rozbalí jména (abecedně), druhé klepnutí sbalí. **Otevřít událost →** otevře detail, ← Domů vrátí zpět.
- [ ] 16.4 **📲 Připomenout** na Androidu otevře sdílení → WhatsApp skupina: text s událostí, časem, srazem, místem, termínem, jmény a odkazem na stabilní verzi.
- [ ] 16.5 Hráčka odpoví → N se sníží (po chvíli samo); když odpoví všechny, pruh zmizí. Zamčená (po termínu) nebo zrušená událost se přeskočí na další.
- [ ] 16.6 Hráčka ani hostující pruh nevidí; pokladník bez sportovní role také ne.
- [ ] 16.7 GitHub Actions: běh na větvi `beta` zelený, bez upozornění na Node.js 20 u kroku checkout.

## 15. v22.11 – 🧪 Beta kanál
- [ ] 15.1 Po nastavení GitHubu (README, kap. Kanály): Actions → Nasazení (stabilní + beta) je zelené; stabilní adresa ukazuje **v22.11**, adresa `…/beta/` také **v22.11** s fialovým pruhem **🧪 Beta v22.11 – testovací verze**.
- [ ] 15.2 Manager: ⚙️ → **🧪 Beta testování** → zaškrtnout jednoho člena → hláška „… je beta tester“; odškrtnout a znovu zaškrtnout. V záhlaví sekce počet testerů.
- [ ] 15.3 Účet, který **není** tester (druhý telefon, např. hráčka): otevřít `…/beta/` → „🧪 Beta je jen pro testery“, žádné záložky; Přejít na stabilní verzi funguje.
- [ ] 15.4 Tester: ⚙️ → 👤 Účet → **🧪 Otevřít betu** → beta (už přihlášený); v betě ⚙️ → 👤 Účet → Kanál 🧪 Beta, **← Stabilní verze** vrátí zpět. V betě místo 🔒 Vyžadovat verzi jen poznámka.
- [ ] 15.5 Beta na plochu (Chrome → Přidat na plochu / Instalovat): vznikne druhá ikona **HockeyCoach β**, stabilní ikona dál otevírá stabilní verzi.
- [ ] 15.6 Zápis v betě (např. odpověď ✅ u tréninku) je hned vidět ve stabilní verzi na druhém telefonu a naopak.
- [ ] 15.7 Ve stabilní ⚙️ → Načíst novou verzi → beta pořád funguje i offline (ikona β v režimu letadlo se spustí); totéž obráceně.
- [ ] 15.8 Po nahrání v22.12 do větve `beta`: tester ve stabilní vidí pruh **🧪 Nová beta v22.12 k vyzkoušení**; ✕ pruh skryje (po novém spuštění se neukáže), Vyzkoušet otevře betu. Netester pruh nevidí.
- [ ] 15.9 ⏱ Živý trénink v betě: oznámení ⏸ / ⏭ ovládá betu (ne stabilní okno).
- [ ] 15.10 Rychlá kontrola z kap. 1 (stabilní verze).

## 14. v22.10 – 🖐 Rychlejší události a docházka
- [ ] 14.1 V záhlaví je **v22.10**.
- [ ] 14.2 Události → **+ Trénink**: název, čas od – do, ⏰ sraz a místo podle posledního tréninku, řádek „↺ … podle posledního tréninku“. Změna data na jiný den v týdnu → čas a místo podle posledního tréninku toho dne.
- [ ] 14.3 Ve formuláři ruční změna času nebo místa, pak změna data → ruční hodnoty zůstanou.
- [ ] 14.4 **+ Zápas**: čas a místo podle posledního domácího zápasu; přepnout **Venku** → podle posledního venkovního. Ruční přepsání místa se přepnutím nezmění.
- [ ] 14.5 ❌ Nejdu → klepnutí na **Nemoc** rovnou uloží (okno se zavře, u události ❌ s důvodem). ❓ Nejsem jistý → stejně.
- [ ] 14.6 ❌ Nejdu → **Jiné** → kurzor v poli, napsat např. „Turnaj“ → Uložit. Příště je „Turnaj“ v nabídce nahoře (jen v tomto zařízení).
- [ ] 14.7 + Trénink → 🔁 Opakovat (správce pokladny): zvolit jinou šablonu, vytvořit; další série nabídne tuto šablonu.
- [ ] 14.8 Hráčka: odpověď ❌ s rychlým důvodem funguje, trenér důvod vidí.

## 13. v22.9 – 📉 Události a docházka v okně
- [ ] 13.1 V záhlaví je **v22.9**. ⚙️ → 💾 Data → 📉: u událostí „živě od …“ (45 dní zpět), starší N z paměti zařízení, „ze serveru ověřeno …“. Číslo na spuštění je menší než u v22.8.
- [ ] 13.2 Události → Minulé a Kalendář: i staré události (např. září) jsou vidět včetně počtů ✅ ❓ ❌ a stavu 💰 / 🏒 jako dosud.
- [ ] 13.3 📊 Docházka, Statistiky, Team → 💰 Platby, ⚖️ Tarify a Moje platby ukazují stejná čísla jako v22.8.
- [ ] 13.4 Manager: 👤 Účet → 🔒 Vyžadovat verzi → hláška „Datum události doplněno do docházky: N×“ a „Minimální verze nastavena na v22.9“. Načíst znovu → v 📉 přibude řádek **docházka: živě od …**.
- [ ] 13.5 Hráčka (vlastní účet nebo 👁 náhled): odpověď na budoucí událost funguje, trenér ji vidí hned. V 📉 (realizační tým) odhad pro hráčku výrazně menší.
- [ ] 13.6 Změna data události (✏️ Upravit) → docházka zůstane u události (počty beze změny).
- [ ] 13.7 ↻ Obnovit starší data ze serveru (druhým klepnutím) → hláška, v 📉 nový čas ověření.
- [ ] 13.8 Firebase konzole → Usage: další dny porovnat čtení (27. 10.: 30 000).
- [ ] 13.9 Rychlá kontrola z kap. 1.

