// Sdílený stav aplikace (jediný zdroj pravdy za běhu).
// Události a docházka: ev = tréninky, at = odpovědi, evid = otevřená událost, evp = člen (hráčka nebo trenér), za kterého se zapisuje,
// evm = režim seznamu (up / past / cal / pay), evc = zobrazený měsíc, evd = vybraný den, evf = formulář, evr = okno s důvodem, evErr = chyba načtení.
// Realizační tým: tr = členové (kolekce staff).
// Pokladna (jen trenér a pokladník): ch = předpisy (charges), cs = příjmy a výdaje (cash), au = audit, cc = nastavení pokladny (settings/cash), payErr = chyba načtení.
// pay = staré platby (kolekce payments, jen pro migraci a mazání).

export const S={pl:[],ma:[],def:{},tab:"ev",mid:null,ready:false,err:null,db:null,M:null,pick:null,showLu:false,per:1,cf:null,pf:"act",pq:"all",fo:false,pickAll:false,showNom:false,showOp:false,op:[],oid:null,step:1,lv:false,qa:null,lmenu:false,rpShots:true,rpSubs:true,lsub:null,rp:false,ed:null,injp:null,wd:{},wl:null,ev:[],at:[],tr:[],pay:[],ch:[],cs:[],au:[],cc:{},payErr:null,evErr:null,evid:null,evp:null,evm:"up",evc:null,evd:null,evf:null,evr:null};