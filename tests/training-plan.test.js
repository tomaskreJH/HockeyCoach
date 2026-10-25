// Testy plánu tréninku (src/domain/training-plan.js), obrázků cvičení (src/domain/drills.js), práv modulu trplan
// (domain/permissions.js) a pravidel kolekcí trplan a drillimg (kontrola textu firestore.rules). Čisté funkce – nic se nezapisuje.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CAN_ACTS, DEFAULT_PERMS, ROLE_KEYS, actOf, isEditable, permOf} from "../src/domain/permissions.js";
import {DRILLIMG_COLL, IMG_LEN, IMG_MAX, drillCopy, drillDoc, drillError, imgChanges, imgDoc, imgFit} from "../src/domain/drills.js";
import {GK, PLAN_MAX, TRPLAN_COLL, blockBlank, clock, drillUsage, evenLines, hm2min, laneOf, moveBlock, myGroup, planDoc, planGroups, planIssues, planMinutes, planTimes, rotation} from "../src/domain/training-plan.js";

// ===== Pomocná data =====
const lane = (id, grp, extra = {}) => ({id, drill: "d1", dn: "Osmičky", di: [], co: [], grp, ...extra});
const ST = {id: "s", mode: "st", dur: 15, rot: null, lanes: [lane("A", [1]), lane("B", [2]), lane("C", [3]), lane("G", [GK])]};
const ALL = {id: "w", mode: "all", dur: 10, rot: null, lanes: [lane("X", [])]};
const D = {d1: {name: "Osmičky", img: ["i1"]}, d2: {name: "Střelba", arch: true}};

// ===== Skupiny =====
test("planGroups: pětky s přihlášenými hráčkami vzestupně, brankářky jako G na konci", () => {
  assert.deepEqual(planGroups({a: 2, b: 1, c: 2, "t:x": 4}, ["a", "b", "c"], ["g"]), [1, 2, GK]);
  assert.deepEqual(planGroups({a: 3}, ["a", "z"], []), [3], "hráčka bez pětky skupinu nevytvoří");
  assert.deepEqual(planGroups(null, [], []), []);
});

test("evenLines: střídavě do n pětek v pořadí soupisky, realizační tým zůstane", () => {
  const isTr = k => k.startsWith("t:");
  assert.deepEqual(evenLines(["a", "b", "c", "d", "e"], 2, {"t:x": 3, a: 4}, isTr), {a: 1, b: 2, c: 1, d: 2, e: 1, "t:x": 3});
  assert.deepEqual(evenLines(["a", "b", "c"], 9, {}, isTr), {a: 1, b: 2, c: 3}, "nejvýš 4 pětky");
  assert.deepEqual(evenLines([], 3, null, isTr), {});
});

// ===== Úprava plánu =====
test("blockBlank: Společně s jednou linkou, Stanoviště se skupinami na dvou linkách a vlastní linkou brankářek", () => {
  const a = blockBlank("all", [1, 2]);
  assert.equal(a.mode, "all"); assert.equal(a.lanes.length, 1); assert.equal(a.dur, 10);
  const s = blockBlank("st", [1, 2, 3, GK]);
  assert.equal(s.mode, "st"); assert.equal(s.dur, 20);
  assert.deepEqual(s.lanes.map(l => l.grp), [[1, 3], [2], [GK]]);
});

test("planDoc: jen známá pole, meze délek, kopie názvu a obrázků z banky, skupiny bez opakování", () => {
  const p = planDoc({goal: "  Přihrávky  ", x: 1, blocks: [
    {id: "b1", mode: "st", dur: 200, rot: 5, lanes: [{id: "l1", drill: "d1", grp: [2, "2", 1, "Z", GK], co: ["t1", "t1", ""]}]},
    {id: "b2", mode: "??", dur: "x", lanes: [{id: "l2", drill: "gone", dn: "Staré", di: ["q"], grp: [GK, 1]}]}
  ]}, D);
  assert.deepEqual(Object.keys(p), ["v", "goal", "blocks"]);
  assert.equal(p.goal, "Přihrávky");
  assert.equal(p.blocks[0].dur, 90); assert.equal(p.blocks[0].rot, 5);
  assert.deepEqual(p.blocks[0].lanes[0], {id: "l1", drill: "d1", dn: "Osmičky", di: ["i1"], co: ["t1"], grp: [1, 2, GK]});
  assert.equal(p.blocks[1].mode, "all"); assert.equal(p.blocks[1].dur, 10); assert.equal(p.blocks[1].rot, null);
  assert.equal(p.blocks[1].lanes[0].dn, "Staré", "smazané cvičení: zůstane kopie názvu");
  assert.deepEqual(p.blocks[1].lanes[0].grp, [1, GK], "linka brankářek u Společně zůstane");
  assert.equal(planDoc({blocks: Array.from({length: 40}, () => ALL)}).blocks.length, PLAN_MAX.blocks);
  assert.equal(planDoc({blocks: [{...ST, rot: 99}]}).blocks[0].rot, null, "točení delší než blok = automaticky");
});

