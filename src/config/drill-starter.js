// Modul Trénink: 📥 Základní sada cvičení pro banku (Team → 📚 Cvičení → 📥 Základní sada) – hráčky a brankářky.
// Jen data bez logiky; klíče cat / sk / grp / meas.u odpovídají číselníkům v config/skills.js. Import (výběr, kontrola duplicit) dělá domain/drill-import.js.
// Texty jsou výchozí návrh – po importu se upravují jako každé jiné cvičení (odkaz na video a obrázky doplní trenér).
// Struktura: Hráčky (rozbruslení → dovednosti → malý prostor → herní situace → závěr → mimo led) -> Brankářky.

// ===== Hráčky =====
const PLAYERS = [
  // --- 🔥 Rozbruslení ---
  {name: "Rozbruslení kolem kruhů", cat: "warm", sk: ["skate", "fun"], lvl: 1, dur: 5, grp: ["all"], eq: "",
    desc: "Volné bruslení kolem všech pěti kruhů, na pokyn trenéra změna směru. Postupně zrychlovat, poslední kolo naplno.\nDůraz: hluboký podřep, celý odraz, hlava nahoře."},
  {name: "Osmičky s pukem kolem kruhů", cat: "warm", sk: ["skate", "puck"], lvl: 1, dur: 6, grp: ["all"], eq: "puky",
    desc: "Každá hráčka s pukem jezdí osmičky přes dva kruhy v pásmu. Po minutě výměna pásma.\nDůraz: puk před tělem, měkké ruce, v obloucích přešlapovat."},
  {name: "Dynamická rozcvička na suchu", cat: "warm", sk: ["fit", "fun"], lvl: 1, dur: 10, grp: ["all"], eq: "",
    desc: "Před vstupem na led: poklus, skipy, zakopávání, výpady s rotací, kroužení pažemi a boky, krátké sprinty 3 × 10 m.\nCíl: zahřát svaly a kloubní pouzdra, ne unavit."},

  // --- ⛸ Bruslení ---
  {name: "Přešlapování v kruzích", cat: "skill", sk: ["skate"], lvl: 1, dur: 8, grp: ["all", "st"], eq: "",
    desc: "Hráčky jezdí po obvodu kruhu s přešlapováním, po hvizdu změna směru. Varianta: s pukem, nebo jen na vnější hraně.\nDůraz: vnější noha dotlačí odraz až do konce, ramena rovně."},
  {name: "Obraty a zastavení u čar", cat: "skill", sk: ["skate"], lvl: 1, dur: 8, grp: ["all"], eq: "",
    desc: "Jízda od brankové čáry: zastavení na modré, zpět, zastavení na červené, zpět, zastavení na vzdálené modré a dojetí. Střídat zastavení oběma směry.\nDůraz: zastavení na obou nohách, hned znovu vyjet."},
  {name: "Starty z různých poloh", cat: "skill", sk: ["skate", "fit"], lvl: 1, dur: 8, grp: ["all", "st"], eq: "",
    desc: "Start na hvizd z postoje čelem, bokem, zády, z kleku nebo z lehu. Sprint na modrou čáru, zpět volně.\nDůraz: první tři krůčky krátké a rychlé (běh na bruslích).", meas: {u: "s", low: true}},
  {name: "Couvání a obraty vpřed / vzad", cat: "skill", sk: ["skate", "def"], lvl: 2, dur: 8, grp: ["all", "st"], eq: "kužely",
    desc: "Couvání podél kuželů, u každého kuželu obrat vpřed a zpět do couvání (pivot). Obraty střídat na obě strany.\nDůraz: při obratu nezvednout těžiště, hokejka na ledě."},

  // --- 🏒 Ovládání puku ---
  {name: "Kličkování mezi kužely", cat: "skill", sk: ["puck"], lvl: 1, dur: 8, grp: ["st"], eq: "kužely, puky",
    desc: "Řada kuželů po 1,5 m, hráčka projede slalomem s pukem a zakončí střelou. Varianty: jen forhend, jen bekhend, přetahování do strany.\nDůraz: puk blízko kuželu, hlava co nejvíc nahoře."},
  {name: "Vedení puku s hlavou nahoře", cat: "skill", sk: ["puck", "skate"], lvl: 2, dur: 6, grp: ["all", "st"], eq: "puky",
    desc: "Hráčky vedou puk v pásmu, trenér stojí uprostřed a ukazuje počet prstů. Hráčka nahlas řekne číslo. Kdo se dívá na puk, nevidí.\nDůraz: vnímat puk ve spodní ruce, ne očima."},
  {name: "Ochrana puku tělem", cat: "skill", sk: ["puck", "duel"], lvl: 2, dur: 8, grp: ["st"], eq: "puky",
    desc: "Dvojice v kruhu: jedna drží puk a chrání ho tělem, druhá se ho snaží získat bez hokejky (jen tělem a nohama). Výměna po 20 s.\nDůraz: puk na vzdálené straně, široký postoj, hlava nahoře."},

  // --- ↔️ Přihrávky ---
  {name: "Přihrávky ve dvojicích na místě", cat: "skill", sk: ["pass"], lvl: 1, dur: 6, grp: ["all", "st"], eq: "puky",
    desc: "Dvojice proti sobě na 5–8 m: forhend, bekhend, jednou rukou, přes hokejku na ledě. Po minutě zvětšit vzdálenost.\nDůraz: tlačit puk, nemávat; hokejka po přihrávce ukazuje na spoluhráčku, při příjmu měkce povolit."},
  {name: "Přihrávky v pohybu ve dvojicích", cat: "skill", sk: ["pass", "skate"], lvl: 2, dur: 8, grp: ["all"], eq: "puky",
    desc: "Dvojice jedou vedle sebe po délce hřiště a přihrávají si v pohybu. Zpět po druhé straně. Varianta: přihrávka do volného prostoru před spoluhráčku.\nDůraz: přihrávat před hokejku, příjem bez zpomalení."},
  {name: "Trojúhelník přihrávek", cat: "skill", sk: ["pass"], lvl: 2, dur: 8, grp: ["st"], eq: "puky, kužely",
    desc: "Tři hráčky v trojúhelníku, puk obíhá. Kdo přihraje, objede svůj kužel. Po minutě změna směru. Varianta: dva puky najednou.\nDůraz: komunikace, příjem do pohybu."},

  // --- 🥅 Střelba ---
  {name: "Švihová střela z místa", cat: "skill", sk: ["shot"], lvl: 1, dur: 8, grp: ["st"], eq: "puky, terčíky nebo kužely do rohů branky",
    desc: "Řada hráček na kraji kruhu, každá 10 střel švihem na branku nebo terčíky v rozích. Počítají se zásahy.\nDůraz: přenos váhy ze zadní nohy na přední, puk ve středu čepele, dotáhnout hokejku na cíl.", meas: {u: "ks", low: false}},
  {name: "Střela z pohybu po kličce", cat: "skill", sk: ["shot", "puck"], lvl: 2, dur: 8, grp: ["all", "st"], eq: "kužely, puky",
    desc: "Hráčka vyjede z rohu, objede kužel na modré, kličkou obejde druhý kužel a ze slotu vystřelí. Střídat strany.\nDůraz: vystřelit hned po kličce, nezastavovat."},
  {name: "Dorážky a clonění před brankou", cat: "skill", sk: ["shot", "game"], lvl: 2, dur: 8, grp: ["st"], eq: "puky",
    desc: "Trenér střílí od modré, jedna hráčka cloní před brankářkou a dorazí odražený puk, druhá jí brání. Výměna po 5 střelách.\nDůraz: hokejka na ledě, neodcházet od branky."},

  // --- 🤼 Souboje a 🛡 bránění ---
  {name: "Souboj 1 na 1 v rohu", cat: "skill", sk: ["duel"], lvl: 2, dur: 8, grp: ["st"], eq: "puky",
    desc: "Trenér nahodí puk do rohu, dvě hráčky o něj soupeří. Která puk získá, snaží se dostat do slotu a vystřelit. Souboj max 20 s.\nDůraz: první u puku, tělo mezi soupeřkou a pukem."},
  {name: "1 na 1 přes celé pásmo", cat: "sys", sk: ["duel", "def"], lvl: 2, dur: 10, grp: ["all"], eq: "puky",
    desc: "Útočnice vyjede s pukem od červené čáry, obránkyně couvá od modré. Útočnice se snaží vystřelit, obránkyně ji vytlačit ke kraji.\nDůraz obránkyně: hokejka na puk, odstup na délku hokejky, tlačit ven ze středu."},
  {name: "Postavení obránkyně s hokejkou", cat: "skill", sk: ["def"], lvl: 1, dur: 6, grp: ["st"], eq: "puky",
    desc: "Dvojice: útočnice jede pomalu s pukem, obránkyně couvá a hokejkou na ledě míří na puk. Pak vypíchnutí puku (poke check) na znamení.\nDůraz: vypíchnout až na jistotu, nevrhat se."},

  // --- ⚡ Hra v malém prostoru ---
  {name: "2 na 2 v jednom pásmu", cat: "ssg", sk: ["game", "duel", "pass"], lvl: 2, dur: 10, grp: ["all", "st"], eq: "puky, 1–2 branky",
    desc: "Hra 2 na 2 v jednom pásmu na jednu branku, střídání po 40 s. Puk mimo pásmo (nebo za modrou) se musí vyvézt, než se smí střílet.\nDůraz: podpora spoluhráčky, rychlé rozhodnutí."},
  {name: "3 na 3 přes šířku hřiště", cat: "ssg", sk: ["game", "pass", "skate"], lvl: 2, dur: 12, grp: ["all"], eq: "2 malé branky nebo kužely, puky",
    desc: "Hřiště rozdělené na třetiny, v každé hra 3 na 3 napříč na malé branky. Střídání po 45 s.\nDůraz: hodně dotyků s pukem, hra do volného prostoru."},
  {name: "Hra na udržení puku", cat: "ssg", sk: ["pass", "puck", "game"], lvl: 1, dur: 8, grp: ["all", "st"], eq: "puky, rozlišovací dresy",
    desc: "V kruhu nebo v pásmu hrají 3 na 2 (nebo 4 na 2) bez branek: přesila si puk udržuje, oslabení ho získává. Po zisku výměna rolí.\nDůraz: nabízet se do volna, nepřihrávat přes hokejku soupeřky."},

  // --- 🧠 Herní situace ---
  {name: "Přečíslení 2 na 1", cat: "sys", sk: ["game", "pass", "shot"], lvl: 2, dur: 10, grp: ["all"], eq: "puky",
    desc: "Dvě útočnice od červené čáry proti jedné obránkyni. Útočnice zakončí přihrávkou nebo střelou, obránkyně brání přihrávce a hlídá střed.\nDůraz útočnic: šířka, rozhodnout se do vstupu do kruhů."},
  {name: "Vyjíždění z obranného pásma", cat: "sys", sk: ["game", "pass", "def"], lvl: 2, dur: 12, grp: ["all"], eq: "puky",
    desc: "Trenér nahodí puk do rohu, obránkyně ho sebere a otočí hru na křídlo u mantinelu nebo na středního útočníka ve středu, pětka vyjede do útoku. Nejdřív bez soupeře, pak s jedním napadajícím.\nDůraz: obránkyně se před převzetím rozhlédne, křídla stojí u mantinelu na úrovni kruhu."},
  {name: "Přesilovka 5 na 4 – rozestavení", cat: "sys", sk: ["ppsh", "pass", "game"], lvl: 3, dur: 12, grp: ["all"], eq: "puky",
    desc: "Nácvik rozestavení přesilovky (např. „deštník“) proti čtyřem bránícím hráčkám nejdřív v chůzi, pak v plné rychlosti. Bránící střídají postavení „krabice“.\nDůraz: rychlý oběh puku, střela od modré s clonou."},

  // --- 🏁 Závěr ---
  {name: "Nájezdy", cat: "end", sk: ["shot", "puck"], lvl: 1, dur: 8, grp: ["all"], eq: "puky",
    desc: "Hráčky jedna po druhé najíždějí od červené čáry na brankářku. Varianta: soutěž dvou družstev, kdo dá víc gólů.\nDůraz: zvolit kličku nebo střelu předem, pak rozhodnout podle brankářky."},
  {name: "Hra 5 na 5 se zaměřením", cat: "end", sk: ["game", "fun"], lvl: 1, dur: 15, grp: ["all"], eq: "rozlišovací dresy",
    desc: "Závěrečná hra přes celé hřiště. Trenér určí zaměření z tréninku (např. gól platí jen po přihrávce, nebo po střele z první).\nDůraz: použít ve hře to, co se trénovalo."},

  // --- 💪 Mimo led a kondice ---
  {name: "Sprinty na čáry", cat: "end", sk: ["fit", "skate"], lvl: 2, dur: 5, grp: ["all"], eq: "",
    desc: "Od brankové čáry sprint na nejbližší modrou a zpět, na červenou a zpět, na vzdálenou modrou a zpět, na protější brankovou a zpět. 2–3 série s pauzou.\nDůraz: zastavení na obou stranách, dojet naplno.", meas: {u: "s", low: true}},
  {name: "Koordinace s míčkem (mimo led)", cat: "off", sk: ["fit", "puck"], lvl: 1, dur: 15, grp: ["all", "st"], eq: "tenisové míčky, florbalové hokejky",
    desc: "Žonglování s jedním a dvěma míčky, přehazování ve dvojicích, vedení míčku florbalovou hokejkou mezi kužely, odraz míčku od zdi a chytání.\nCíl: koordinace oko–ruka a rychlé ruce."}
];

