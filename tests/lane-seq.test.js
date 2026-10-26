// Testy v22.0 K-T4: řada cvičení v lince (seq) – normalizace plánu, časy a poloha v řadě, kontrola plánu, virtuální linky
// pro hodnocení / měření / pokrytí, živý trénink (laneSub) a sloučení uložení se změnou jiného trenéra (mergePlan).

// ===== Importy =====
import test from "node:test";
import assert from "node:assert/strict";
import {drillUsage, expandLanes, laneSeq, mergePlan, planDoc, planIssues, seqLid, seqMinutes, seqOk, seqStart, seqStep, seqTimes} from "../src/domain/training-plan.js";
import {evalLanes} from "../src/domain/training-eval.js";
import {measLanes, msKey} from "../src/domain/stopwatch.js";
import {groupSkills} from "../src/domain/skill-coverage.js";
import {laneSub, liveAt} from "../src/domain/training-live.js";

// ===== Konstanty =====
const D = {a: {name: "Bruslení skills", dur: 6, sk: ["skate"]}, b: {name: "Stickhandling", dur: 5, sk: ["stick"], meas: {u: "s", low: true}},
  g1: {name: "Posun v brankovišti", dur: 3, sk: ["gk"]}, g2: {name: "Vyrážečka", dur: 4, sk: ["gk"]}};
// Blok 15 min Společně: linka hráček (2 cvičení) + souběžná linka brankářek (3 cvičení)
const blk = () => ({id: "b1", mode: "all", dur: 15, rot: null, lanes: [
  {id: "l1", drill: "a", dn: "", di: [], co: ["t1"], grp: [], seq: [{id: "s1", drill: "a", dur: 8}, {id: "s2", drill: "b", dur: 7}]},
  {id: "l2", drill: "g1", dn: "", di: [], co: ["t2"], grp: ["G"], seq: [{id: "s3", drill: "g1", dur: 3}, {id: "s4", drill: "g2", dur: 4}, {id: "s5", drill: "g1", dur: 5}]}]});
const plan = () => planDoc({goal: "", blocks: [blk()]}, D);

// ===== Normalizace =====
test("planDoc: řada se zachová, cvičení linky = první cvičení řady, kopie názvu z banky", () => {
  const p = plan(), [l1, l2] = p.blocks[0].lanes;
  assert.equal(l1.seq.length, 2);
  assert.equal(l1.drill, "a"); assert.equal(l1.dn, "Bruslení skills");
  assert.equal(l1.seq[1].dn, "Stickhandling");
  assert.equal(l2.seq.length, 3); assert.equal(l2.drill, "g1");
});
test("planDoc: točící se stanoviště řadu nemá, 🥅 linka stanovišť ano; meze délky a počtu", () => {
  const p = planDoc({blocks: [{id: "b", mode: "st", dur: 20, lanes: [
    {id: "x", drill: "a", grp: [1], seq: [{id: "q", drill: "a", dur: 5}]}, {id: "y", drill: "b", grp: [2]},
    {id: "z", drill: "g1", grp: ["G"], seq: Array.from({length: 12}, (_, i) => ({id: "s" + i, drill: "g1", dur: i ? 2 : 999}))}]}]}, D);
  const L = p.blocks[0].lanes;
  assert.equal(L[0].seq, undefined);
  assert.equal(L[2].seq.length, 8);
  assert.equal(L[2].seq[0].dur, 90);
  assert.equal(seqOk(p.blocks[0], L[0]), false); assert.equal(seqOk(p.blocks[0], L[2]), true);
});
test("seqStart: dosavadní cvičení linky je první, za ním prázdné", () => {
  const q = seqStart({dur: 12}, {drill: "a", dn: "Bruslení skills", di: []});
  assert.equal(q.length, 2); assert.equal(q[0].drill, "a"); assert.equal(q[0].dur, 7); assert.equal(q[1].drill, "");
});

// ===== Časy a poloha =====
test("seqTimes / seqStep: cvičení za sebou od začátku bloku, volno po řadě, přesah se zkrátí", () => {
  const b = plan().blocks[0], l = b.lanes[1];
  assert.deepEqual(seqTimes(b, l.seq).map(x => [x.a, x.b]), [[0, 180], [180, 420], [420, 720]]);
  const s = seqStep(b, l, 200);
  assert.equal(s.i, 1); assert.equal(s.left, 220); assert.equal(s.nx.id, "s5");
  const v = seqStep(b, l, 800);
  assert.equal(v.it, null); assert.equal(v.i, 3); assert.equal(v.left, 100);
  const short = {...b, dur: 5};
  assert.deepEqual(seqTimes(short, l.seq).map(x => [x.a, x.b]), [[0, 180], [180, 300]]);
  assert.equal(seqStep(b, {id: "n", grp: [], drill: "a"}, 10), null);
});
test("laneSub: odpočet podle cvičení mé linky, nejvýš do konce kola", () => {
  const p = plan(), at = liveAt(p.blocks, 200);
  const s = laneSub(p.blocks[0], ["l2"], at);
  assert.equal(s.lid, "l2"); assert.equal(s.i, 1); assert.equal(s.left, 220);
  assert.equal(laneSub(p.blocks[0], ["l1"], at).i, 0);
  assert.equal(laneSub(p.blocks[0], [], at), null);
});

