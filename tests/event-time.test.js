// Testy času události (domain/event-time.js): výchozí hodnoty ze settings/events, sraz a konec tréninku, texty pro zobrazení,
// pole formuláře; počty odpovědí (domain/event-helpers.js); přenos konce a srazu v sériích (domain/recurrence.js); pravidla settings.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {EVSET_DOC, EV_DEF, MEET_MAX, addMin, clampMin, defEnd, endOf, endOk, evDefaults, meetAt, meetOf, okTime, timeFields, timeParts} from "../src/domain/event-time.js";
import {answerCounts} from "../src/domain/event-helpers.js";
import {editPlan, manualChange, seriesOps} from "../src/domain/recurrence.js";

// ===== Pomocné funkce =====
const D = evDefaults({});
const tr = (time, more) => ({type: "training", time, ...more});
const ma = (time, more) => ({type: "match", time, ...more});

// ===== Výchozí hodnoty =====
test("evDefaults: bez dokumentu výchozí 30 / 60 / 60, neplatné hodnoty se nahradí, horní mez", () => {
  assert.deepEqual(D, {meetT: 30, meetM: 60, len: 60});
  assert.deepEqual(EV_DEF, {meetT: 30, meetM: 60, len: 60});
  assert.equal(EVSET_DOC, "settings/events");
  assert.deepEqual(evDefaults({meetT: 45, meetM: "90", len: 75}), {meetT: 45, meetM: 90, len: 75});
  assert.deepEqual(evDefaults({meetT: -5, meetM: "x", len: 0}), {meetT: 30, meetM: 60, len: 60});
  assert.equal(evDefaults({meetM: 999}).meetM, MEET_MAX);
  assert.equal(evDefaults({meetT: 0}).meetT, 0, "0 = bez srazu");
  assert.equal(clampMin("", 100, 7), 7);
  assert.equal(clampMin("12.6", 100, 7), 13);
});

// ===== Čas =====
test("okTime, addMin: platnost a posun přes půlnoc", () => {
  assert.equal(okTime("18:00"), true);
  assert.equal(okTime("8:05"), true);
  assert.equal(okTime("24:00"), false);
  assert.equal(okTime(""), false);
  assert.equal(addMin("18:00", -30), "17:30");
  assert.equal(addMin("0:15", -30), "23:45");
  assert.equal(addMin("23:30", 60), "00:30");
  assert.equal(addMin("", 10), "");
});

// ===== Sraz =====
test("meetOf / meetAt: uložený sraz, výchozí podle typu, 0 = bez srazu, bez začátku nic", () => {
  assert.equal(meetOf(tr("18:00"), D), 30);
  assert.equal(meetOf(ma("18:00"), D), 60);
  assert.equal(meetOf(tr("18:00", {meet: 45}), D), 45);
  assert.equal(meetAt(tr("18:00"), D), "17:30");
  assert.equal(meetAt(ma("18:00"), D), "17:00");
  assert.equal(meetAt(ma("18:00", {meet: 90}), D), "16:30");
  assert.equal(meetAt(tr("18:00", {meet: 0}), D), "");
  assert.equal(meetAt(tr(""), D), "");
  assert.equal(meetAt(tr("18:00"), evDefaults({meetT: 15})), "17:45", "výchozí ze settings/events");
});

// ===== Konec =====
test("endOf / endOk / defEnd: konec tréninku uložený nebo začátek + délka, zápas bez konce", () => {
  assert.equal(endOf(tr("18:00"), D), "19:00");
  assert.equal(endOf(tr("18:00", {end: "19:30"}), D), "19:30");
  assert.equal(endOf(tr("18:00", {end: "17:00"}), D), "19:00", "neplatný konec před začátkem → výchozí");
  assert.equal(endOf(tr("18:00"), evDefaults({len: 90})), "19:30");
  assert.equal(endOf(ma("18:00", {end: "20:00"}), D), "", "zápas konec nemá");
  assert.equal(endOf(tr(""), D), "");
  assert.equal(endOk("18:00", "19:00"), true);
  assert.equal(endOk("18:00", "18:00"), false);
  assert.equal(endOk("18:00", ""), true);
  assert.equal(endOk("", "19:00"), true);
  assert.equal(defEnd("17:15", D), "18:15");
  assert.equal(defEnd("", D), "");
});

