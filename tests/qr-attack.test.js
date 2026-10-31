// Útokový test QR platby (v22.23): může hráčka (nebo jiný člen) v rámci aplikace podvrhnout účet, částku nebo VS v QR kódu?
// Firestore emulátor v prostředí vývoje nejde stáhnout, proto test drží věrný model pravidel settings/cash, members a charges
// (stejné výrazy jako firestore.rules) a hlídá, že text pravidel se od modelu neodchýlil (synchronizační kontrola).
// Druhá část zkouší podvrh přímo v kódu QR (SPD): vložení pole *ACC: přes zprávu, VS s písmeny, neplatný účet.
// Struktura: Importy -> Konstanty -> Model pravidel -> Pomocné funkce -> Testy.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {accCheck, accCode, pairCode, parseAcc} from "../src/domain/bank-account.js";
import {accIban, accOf, cashCfg, spdPay} from "../src/domain/cash.js";

// ===== Konstanty =====
const RULES = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
const A = parseAcc("19-2000145399/0800").iban;          // platný účet týmu (hlavní)
const B = parseAcc("115-2000145399/0800").iban;         // platný účet týmu (provozní)
const EVIL = parseAcc("2000145399/0800").iban;          // platný, ale cizí účet útočníka
const MGR = "mgr@x.cz", MGR2 = "dummy@x.cz", CASHP = "pokl@x.cz", PL = "hracka@x.cz", HOST = "host@x.cz", TR = "trener@x.cz";
// Členové: role + příznak cash (pokladník); hráčka-pokladník je role hracka s cash
const MEMBERS = {
  [MGR]: {role: "manager"}, [CASHP]: {role: "hracka", cash: true, pid: "p2"}, [PL]: {role: "hracka", pid: "p1"},
  [HOST]: {role: "host", pid: "p9"}, [TR]: {role: "trener"}, [MGR2]: {role: "trener", cash: true}
};

// ===== Model pravidel (zrcadlo firestore.rules) =====
const get = (o, k, d) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : d);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function ctx(email, members = MEMBERS) {
  const m = members[email];
  const isMember = !!m, role = m && m.role;
  return {
    mail: email, isMember,
    isMgr: isMember && role === "manager",
    isCash: isMember && (role === "manager" || (role !== "host" && get(m, "cash", false) === true))
  };
}
const codeOk = c => typeof c === "string" && /^[0-9A-F]{4}-[0-9A-F]{4}( [0-9A-F]{4}-[0-9A-F]{4})?$/.test(c);
const ACC_F = ["iban", "iban2", "ibanBy", "ibanOk", "ibanAt", "ibanCode"];
function cashSettingsUpdate(c, oldD, newD) {
  const sNew = k => get(newD, k, ""), sOld = k => get(oldD, k, "");
  const pendNew = get(newD, "ibanPend", null), pendOld = get(oldD, "ibanPend", null);
  const accSame = ACC_F.every(k => sNew(k) === sOld(k));
  const pendByMe = pendNew != null && c.isMgr && pendNew.by === c.mail && codeOk(get(pendNew, "code", ""));
  return c.isCash && (
    (accSame && eq(pendNew, pendOld))
    || (accSame && pendNew == null)
    || (accSame && pendByMe)
    || (pendOld != null && pendNew == null && pendOld.by !== c.mail && codeOk(get(pendOld, "code", ""))
        && sNew("iban") === get(pendOld, "iban", "") && sNew("iban2") === get(pendOld, "iban2", "")
        && sNew("ibanBy") === pendOld.by && sNew("ibanOk") === c.mail && sNew("ibanCode") === get(pendOld, "code", "")));
}
function cashSettingsCreate(c, newD) {
  const sNew = k => get(newD, k, ""), pendNew = get(newD, "ibanPend", null);
  const pendByMe = pendNew != null && c.isMgr && pendNew.by === c.mail && codeOk(get(pendNew, "code", ""));
  return c.isCash && ["iban", "iban2", "ibanBy", "ibanOk", "ibanAt", "ibanCode"].every(k => sNew(k) === "") && (pendNew == null || pendByMe);
}
// members: manager vše; pokladník jen cizí dokument s rolí hracka před i po změně
function memberWrite(c, email, oldD, newD) {
  const cashier = d => c.isCash && email !== c.mail && d && d.role === "hracka";
  if (c.isMgr) return true;
  return oldD ? cashier(newD) && cashier(oldD) : cashier(newD);
}
// charges (částka, VS, zpráva, účet acc): zapisuje jen správce pokladny
const chargeWrite = c => c.isCash;