// ===== Kontrola =====
test("planIssues: řada delší než blok = chyba, kratší = volno, cvičení bez výběru = upozornění", () => {
  const p = plan();
  p.blocks[0].lanes[1].seq[2].dur = 9;
  p.blocks[0].lanes[0].seq[1].drill = "";
  const I = planIssues(p, {total: 15, groups: ["G"]}).map(x => x.lvl + ":" + x.t);
  assert.ok(I.some(t => t.startsWith("err:") && t.includes("16 min, blok jen 15")));
  assert.ok(I.some(t => t.startsWith("warn:") && t.includes("2. cvičení řady bez cvičení")));
  p.blocks[0].lanes[1].seq[2].dur = 2;
  assert.ok(planIssues(p, {total: 15, groups: ["G"]}).some(x => x.lvl === "warn" && x.t.includes("zbývá 6 min volna")));
  assert.equal(seqMinutes(p.blocks[0].lanes[0].seq), 15);
});

// ===== Virtuální linky =====
test("expandLanes / evalLanes / measLanes: každé cvičení řady má vlastní klíč blok_linka-cvičení", () => {
  const p = plan(), E = expandLanes(p.blocks[0]);
  assert.equal(E.length, 5);
  assert.equal(E[1].id, seqLid("l1", "s2")); assert.equal(E[1].pid, "l1"); assert.equal(E[1].min, 7);
  const ev = evalLanes(p, D);
  assert.equal(ev.length, 5);
  assert.equal(ev[1].key, msKey("b1", "l1-s2")); assert.equal(ev[1].li, 0); assert.ok(ev[1].where.endsWith("· 2/2"));
  assert.equal(ev[3].li, 1); assert.ok(ev[3].where.includes("3"));
  const ms = measLanes(p, D, null);
  assert.deepEqual(ms.map(x => x.key), [msKey("b1", "l1-s2")]);
});
test("groupSkills: minuty po cvičeních řady (hráčky linka 1, brankářky linka 🥅)", () => {
  const p = plan(), sk = groupSkills(p, 1, D, "F"), gk = groupSkills(p, "G", D, "G");
  assert.equal(sk.skate, 8); assert.equal(sk.stick, 7);
  assert.equal(gk.gk, 12);
});
test("drillUsage: počítá i cvičení řady", () => {
  const u = drillUsage([plan()]);
  assert.equal(u.g2, 1); assert.equal(u.b, 1);
});

// ===== Sloučení =====
test("mergePlan: bez změny jiného trenéra beze změny", () => {
  const p = plan(), r = mergePlan(p, {...p, at: "1"}, "1", true, []);
  assert.equal(r.merged, false); assert.equal(r.p, p);
});
test("mergePlan: trenér brankářek měnil jen řadu → plán hlavního trenéra + jeho řada", () => {
  const base = {...plan(), at: "1"}, fresh = {...plan(), at: "2"};
  fresh.blocks[0].dur = 20;                                       // hlavní trenér mezitím prodloužil blok
  const mine = plan();
  mine.blocks[0].lanes[1].seq = [{id: "s9", drill: "g2", dn: "Vyrážečka", di: [], dur: 15}];
  const r = mergePlan(mine, fresh, base.at, false, ["l2"]);
  assert.equal(r.merged, true); assert.equal(r.lost, false);
  assert.equal(r.p.blocks[0].dur, 20);
  assert.equal(r.p.blocks[0].lanes[1].seq[0].id, "s9"); assert.equal(r.p.blocks[0].lanes[1].drill, "g2");
  assert.equal(r.p.blocks[0].lanes[0].seq.length, 2);
});
test("mergePlan: hlavní trenér měnil bloky → jeho plán, ale řady cizích linek z uložené verze", () => {
  const fresh = {...plan(), at: "2"};
  fresh.blocks[0].lanes[1].seq = [{id: "s9", drill: "g2", dn: "Vyrážečka", di: [], dur: 10}];
  fresh.blocks[0].lanes[1].drill = "g2";
  const mine = plan();
  mine.blocks[0].dur = 18;
  const r = mergePlan(mine, fresh, "1", true, ["l1"]);
  assert.equal(r.lost, true);
  assert.equal(r.p.blocks[0].dur, 18);
  assert.equal(r.p.blocks[0].lanes[1].seq[0].id, "s9"); assert.equal(r.p.blocks[0].lanes[1].drill, "g2");
  assert.equal(laneSeq(r.p.blocks[0], r.p.blocks[0].lanes[0]).length, 2);
});
