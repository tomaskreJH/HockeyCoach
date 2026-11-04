# Návrhy v22.44 – čekají na souhlas (nejde vrátit přes Git)

## A. Banka mott a pokřiků („Holky jedeeeem“, „Střely … čo, Majda … čo“)
Cíl: na kartě 🆚 Příští zápas (Domů) se při každém spuštění aplikace ukáže náhodné motto / pokřik, který si hráčky samy napsaly – osobnost, povzbuzení, motivace.

**Data (nová kolekce, jen přidání):** `mottos/{id}` = `{t: "text (max 80 znaků)", pid, by (e-mail), at, off?}`
- hráčka / člen týmu: 1 vlastní motto při přijetí do týmu (pole `motto` v žádosti o přijetí → po přijetí se založí záznam) a další kdykoli v ⚙️ → 👤 Účet → „Moje motto a pokřiky“ (až 5 na osobu);
- čtení: celý tým (`isTeam`); zápis: jen vlastní (`pid` = moje), úprava a smazání vlastního; trenér / manager může cizí **skrýt** (`off: true`), ne přepsat.

**Zobrazení:** na kartě příštího zápasu jedna řádka „💬 text“ + podpis (jméno hráčky), náhodně při každém spuštění (stabilní do zavření aplikace, aby při překreslení neblikalo). Čtení: celá kolekce je malá (desítky krátkých dokumentů, 1 poslech při spuštění) – dopad na 📉 limit čtení zanedbatelný; případně načítat až při zobrazení karty.

**Pravidla (`firestore.rules`):** nová kolekce `mottos`, čtení `isTeam`, `create` jen s `pid` ve vlastním členství a délkou textu, `update` / `delete` vlastní, trenér smí jen pole `off`. Pravidla se musí **publikovat ručně**; stará verze aplikace kolekci nepoužívá (bezpečné rozšíření).
**Moderace:** hlášení nevhodného textu = trenér klepne na 🙈 Skrýt.

## B. Synchronizace kalendáře (Outlook M365 a další)
Aplikace nemá vlastní server (GitHub Pages + Firestore Spark), proto jsou možnosti:
1. **📅 Přidat do kalendáře (.ics)** – u události tlačítko, které stáhne soubor `.ics` (soukromá událost `CLASS:PRIVATE`, sraz, místo, připomenutí, stabilní `UID` = id události, takže opakovaný import událost aktualizuje). Bez serveru, bez změny databáze, funguje v Outlooku, Google i Apple kalendáři. Nevýhoda: ruční klepnutí.
2. **📅 Moje události (.ics)** – jedno tlačítko exportuje všechny nadcházející události, kde jsem „Jdu“ / „Nejsem jistý“, najednou (opět s `UID`).
3. **Automatické předplatné (webcal)** – kalendář se aktualizuje sám, ale potřebuje server, který čte Firestore a vydává soukromý odkaz na osobu: Firebase Cloud Functions (vyžaduje tarif Blaze s platební kartou, v praxi nulové náklady, ale není „zdarma bez karty“) nebo externí služba (např. Cloudflare Worker) + tajný token na člena (nové pole v databázi + pravidla). Vlastní předplatné do firemního M365 může blokovat správce firmy.
4. **Přímý zápis do Outlooku (Microsoft Graph)** – vyžaduje registraci aplikace v Azure a souhlas správce tenantu; pro firemní účet nedoporučuji.

**Doporučení:** nejdřív 1 + 2 (levné, bez databáze, hned použitelné), automatické předplatné jen pokud ruční export nebude stačit.