// ===== Pomocné funkce =====
const BASE = {iban: A, iban2: B, ibanBy: MGR, ibanOk: CASHP, ibanAt: "2026-10-01", ibanCode: pairCode(A, B), inst: true};
const prop = (by, iban, iban2 = "", code = pairCode(iban, iban2)) => ({iban, iban2, code, by, at: "2026-10-31"});
const confirmDoc = (old, me) => ({...old, iban: old.ibanPend.iban, iban2: old.ibanPend.iban2, ibanBy: old.ibanPend.by, ibanOk: me, ibanAt: "2026-10-31", ibanCode: old.ibanPend.code, ibanPend: undefined});
const strip = d => JSON.parse(JSON.stringify(d));     // ibanPend: undefined = smazané pole
const upd = (email, oldD, newD) => cashSettingsUpdate(ctx(email), strip(oldD), strip(newD));

// ===== Synchronizace modelu s firestore.rules =====
test("model odpovídá firestore.rules (klíčové výrazy pravidel beze změny)", () => {
  [
    "function isCash() { return isMember() && (role() == 'manager' || (role() != 'host' && get(memberPath()).data.get('cash', false) == true)); }",
    "function codeOk(c) { return c is string && c.matches('^[0-9A-F]{4}-[0-9A-F]{4}( [0-9A-F]{4}-[0-9A-F]{4})?$'); }",
    "function accSame() { return sNew('iban') == sOld('iban') && sNew('iban2') == sOld('iban2') && sNew('ibanBy') == sOld('ibanBy') && sNew('ibanOk') == sOld('ibanOk') && sNew('ibanAt') == sOld('ibanAt') && sNew('ibanCode') == sOld('ibanCode'); }",
    "function pendByMe() { return pendNew() != null && isMgr() && pendNew().by == mail() && codeOk(pendNew().get('code', '')); }",
    "(accSame() && pendNew() == pendOld())",
    "|| (accSame() && pendNew() == null)",
    "|| (accSame() && pendByMe())",
    "&& pendOld().by != mail()",
    "&& sNew('ibanBy') == pendOld().by && sNew('ibanOk') == mail()",
    "&& sNew('ibanCode') == pendOld().get('code', '')));",
    "function cashierMember(email, d) { return isCash() && email != mail() && d.role == 'hracka'; }",
    "allow update: if isMgr() || (cashierMember(email, request.resource.data) && cashierMember(email, resource.data));",
    "allow create: if id == 'cash' ? cashSettingsCreate()",
    "allow delete: if id != 'cash' && id != 'app' && id != 'beta'",
    "match /charges/{id} {\n      allow read: if isCash() || ownsMid(resource.data.mid);\n      allow write: if isCash();"
  ].forEach(s => assert.ok(RULES.includes(s), "pravidla se změnila, uprav model testu: " + s.slice(0, 70)));
});

