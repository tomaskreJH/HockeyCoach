// Sdílený stav aplikace (jediný zdroj pravdy za běhu). tab = záložka (home = 🏠 Domů – výchozí, ev, fo, st, op, mk).
// 🏠 Domů: hw = id běžícího zápasu otevřeného v 👁 náhledu jen ke čtení (views/live-watch.js), null = přehled.
// Události a docházka: ev = tréninky, at = odpovědi, evid = otevřená událost, evp = člen, za kterého platí rychlá tlačítka na kartě (hráčka sama / propojený trenér),
// evm = režim seznamu (up / past / cal), evc = zobrazený měsíc, evd = vybraný den, evf = formulář, evr = okno s důvodem, evErr = chyba načtení,
// evBack = záložka, kam vede tlačítko Zpět z detailu události (např. "fo" po otevření z Team → Platby, "home" z 🏠 Domů).
// Team: tm = režim záložky Team (team = formace a soupiska, pay / cash / mon / bud = Platby / Pokladna / Měsíce / Rozpočet pro správce pokladny).
// Rozpočet: bd = rozpočty sezón (kolekce budget, id = sezóna "RRRR-RR"; jen správci pokladny).
// Realizační tým: tr = členové (kolekce staff).
// Pokladna: ch = předpisy (charges; správce vidí všechny, ostatní jen své), cs = příjmy a výdaje (cash, jen správci), au = audit (jen správci),
// ec = vyúčtování událostí (evcash: náklady, kdo platí, snapshot; jen správci), cc = nastavení pokladny (settings/cash), payErr = chyba načtení.
// Docházka a dlužníci: evm "att" = přehled docházky, ao = volby přehledu {from, to, kind}, dt = souhrn dlužníků (kolekce debtors, bez částek), dtErr = chyba načtení.
// Soukromí: an = důvody omluv (kolekce attnote, mapa id → {eid, mid, reason}; trenér a kustod všechny, ostatní jen své). V at, pl a tr jsou
// důvody, platební pole a platy už připojené (domain/private-data.js), proto pohledy čtou at[].reason, pl[].grp…, tr[].pay jako dřív.
// Měsíční příspěvky jsou předpisy v ch (kind "contrib"), platy jsou výdaje v cs (id sal_RRRR-MM_tid).
// Moje platby: pr = ceny uzavřených událostí na hlavu (kolekce evprice, čte každý člen), mk = pohled {v: "list" | "mon", day – sezóna, open – rozbalený měsíc,
// rq – rozpracovaná žádost o změnu placení {ym, note}}. Žádosti: rq = kolekce requests (správce pokladny všechny, ostatní jen své), rqo = otevřená žádost v okně správce.

export const S={pl:[],ma:[],def:{},tab:"home",mid:null,ready:false,err:null,db:null,M:null,pick:null,showLu:false,per:1,cf:null,pf:"act",pq:"all",fo:false,pickAll:false,showNom:false,showOp:false,op:[],oid:null,step:1,lv:false,qa:null,lmenu:false,rpShots:true,rpSubs:true,lsub:null,rp:false,ed:null,injp:null,wd:{},wl:null,ev:[],at:[],tr:[],ch:[],cs:[],au:[],ec:[],cc:{},payErr:null,evErr:null,evid:null,evp:null,evm:"up",evc:null,evd:null,evf:null,evr:null,evBack:null,tm:"team",ao:null,dt:[],dtErr:null,an:{},pr:[],mk:null,rq:[],rqo:null,bd:[],hw:null};