test("moveBlock a drillUsage", () => {
  const B = [{id: 1}, {id: 2}, {id: 3}];
  assert.deepEqual(moveBlock(B, 2, -1).map(b => b.id), [2, 1, 3]);
  assert.deepEqual(moveBlock(B, 3, 1).map(b => b.id), [1, 2, 3], "mimo rozsah beze změny");
  assert.deepEqual(drillUsage([{blocks: [ST, ALL]}, {blocks: [{lanes: [lane("x", [], {drill: "d2"})]}]}]), {d1: 1, d2: 1});
});

// ===== Časy a točení =====
test("časy: bloky za sebou od začátku, minuty plánu, hodiny s vteřinami jen když nejsou nulové", () => {
  assert.deepEqual(planTimes([ALL, ST]), [{id: "w", a: 0, b: 600}, {id: "s", a: 600, b: 1500}]);
  assert.equal(planMinutes([ALL, ST]), 25);
  assert.equal(hm2min("17:30"), 1050); assert.equal(hm2min("x"), null);
  assert.equal(clock(1050, 600), "17:40");
  assert.equal(clock(1050, 150), "17:32:30");
});

test("rotation: počet kol = počet točících se linek, skupiny se posouvají o stanoviště, brankářky stojí", () => {
  const r = rotation(ST);
  assert.equal(r.length, 3);
  assert.deepEqual(r.map(x => [x.a, x.b]), [[0, 300], [300, 600], [600, 900]]);
  assert.deepEqual(r[0].lanes, {A: [1], B: [2], C: [3], G: [GK]});
  assert.deepEqual(r[1].lanes, {B: [1], C: [2], A: [3], G: [GK]});
  assert.deepEqual(r[2].lanes, {C: [1], A: [2], B: [3], G: [GK]});
  // Každá skupina projde každým stanovištěm právě jednou
  [1, 2, 3].forEach(g => assert.deepEqual(r.map(x => Object.keys(x.lanes).find(k => x.lanes[k].includes(g))).sort(), ["A", "B", "C"]));
});

test("rotation: točení po zvolených minutách (poslední kolo do konce bloku), Společně jedno kolo", () => {
  const r = rotation({...ST, dur: 16, rot: 5});
  assert.equal(r.length, 3);
  assert.deepEqual(r.map(x => [x.a, x.b]), [[0, 300], [300, 600], [600, 960]]);
  const a = rotation(ALL);
  assert.equal(a.length, 1); assert.deepEqual(a[0], {a: 0, b: 600, lanes: {X: []}});
});

// ===== Kontrola =====
test("planIssues: přetečení, kolize trenérů, skupina na dvou linkách, skupina bez stanoviště, nepřihlášený trenér", () => {
  const txt = (p, c) => planIssues(p, c).map(x => x.lvl + ":" + x.t);
  assert.deepEqual(txt({blocks: [ALL, ST]}, {total: 25, groups: [1, 2, 3, GK]}), []);
  assert.match(txt({blocks: [ALL, ST]}, {total: 20})[0], /^err:Plán přesahuje konec tréninku o 5 min/);
  assert.match(txt({blocks: [ALL]}, {total: 60})[0], /^warn:Nenaplánováno zbývá 50 min/);
  const clash = {...ST, lanes: [lane("A", [1], {co: ["t1"]}), lane("B", [2, 1], {co: ["t1"]})]};
  const I = txt({blocks: [clash]}, {groups: [1, 2, 3], coaches: ["t2"]});
  assert.ok(I.some(x => /^err:Blok 1: stejný trenér/.test(x)));
  assert.ok(I.some(x => /^err:Blok 1: 1\. pětka je na dvou linkách/.test(x)));
  assert.ok(I.some(x => /^warn:Blok 1: 3\. pětka není na žádném stanovišti/.test(x)));
  assert.ok(I.some(x => /trenér není přihlášený/.test(x)));
  assert.ok(txt({blocks: [{...ALL, lanes: [lane("X", [], {drill: ""})]}]}, {}).some(x => /bez cvičení/.test(x)));
  assert.ok(txt({blocks: [{...ALL, lanes: [lane("X", [], {drill: "d2", dn: "Střelba"})]}]}, {drills: D}).some(x => /už v bance není/.test(x)));
  assert.ok(txt({blocks: [{...ST, rot: 5, dur: 10}]}, {groups: [1, 2, 3, GK]}).some(x => /neprojdou všechna stanoviště/.test(x)));
  assert.ok(txt({blocks: [ST]}, {groups: [1, 2, 3]}).some(x => /žádná brankářka není přihlášená/.test(x)));
});

