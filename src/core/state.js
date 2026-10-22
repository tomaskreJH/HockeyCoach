// Sdílený stav aplikace (jediný zdroj pravdy za běhu).
// Události a docházka: ev = tréninky, at = odpovědi, evid = otevřená událost, evp = člen, za kterého platí rychlá tlačítka na kartě (hráčka sama / propojený trenér),
// evm = režim seznamu (up / past / cal), evc = zobrazený měsíc, evd = vybraný den, evf = formulář, evr = okno s důvodem, evErr = chyba načtení,
// evBack = záložka, kam vede tlačítko Zpět z detailu události (např. "fo" po otevření z Team → Platby).
// Team (v17.5): tm = režim záložky Team (team = formace a soupiska, pay / cash / mon = Platby / Pokladna / Měsíce pro správce pokladny).
// Realizační tým: tr = členové (kolekce staff).
// Pokladna: ch = předpisy (charges; správce vidí všechny, ostatní jen své), cs = příjmy a výdaje (cash, jen správci), au = audit (jen správci),
// ec = vyúčtování událostí (evcash: náklady, kdo platí, snapshot; jen správci), cc = nastavení pokladny (settings/cash), payErr = chyba načtení.
// Docházka a dlužníci (v18.7): evm "att" = přehled docházky, ao = volby přehledu {from, to, kind}, dt = souhrn dlužníků (kolekce debtors, bez částek), dtErr = chyba načtení.
// Měsíční příspěvky jsou předpisy v ch (kind "contrib"), platy jsou výdaje v cs (id sal_RRRR-MM_tid).

export const S={pl:[],ma:[],def:{},tab:"ev",mid:null,ready:false,err:null,db:null,M:null,pick:null,showLu:false,per:1,cf:null,pf:"act",pq:"all",fo:false,pickAll:false,showNom:false,showOp:false,op:[],oid:null,step:1,lv:false,qa:null,lmenu:false,rpShots:true,rpSubs:true,lsub:null,rp:false,ed:null,injp:null,wd:{},wl:null,ev:[],at:[],tr:[],ch:[],cs:[],au:[],ec:[],cc:{},payErr:null,evErr:null,evid:null,evp:null,evm:"up",evc:null,evd:null,evf:null,evr:null,evBack:null,tm:"team",ao:null,dt:[],dtErr:null};