// ===== Útoky hráčky (role hracka bez příznaku cash) =====
test("hráčka: nezmění účet přímo, nepodá návrh, nepotvrdí cizí návrh a nezaloží nastavení pokladny", () => {
  assert.equal(upd(PL, BASE, {...BASE, iban: EVIL}), false, "přímý přepis účtu");
  assert.equal(upd(PL, BASE, {...BASE, ibanPend: prop(PL, EVIL)}), false, "vlastní návrh");
  const withPend = {...BASE, ibanPend: prop(MGR, EVIL)};
  assert.equal(upd(PL, withPend, confirmDoc(withPend, PL)), false, "potvrzení návrhu");
  assert.equal(upd(PL, BASE, {...BASE, inst: false}), false, "ani běžné nastavení");
  assert.equal(cashSettingsCreate(ctx(PL), {ibanPend: prop(PL, EVIL)}), false, "založení dokumentu s návrhem");
});
test("hráčka: nedá si roli ani příznak pokladníka a nezmění předpis (částka, VS, účet acc)", () => {
  const c = ctx(PL);
  assert.equal(memberWrite(c, PL, MEMBERS[PL], {...MEMBERS[PL], cash: true}), false, "vlastní cash");
  assert.equal(memberWrite(c, PL, MEMBERS[PL], {...MEMBERS[PL], role: "manager"}), false, "vlastní role");
  assert.equal(memberWrite(c, "nova@x.cz", null, {role: "hracka", cash: true}), false, "druhý účet jako pokladník");
  assert.equal(chargeWrite(c), false, "předpis");
});
test("hostující hráčka: stejně jako hráčka nic nezmění (isCash je pro roli host vždy false, i s cash)", () => {
  const c = ctx(HOST, {...MEMBERS, [HOST]: {role: "host", cash: true}});
  assert.equal(c.isCash, false);
  assert.equal(cashSettingsUpdate(c, BASE, {...BASE, iban: EVIL}), false);
  assert.equal(chargeWrite(c), false);
});
test("trenér bez příznaku cash: k účtům ani předpisům nemá přístup", () => {
  assert.equal(upd(TR, BASE, {...BASE, ibanPend: prop(TR, EVIL)}), false);
  assert.equal(chargeWrite(ctx(TR)), false);
});

// ===== Útoky hráčky-pokladníka (role hracka + cash) =====
test("hráčka-pokladník: nenavrhne účet (jen manager) a nezmění účet přímo ani s kódem", () => {
  assert.equal(upd(CASHP, BASE, {...BASE, ibanPend: prop(CASHP, EVIL)}), false, "návrh");
  assert.equal(upd(CASHP, BASE, {...BASE, iban: EVIL, ibanCode: pairCode(EVIL, B)}), false, "přímý přepis");
  assert.equal(upd(CASHP, BASE, {...BASE, ibanCode: "0000-0000"}), false, "samotný kód");
});
test("hráčka-pokladník: potvrdí jen přesně návrh managera – podvrh účtu, kódu nebo autora při potvrzení neprojde", () => {
  const withPend = {...BASE, ibanPend: prop(MGR, EVIL, B)};
  assert.equal(upd(CASHP, withPend, confirmDoc(withPend, CASHP)), true, "řádné potvrzení");
  assert.equal(upd(CASHP, withPend, {...confirmDoc(withPend, CASHP), iban: parseAcc("2000145399/0100").iban || "CZ00"}), false, "jiný účet než v návrhu");
  assert.equal(upd(CASHP, withPend, {...confirmDoc(withPend, CASHP), ibanCode: pairCode(A, B)}), false, "starý kód k novému účtu");
  assert.equal(upd(CASHP, withPend, {...confirmDoc(withPend, CASHP), ibanBy: CASHP}), false, "přepsaný autor");
  assert.equal(upd(CASHP, withPend, {...confirmDoc(withPend, CASHP), ibanOk: MGR}), false, "cizí potvrzující");
});
test("hráčka-pokladník: návrh managera nezmění (podvrh účtu v čekajícím návrhu), smí ho jen zamítnout", () => {
  const withPend = {...BASE, ibanPend: prop(MGR, B)};
  assert.equal(upd(CASHP, withPend, {...BASE, ibanPend: {...prop(MGR, EVIL)}}), false, "přepsaný návrh pod jménem managera");
  assert.equal(upd(CASHP, withPend, {...BASE, ibanPend: {...withPend.ibanPend, iban: EVIL}}), false, "jen účet v návrhu");
  assert.equal(upd(CASHP, withPend, {...BASE}), true, "zamítnutí (účty zůstanou)");
});
test("hráčka-pokladník: nevyrobí si druhého pokladníka s vyšší rolí; pokladníka s rolí hracka ano (nemůže navrhovat)", () => {
  const c = ctx(CASHP);
  assert.equal(memberWrite(c, CASHP, MEMBERS[CASHP], {...MEMBERS[CASHP], role: "manager"}), false, "vlastní dokument");
  assert.equal(memberWrite(c, "nova@x.cz", null, {role: "manager"}), false, "nový manager");
  assert.equal(memberWrite(c, "nova@x.cz", null, {role: "trener", cash: true}), false, "nový trenér-pokladník");
  assert.equal(memberWrite(c, "nova@x.cz", null, {role: "hracka", cash: true}), true, "nová hráčka-pokladník (záměr)");
  const sock = {...MEMBERS, "nova@x.cz": {role: "hracka", cash: true}};
  assert.equal(cashSettingsUpdate(ctx("nova@x.cz", sock), BASE, {...BASE, ibanPend: prop("nova@x.cz", EVIL)}), false, "druhý účet ani tak nenavrhne");
});