// ===== Brankářky =====
const GOALIES = [
  {name: "Brankářky: rozbruslení – šoupání a T-push", cat: "warm", sk: ["gk", "skate"], lvl: 1, dur: 6, grp: ["gk"], eq: "",
    desc: "Od tyče k tyči a po brankovišti: šoupání (shuffle) do stran, T-push na obě strany, zastavení vždy čelem ke hře.\nDůraz: ramena a kolena mířit dopředu, hokejka na ledě."},
  {name: "Brankářky: posuny mezi tyčemi", cat: "skill", sk: ["gk", "skate"], lvl: 1, dur: 6, grp: ["gk", "st"], eq: "",
    desc: "Brankářka v základním postoji, na pokyn trenéra posun k tyči, do středu, k druhé tyči (šoupání pro krátký posun, T-push pro dlouhý). Pak s pukem, který trenér posouvá před brankou.\nDůraz: stále čelem k puku, nezvedat se z postoje."},
  {name: "Brankářky: butterfly a vstávání", cat: "skill", sk: ["gk"], lvl: 1, dur: 6, grp: ["gk", "st"], eq: "",
    desc: "Klesnutí do butterfly a vstávání střídavě přes levou a pravou nohu. Varianta: v butterfly posun do strany (butterfly slide) a vstát.\nDůraz: kolena k sobě, lapačka a vyrážečka vpředu, vstávat přes vnější nohu."},
  {name: "Brankářky: postavení k úhlu střely", cat: "skill", sk: ["gk"], lvl: 2, dur: 8, grp: ["gk", "st"], eq: "puky, kužely",
    desc: "Trenér nebo hráčky stojí v 5 bodech (kraje, kruhy, střed). Na pokyn se brankářka postaví na úhel ke střelci a vyjede dopředu, pak střela.\nDůraz: střed těla na puk, správná hloubka v brankovišti."},
  {name: "Brankářky: chytání lapačkou a vyrážečkou", cat: "skill", sk: ["gk"], lvl: 1, dur: 8, grp: ["gk", "st"], eq: "puky, tenisové míčky",
    desc: "Trenér hází nebo střílí zblízka do lapačky, pak do vyrážečky a střídavě. Začít tenisovými míčky, pak puky.\nDůraz: ruce před tělem, puk chytit (lapačka) nebo usměrnit do rohu (vyrážečka)."},
  {name: "Brankářky: kontrola odrazů", cat: "skill", sk: ["gk"], lvl: 2, dur: 8, grp: ["gk", "st"], eq: "puky",
    desc: "Střely na betony z kraje a ze středu, brankářka odráží puk do rohu mimo slot. Pak druhý střelec doráží odražený puk.\nDůraz: úhel betonů, hokejka zavírá díru mezi nohama."},
  {name: "Brankářky: práce s hokejkou", cat: "skill", sk: ["gk", "pass"], lvl: 2, dur: 6, grp: ["gk", "st"], eq: "puky",
    desc: "Zastavení nahozeného puku za brankou a přihrávka obránkyni do rohu nebo k mantinelu. Varianta: vyhození puku z pásma.\nDůraz: rychle zpět do branky, přihrávat do volného prostoru."},
  {name: "Brankářky: pokrytí puku", cat: "skill", sk: ["gk"], lvl: 1, dur: 5, grp: ["gk", "st"], eq: "puky",
    desc: "Pomalé střely a puky posunuté do brankoviště – brankářka puk pokryje lapačkou nebo tělem a zastaví hru.\nDůraz: lapačka přes puk, hokejka chrání stranu."},
  {name: "Brankářky: posun po přihrávce z rohu", cat: "skill", sk: ["gk", "game"], lvl: 3, dur: 8, grp: ["gk", "st"], eq: "puky",
    desc: "Hráčka v rohu přihrává do slotu nebo na protější kruh, druhá střílí z první. Brankářka se po přihrávce přesune (T-push nebo butterfly slide) a postaví na nový úhel.\nDůraz: sledovat puk, ne hráčku; posun přímo, ne obloukem."},
  {name: "Brankářky: reakce a koordinace (mimo led)", cat: "off", sk: ["gk", "fit"], lvl: 1, dur: 10, grp: ["gk"], eq: "tenisové míčky, reakční míček",
    desc: "Chytání míčku odraženého od zdi jednou rukou, střídání rukou, žonglování se dvěma míčky, chytání reakčního míčku.\nCíl: rychlost reakce a postřeh."}
];

// ===== Exporty =====
// Celá sada v pořadí pro výběr (nejdřív hráčky, pak brankářky)
export const DRILL_STARTER = [...PLAYERS, ...GOALIES];