// ===== Zobrazení a formulář =====
test("timeParts a timeFields: texty od – do a sraz, uložená pole formuláře", () => {
  assert.deepEqual(timeParts(tr("18:00"), D), {range: "18:00 – 19:00", meet: "17:30"});
  assert.deepEqual(timeParts(ma("18:00"), D), {range: "18:00", meet: "17:00"});
  assert.deepEqual(timeParts(tr(""), D), {range: "", meet: ""});
  assert.deepEqual(timeFields("training", {end: "19:15", meet: "45"}, D), {meet: 45, end: "19:15"});
  assert.deepEqual(timeFields("training", {end: "x", meet: ""}, D), {meet: 30, end: ""});
  assert.deepEqual(timeFields("match", {end: "20:00", meet: "75"}, D), {meet: 75});
});

// ===== Počty odpovědí =====
test("answerCounts: ✅ / ❌ / ❓ a bez odpovědi jen za zadané členy", () => {
  const A = {a: {st: "yes"}, b: {st: "no"}, c: {st: "maybe"}, d: {st: "yes"}, x: {st: "yes"}, e: {st: "??"}};
  assert.deepEqual(answerCounts(A, ["a", "b", "c", "d", "e", "f"]), {yes: 2, no: 1, maybe: 1, none: 2});
  assert.deepEqual(answerCounts(undefined, ["a"]), {yes: 0, no: 0, maybe: 0, none: 1});
});

// ===== Série =====
test("série: konec a sraz se přenesou do událostí, definice i úpravy „tato a další“; bez nich beze změny", () => {
  const o = {sid: "S", ids: ["e1"], dates: ["2026-11-04"], rule: {days: [3], every: 1, from: "2026-11-04", to: "2026-11-04", skip: []},
    d: {title: "Led", time: "18:00", place: "Hala", note: "", end: "19:15", meet: 45}, rel: {d: 1, t: "18:00"}, tpl: "train", by: "", at: ""};
  const r = seriesOps(o);
  assert.equal(r.ops[0][3].end, "19:15");
  assert.equal(r.ops[0][3].meet, 45);
  assert.equal(r.series.d.end, "19:15");
  assert.equal(r.series.d.meet, 45);
  const evs = [{id: "a", date: "2026-11-04", ser: {id: "S", i: 1}}, {id: "b", date: "2026-11-11", ser: {id: "S", i: 2}}];
  const p = editPlan(evs, evs[0], {time: "17:00", place: "", dl: "", end: "18:30", meet: 20});
  assert.deepEqual(p.apply[1], {id: "b", d: {time: "17:00", place: "", end: "18:30", meet: 20}});
  assert.deepEqual(editPlan(evs, evs[0], {time: "17:00", place: "", dl: ""}).apply[1], {id: "b", d: {time: "17:00", place: ""}});
  const cur = {date: "2026-11-04", time: "18:00", place: "", dl: "", end: "19:00", meet: 30};
  assert.equal(manualChange(cur, {...cur}), false);
  assert.equal(manualChange(cur, {...cur, meet: 45}), true);
  assert.equal(manualChange(cur, {...cur, end: "19:30"}), true);
  assert.equal(manualChange({date: "2026-11-04", time: "18:00"}, {date: "2026-11-04", time: "18:00"}), false);
});

// ===== Pravidla =====
test("pravidla: settings/events zapisuje trenér a asistent (isStaff), čtou členové týmu a hostující; events pole neomezují (úpravy podle matice)", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const m = rules.match(/match \/settings\/\{id\} \{([\s\S]*?)\n    \}/);
  assert.ok(m, "chybí pravidlo pro settings");
  assert.match(m[1], /allow read: if isTeam\(\) \|\| \(isHost\(\) && id in \['cash', 'events', 'app'\]\);/);
  assert.match(m[1], /: isStaff\(\)\)\);/);
  const ev = rules.match(/match \/events\/\{id\} \{([\s\S]*?)\n    \}/);
  assert.match(ev[1], /allow update: if evUpdate\('events'\) \|\|/);
});
