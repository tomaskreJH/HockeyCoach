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
// Soukromí: an = důvody omluv (kolekce attnote, mapa id → {eid, mid, reason}; manager, trenér a asistent všechny, ostatní jen své). V at, pl a tr jsou
// důvody, platební pole a platy už připojené (domain/private-data.js), proto pohledy čtou at[].reason, pl[].grp…, tr[].pay jako dřív.
// Měsíční příspěvky jsou předpisy v ch (kind "contrib"), platy jsou výdaje v cs (id sal_RRRR-MM_tid).
// Moje platby: pr = ceny uzavřených událostí na hlavu (kolekce evprice, čte každý člen), mk = pohled {v: "list" | "mon", day – sezóna, open – rozbalený měsíc,
// rq – rozpracovaná žádost o změnu placení {ym, note}}. Žádosti: rq = kolekce requests (správce pokladny všechny, ostatní jen své), rqo = otevřená žádost v okně správce.

// Rozdělení do pětek (views/line-split-view.js): plv = ⭐ výkonnost {pid: 1–5}, plvErr = chyba načtení, plvo = otevřené okno výkonnosti, lsp = volby rozdělení;
// ⏱ živý trénink (views/trlive-view.js): tl = otevřená obrazovka {eid}.
// Plán tréninku (views/trplan-view.js): tp = plány otevřených tréninků {eid: dokument | null}, tpErr = chyba načtení, tpe = úprava {eid, p, dirty},
// tpv = otevřené cvičení v plánu {eid, bi, li}, tpr = panel ⧉ kopie / 📑 šablon v úpravě plánu (views/trplan-reuse.js),
// tcv = 📊 pokrytí dovedností {eid, days, st, res} (views/trplan-reuse.js). Banka cvičení: dri = 📥 hromadné přidání (sada / CSV),
// dru = použití cvičení v plánech a šablonách {st: "load" | "ok" | "err", m: {id: počet}} pro kontrolu před smazáním.
// Výchozí hodnoty událostí: es = settings/events {meetT, meetM, len} – sraz tréninku a zápasu, délka tréninku (domain/event-time.js).
// Zrušení události: evx = id události s otevřeným formulářem zrušení, evxr = rozepsaný důvod. Žádost o změnu účasti: aq = rozepsaná žádost
// {eid, want, reason}, aqo = otevřená žádost v okně trenéra. Nepřítomnost: ab = kolekce absence (manager / trenér / asistent všechny, ostatní své),
// abf = formulář 🏖 {id?, mid, kind, from, to, note} (null = zavřený). Hostující: lu = formace událostí (lineuppub, jen u „Jdu“);
// pubMap / pubOk = uložené veřejné dokumenty evpub / lineuppub a zda se načetly (manager / trenér / asistent, views/auto-sync.js).
export const S={plv:undefined,plvErr:null,plvo:null,lsp:null,tl:null,tp:{},tpErr:null,tpe:null,tpv:null,tpr:null,tcv:null,dri:null,dru:null,pl:[],ma:[],def:{},es:{},tab:"home",mid:null,ready:false,err:null,db:null,M:null,pick:null,showLu:false,per:1,cf:null,pf:"act",pq:"all",fo:false,pickAll:false,showNom:false,showOp:false,op:[],oid:null,step:1,lv:false,qa:null,lmenu:false,rpShots:true,rpSubs:true,lsub:null,rp:false,ed:null,injp:null,wd:{},wl:null,ev:[],at:[],tr:[],ch:[],cs:[],au:[],ec:[],cc:{},payErr:null,evErr:null,evid:null,evp:null,evm:"up",evc:null,evd:null,evf:null,evr:null,evBack:null,tm:"team",ao:null,dt:[],dtErr:null,an:{},pr:[],mk:null,rq:[],rqo:null,bd:[],hw:null,evx:null,evxr:"",aq:null,aqo:null,ab:[],abf:null,lu:{},pubMap:{evpub:{},lineuppub:{}},pubOk:{},dr:[],drErr:null,drf:{},dre:null,dro:null};
