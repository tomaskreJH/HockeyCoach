// Testy přípravy na trénink pro hráčky (v22.20, src/domain/training-plan.js): kopie podrobností cvičení v plánu (dx – popis,
// pomůcky, video, PDF), jen u prvního výskytu, u řady na položkách řady; čtení planDetails a kontrola zastaralé kopie planDxStale.
import test from "node:test";
import assert from "node:assert/strict";
import {drillDx, planDetails, planDoc, planDxStale} from "../src/domain/training-plan.js";

const D = {
  d1: {id: "d1", name: "Bruslení", cat: "skate", lvl: "z", dur: 8, eq: "kužely", desc: "Osmičky kolem kruhů", url: "https://x/v.mp4", pdf: "", img: []},
  d2: {id: "d2", name: "Střelba", cat: "shot", lvl: "p", dur: 10, desc: "Z první"}
};
const lane = (id, drill, extra) => ({id, drill, dn: "", di: [], co: [], grp: [], ...(extra || {})});

test("drillDx: jen neprázdná pole, bez cvičení null", () => {
  assert.deepEqual(drillDx(D.d1), {cat: "skate", lvl: "z", dur: 8, eq: "kužely", desc: "Osmičky kolem kruhů", url: "https://x/v.mp4"});
  assert.equal(drillDx(null), null);
  assert.equal(drillDx({name: "x"}), null);
});
test("planDoc: podrobnosti u prvního výskytu, planDetails je najde", () => {
  const p = planDoc({blocks: [{id: "b1", mode: "all", dur: 10, lanes: [lane("l1", "d1")]}, {id: "b2", mode: "all", dur: 10, lanes: [lane("l2", "d1"), lane("l3", "d2")]}]}, D);
  assert.equal(p.blocks[0].lanes[0].dx.desc, "Osmičky kolem kruhů");
  assert.equal(p.blocks[1].lanes[0].dx, undefined, "druhý výskyt bez kopie");
  assert.deepEqual(Object.keys(planDetails(p)).sort(), ["d1", "d2"]);
  assert.equal(planDxStale(p, D), false);
  assert.equal(planDxStale(p, {...D, d2: {...D.d2, desc: "Jinak"}}), true, "změna v bance");
  assert.equal(planDxStale({blocks: [{lanes: [lane("l1", "d1")]}]}, D), true, "plán bez kopie");
});
test("planDoc: bez banky (hráčka / chybějící cvičení) se kopie zachová; řada nese podrobnosti na položkách", () => {
  const p = planDoc({blocks: [{id: "b1", mode: "all", dur: 10, lanes: [lane("l1", "d1")]}]}, D);
  assert.deepEqual(planDoc(p, {}).blocks[0].lanes[0].dx, p.blocks[0].lanes[0].dx);
  const s = planDoc({blocks: [{id: "b1", mode: "all", dur: 20, lanes: [lane("l1", "d1", {seq: [{id: "s1", drill: "d2", dur: 10}, {id: "s2", drill: "d1", dur: 10}]})]}]}, D);
  const l = s.blocks[0].lanes[0];
  assert.equal(l.dx, undefined, "linka s řadou bez vlastní kopie");
  assert.equal(l.seq[0].dx.desc, "Z první"); assert.equal(l.seq[1].dx.eq, "kužely");
  assert.deepEqual(Object.keys(planDetails(s)).sort(), ["d1", "d2"]);
});