// ===== Návrh managera a známá mez (4 oči) =====
test("manager: návrh pod svým jménem s kódem projde, pod cizím jménem nebo bez kódu ne; sám si ho nepotvrdí", () => {
  assert.equal(upd(MGR, BASE, {...BASE, ibanPend: prop(MGR, EVIL)}), true);
  assert.equal(upd(MGR, BASE, {...BASE, ibanPend: prop(CASHP, EVIL)}), false, "návrh pod jménem pokladníka");
  assert.equal(upd(MGR, BASE, {...BASE, ibanPend: {...prop(MGR, EVIL), code: ""}}), false, "bez kódu");
  const withPend = {...BASE, ibanPend: prop(MGR, EVIL)};
  assert.equal(upd(MGR, withPend, confirmDoc(withPend, MGR)), false, "vlastní potvrzení");
});
test("ZNÁMÁ MEZ: manager si může přidat druhý vlastní účet s cash a potvrdit se sám (pravidla to neodliší)", () => {
  const withPend = {...BASE, ibanPend: prop(MGR, EVIL)};
  assert.equal(memberWrite(ctx(MGR), MGR2, null, MEMBERS[MGR2]), true);
  assert.equal(upd(MGR2, withPend, confirmDoc(withPend, MGR2)), true);
});

// ===== Podvrh přímo v obsahu QR (SPD) =====
test("QR: zpráva ani VS nevloží druhé pole *ACC: (hvězdička se odfiltruje, VS jen číslice)", () => {
  const s = spdPay(A, 500, "12*ACC:" + EVIL, "zapas *ACC:" + EVIL + "*AM:1.00", true);
  assert.equal((s.match(/\*ACC:/g) || []).length, 1, s);
  assert.equal((s.match(/\*AM:/g) || []).length, 1, s);
  assert.ok(s.startsWith("SPD*1.0*ACC:" + A + "*AM:500.00*CC:CZK*X-VS:12"), s);
  assert.ok(!s.includes(EVIL + "*"), s);
});
test("QR: účet se bere jen z nastavení pokladny – předpis s acc = cizí IBAN spadne na účet týmu", () => {
  const cfg = cashCfg({iban: A, iban2: B});
  assert.equal(accIban(cfg, accOf({acc: EVIL, kind: "event"}, cfg)), B);
  assert.equal(accIban(cfg, accOf({acc: EVIL, kind: "contrib"}, cfg)), A);
  const tplCfg = cashCfg({iban: A, iban2: B, tpls: {x: {name: "x", acc: EVIL}}});
  assert.equal(tplCfg.tpls.x.acc, "op");
});
test("QR: neplatný nebo pozměněný účet neprojde kontrolou a kód účtu prozradí záměnu", () => {
  const bad = A.slice(0, -1) + ((+A.slice(-1) + 1) % 10);
  assert.equal(accCheck(bad), false);
  assert.equal(accCheck("CZ" + "0".repeat(22)), false);
  assert.notEqual(accCode(EVIL), accCode(A));
});