// ===== Hráčka =====
test("myGroup a laneOf: brankářka G, hráčka podle pětky; Společně bez skupin = všichni", () => {
  assert.equal(myGroup({a: 2}, "a", false), 2);
  assert.equal(myGroup({a: 2}, "a", true), GK);
  assert.equal(myGroup({}, "a", false), null);
  const r = rotation(ST);
  assert.equal(laneOf(ST, r[1], 1), "B");
  assert.equal(laneOf(ST, r[1], GK), "G");
  assert.equal(laneOf(ALL, rotation(ALL)[0], 4), "X");
  assert.equal(laneOf(ST, r[0], 4), null);
});

// ===== Obrázky cvičení =====
test("obrázky: zmenšení s poměrem stran, dokument jen z data:URL v limitu, změny při uložení, PDF a nejvýš 3 obrázky", () => {
  assert.deepEqual(imgFit(4000, 3000, 1280), {w: 1280, h: 960});
  assert.deepEqual(imgFit(600, 800, 1280), {w: 600, h: 800}, "malý se nezvětšuje");
  assert.equal(imgDoc("data:image/jpeg;base64,AAAA", "d1", 10, 20, "a@b.cz", "t").did, "d1");
  assert.equal(imgDoc("javascript:x", "d1"), null);
  assert.equal(imgDoc("data:image/jpeg;base64," + "A".repeat(IMG_LEN), "d1"), null);
  assert.deepEqual(imgChanges(["a", "b"], ["b", "c"]), {del: ["a"]});
  const ok = {name: "A", cat: "skill", sk: ["shot"], dur: 10};
  assert.match(drillError({...ok, pdf: "file:///x.pdf"}), /PDF/);
  assert.match(drillError({...ok, img: ["a", "b", "c", "d"]}), /Nejvýš 3/);
  const d = drillDoc({...ok, pdf: "https://drive.google.com/x", img: ["a", "a", "b/../c", "c", "d", "e"]});
  assert.equal(d.pdf, "https://drive.google.com/x");
  assert.deepEqual(d.img, ["a", "c", "d"]);
  assert.equal(d.img.length <= IMG_MAX, true);
  assert.deepEqual(drillCopy({...ok, img: ["a"]}).img, [], "kopie bez obrázků původního cvičení");
  assert.equal(DRILLIMG_COLL, "drillimg"); assert.equal(TRPLAN_COLL, "trplan");
});

// ===== Testy práv =====
test("práva trplan: trenér a asistent číst a upravovat (upravovat jde měnit), hráčka jen číst, hostující nic", () => {
  ["trener", "asistent"].forEach(r => {
    assert.deepEqual(DEFAULT_PERMS[r].trplan, {r: true, e: true, c: false, d: false});
    assert.equal(isEditable(r, "trplan", "e"), true);
    assert.equal(isEditable(r, "trplan", "r"), false);
  });
  assert.deepEqual(DEFAULT_PERMS.hracka.trplan, {r: true, e: false, c: false, d: false});
  assert.equal(isEditable("hracka", "trplan", "r"), false);
  assert.equal(permOf("host", "trplan", "r", {}), false);
  assert.equal(permOf("manager", "trplan", "e", {}), true);
  assert.equal(permOf("asistent", "trplan", "e", {asistent: {trplan: {e: false}}}), false);
});

test("srovnání: modul trplan nemění zkratky HK.can", () => {
  const F = {trener: {trplan: {e: false}}, asistent: {trplan: {e: false}}};
  ROLE_KEYS.forEach(r => [false, true].forEach(c => CAN_ACTS.forEach(a => assert.equal(actOf(r, c, a, false, F), actOf(r, c, a, false), r + " " + a))));
});

// ===== Testy pravidel =====
test("pravidla: trplan podle matice (číst r, zapisovat e se známými poli), drillimg čte tým a zapisuje úprava banky", () => {
  const R = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const block = name => { const i = R.indexOf("match /" + name + "/{id}"); assert.ok(i > 0, "chybí match /" + name); return R.slice(i, R.indexOf("\n    }", i)); };
  const tp = block("trplan");
  assert.match(tp, /allow read: if can\('trplan', 'r'\);/);
  assert.match(tp, /allow create, update: if can\('trplan', 'e'\) && trplanOk\(request\.resource\.data\);/);
  assert.match(tp, /allow delete: if can\('trplan', 'e'\);/);
  assert.match(R, /function trplanOk\(d\) \{\s+return d\.keys\(\)\.hasOnly\(\['v', 'goal', 'blocks', 'by', 'at'\]\)/);
  const im = block("drillimg");
  assert.match(im, /allow read: if isTeam\(\);/);
  assert.match(im, /allow create, update: if can\('drills', 'e'\) && imgOk\(request\.resource\.data\);/);
  assert.match(im, /allow delete: if can\('drills', 'e'\);/);
  assert.match(R, /d\.d\.size\(\) <= 700000/);
  assert.equal(IMG_LEN, 700000, "limit obrázku v aplikaci = limit v pravidlech");
  assert.match(R, /'pdf', 'img', 'meas'/);
});
