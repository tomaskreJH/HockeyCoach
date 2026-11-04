# Prompt pro nové čisté vlákno (vložit jako první zprávu)

Pokračujeme v HockeyCoach (repo tomaskreJH/HockeyCoach, větev beta, poslední verze v22.47). Načti repo, vypiš verzi a přečti `docs/navrh-notifikace-kalendar.md`, `docs/STAV.md` a `docs/KONVENCE.md`.

Úkol: připravit **notifikace + synchronizaci kalendáře** (spolu, ne zvlášť). Nejdřív mi polož otázky z kapitoly 5 návrhu (Blaze, typy notifikací, soukromí, tiché hodiny) a po odpovědích začni verzí v22.48 (.ics export s UID / SEQUENCE / CLASS:PRIVATE / VALARM, čistá funkce `domain/ical.js` + testy). Před jakoukoli změnou databáze nebo `firestore.rules` se zeptej. Pravidla projektu platí (beta, verze = commit, bez zkracování, komentáře, README + verzování, česky).
