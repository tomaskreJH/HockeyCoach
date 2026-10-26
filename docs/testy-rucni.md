# Ruční testy na Androidu

Kontrolní seznam po nasazení. `npm test` a `npm run smoke` ověří výpočty, zápisy a vykreslení, **ne** telefon, pravidla databáze, vibrace, oznámení ani hodinky.
Po každé verzi se přidá kapitola netestované verze; otestované kapitoly se přesunou do `docs/archiv/` (starší: `docs/archiv/testy-rucni-v21.md`). Výsledek zapiš do vlákna: číslo kroku + ✅ / ❌ + co se stalo.

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
