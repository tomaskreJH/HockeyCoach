// Neměnné konstanty aplikace: pozice, důvody trestů, rozložení formací a jednotek.

export const POS=["Útočnice","Obránkyně","Brankářka"];
export const LN=[1,2,3,4];
export const SL=["LK","C","PK","LO","PO"];
export const REA=["Hákování","Držení","Podražení","Vysoká hůl","Hrubost","Zdržování hry","Příliš mnoho hráčů","Nesportovní chování","Jiné"];
export const SIT={E:"5 na 5",PP:"Přesilovka",SH:"Oslabení"};
export const ST={act:"Aktivní",inj:"Zraněný",end:"Ukončil"};
export const COLS=["LK","C","PK","LO","PO"];
// jednotky pro přesilovku / oslabení
export const UK=["PP1","PP2","SH1","SH2","SH3","SH4"];
export const USLOT={PP1:COLS,PP2:COLS,SH1:["C","LK","LO","PO"],SH2:["C","LK","LO","PO"],SH3:["C","LO","PO"],SH4:["C","LO","PO"]};
export const ULAB={PP1:"Přesilovka 1",PP2:"Přesilovka 2",SH1:"Oslabení 4 hráčky – 1",SH2:"Oslabení 4 hráčky – 2",SH3:"Oslabení 3 hráčky – 1",SH4:"Oslabení 3 hráčky – 2"};
export const UGRP=k=>k[0]==="P"?["PP1","PP2"]:(k==="SH1"||k==="SH2")?["SH1","SH2"]:["SH3","SH4"];
export const slab=(k,c)=>(k==="SH1"||k==="SH2")&&c==="LK"?"Ú":c;
export const LAYOUT=n=>n>=5?COLS:n===4?["C","LK","LO","PO"]:["C","LO","PO"];
