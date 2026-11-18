import assert from 'node:assert/strict'
import test from 'node:test'
import { MODES, MODE_IDS } from '../src/features/vocab/engine/modeCatalog.js'
import { MAX_GROUP, MIN_GROUP, chunkEvenly, planSession } from '../src/features/vocab/engine/planner.js'
import {
  adaptLevel, classify, evaluateWord, familiarityOfProgress, levelFromProgress, slowLimit,
} from '../src/features/vocab/engine/scoring.js'
import { blankOf, clozeOf, idOf, maskWord, norm, pickDistractors } from '../src/features/vocab/engine/text.js'

// rng tất định (mulberry32) để kiểm thử lặp lại được.
function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const LEMMAS = ['interview', 'schedule', 'manager', 'invoice', 'deadline', 'colleague', 'budget', 'proposal', 'review', 'contract', 'supplier', 'warehouse']
const makeWord = (lemma, index, extra = {}) => ({
  vocabId: index + 1, lemma, posCode: index % 3 === 0 ? 'v' : 'n', meaningVi: `nghĩa của ${lemma}`,
  definitionEn: `the thing called ${lemma} in an office`, status: 'NEW', repetitions: 0, intervalDays: 0, lapses: 0, ...extra,
})
const makeItem = (lemma, index) => ({
  word: makeWord(lemma, index),
  kind: 'NEW',
  contexts: index % 2 === 0 ? [{ surfaceForm: lemma, exampleEn: `Please send the ${lemma} to us today.`, exampleVi: 'Câu ví dụ' }] : [],
})
const items = LEMMAS.map(makeItem)
const pool = ['apple', 'garden', 'travel', 'engine', 'window', 'market', 'pencil', 'ticket'].map((lemma, i) => makeWord(lemma, 100 + i))
const env = { words: [...items.map((item) => item.word), ...pool] }

test('norm, maskWord and cloze handle inflected forms and punctuation', () => {
  assert.equal(norm(' Hello, World! '), 'helloworld')
  assert.equal(norm('don’t'), "don't")
  assert.equal(maskWord('We reviewed the reviews.', 'review'), 'We ____ the ____.')
  const item = { word: makeWord('review', 1), contexts: [{ exampleEn: 'She reviewed the plan carefully.', exampleVi: 'vi' }] }
  const cloze = clozeOf(item)
  assert.equal(cloze.form, 'reviewed')
  assert.equal(cloze.before + cloze.form + cloze.after, 'She reviewed the plan carefully.')
})

test('blankOf falls back to a masked definition and is empty without any text', () => {
  const noExample = { word: makeWord('budget', 1), contexts: [] }
  const blank = blankOf(noExample)
  assert.equal(blank.kind, 'def')
  assert.ok(!blank.defText.includes('budget'))
  assert.equal(blankOf({ word: { ...makeWord('budget', 1), definitionEn: null }, contexts: [] }), null)
})

test('distractors never include the word itself, never repeat values and prefer the same part of speech', () => {
  const item = items[0]
  const picked = pickDistractors(env, item, 'lemma', 5, 1, seeded(1))
  assert.equal(picked.length, 5)
  assert.ok(picked.every((word) => idOf(word) !== idOf(item.word)))
  assert.equal(new Set(picked.map((word) => norm(word.lemma))).size, 5)
  const sameKind = picked.filter((word) => word.posCode === item.word.posCode).length
  assert.ok(sameKind >= Math.min(5, env.words.filter((w) => w.posCode === item.word.posCode && w !== item.word).length) - 1)
})

test('classify marks wrong, slow, good and fast by speed, hints and explicit grades', () => {
  const base = { mode: 'quiz', level: 0, lemma: 'budget' }
  assert.equal(classify({ ...base, ok: false, ms: 100 }), 'wrong')
  assert.equal(classify({ ...base, ok: true, ms: 1000 }), 'fast')
  assert.equal(classify({ ...base, ok: true, ms: 5000 }), 'good')
  assert.equal(classify({ ...base, ok: true, ms: 20000 }), 'slow')
  assert.equal(classify({ ...base, ok: true, ms: 100, hint: true }), 'slow')
  assert.equal(classify({ ...base, ok: true, ms: 100, cls: 'wrong' }), 'wrong')
  assert.ok(slowLimit('scramble', 0, 'schedule') > slowLimit('scramble', 0, 'bud'))
  assert.ok(slowLimit('quiz', 3, 'budget') > slowLimit('quiz', 0, 'budget'))
})

test('word familiarity from 2–3 results: all wrong, partly wrong, slow and consistently fast', () => {
  const cases = [
    [['wrong', 'wrong'], 0, 'Chưa quen'],
    [['wrong', 'fast', 'good'], 1, 'Mới quen'],
    [['fast', 'wrong'], 1, 'Mới quen'],
    [['slow', 'slow'], 1, 'Mới quen'],
    [['slow', 'good'], 1, 'Mới quen'],
    [['good', 'good'], 2, 'Quen'],
    [['slow', 'fast'], 2, 'Quen'],
    [['good', 'fast', 'good'], 2, 'Quen'],
    [['fast', 'fast'], 3, 'Rất quen'],
    [['fast', 'good'], 3, 'Rất quen'],
  ]
  for (const [classes, grade, label] of cases) {
    const result = evaluateWord(classes.map((cls) => ({ cls })))
    assert.equal(result.grade, grade, classes.join(','))
    assert.equal(result.label, label)
    assert.equal(result.total, classes.length)
  }
  assert.equal(evaluateWord([]), null)
})

test('difficulty follows saved SM-2 progress and adapts inside the word', () => {
  assert.equal(levelFromProgress(null), 0)
  assert.equal(levelFromProgress({ status: 'NEW' }), 0)
  assert.equal(levelFromProgress({ status: 'LEARNING', repetitions: 1, intervalDays: 1, lapses: 0 }), 0)
  assert.equal(levelFromProgress({ status: 'LEARNING', repetitions: 2, intervalDays: 3, lapses: 0 }), 1)
  assert.equal(levelFromProgress({ status: 'LEARNING', repetitions: 3, intervalDays: 8, lapses: 0 }), 2)
  assert.equal(levelFromProgress({ status: 'MASTERED', repetitions: 6, intervalDays: 40, lapses: 0 }), 3)
  assert.equal(levelFromProgress({ status: 'MASTERED', repetitions: 6, intervalDays: 40, lapses: 2 }), 2)
  assert.equal(adaptLevel(1, []), 1)
  assert.equal(adaptLevel(1, [{ cls: 'fast' }]), 2)
  assert.equal(adaptLevel(1, [{ cls: 'fast' }, { cls: 'fast' }, { cls: 'fast' }]), 3)
  assert.equal(adaptLevel(0, [{ cls: 'wrong' }]), 0)
  assert.equal(adaptLevel(2, [{ cls: 'wrong' }, { cls: 'good' }]), 1)
})

test('saved progress maps to a readable familiarity label', () => {
  assert.equal(familiarityOfProgress({ status: 'NEW' }).label, 'Chưa học')
  assert.equal(familiarityOfProgress({ status: 'LEARNING', repetitions: 0, intervalDays: 0 }).label, 'Chưa quen')
  assert.equal(familiarityOfProgress({ status: 'LEARNING', repetitions: 1, intervalDays: 1 }).label, 'Mới quen')
  assert.equal(familiarityOfProgress({ status: 'LEARNING', repetitions: 3, intervalDays: 8 }).label, 'Quen')
  assert.equal(familiarityOfProgress({ status: 'MASTERED', repetitions: 6, intervalDays: 30 }).label, 'Rất quen')
})

test('chunkEvenly keeps every match group between 3 and 6 words', () => {
  for (let n = MIN_GROUP; n <= 40; n++) {
    const groups = chunkEvenly(Array.from({ length: n }, (_, i) => i))
    assert.equal(groups.flat().length, n)
    for (const group of groups) assert.ok(group.length >= MIN_GROUP && group.length <= MAX_GROUP, `n=${n} size=${group.length}`)
  }
})

function inspectPlan(result, allowedModes) {
  const { slots, plans } = result
  const seenInSlots = new Map()
  for (const slot of slots) {
    assert.ok(MODES[slot.mode], `unknown mode ${slot.mode}`)
    assert.ok(allowedModes.includes(slot.mode), `mode ${slot.mode} was not requested`)
    const ids = slot.items.map((item) => idOf(item.word))
    assert.equal(new Set(ids).size, ids.length, 'a word appears twice in one slot')
    if (slot.mode === 'match') assert.ok(slot.items.length >= MIN_GROUP && slot.items.length <= MAX_GROUP, `match size ${slot.items.length}`)
    else assert.equal(slot.items.length, 1)
    for (const item of slot.items) {
      assert.ok(MODES[slot.mode].eligible(item, env), `${slot.mode} is not playable for ${item.word.lemma}`)
      const list = seenInSlots.get(idOf(item.word)) || []
      list.push({ mode: slot.mode, round: slot.round })
      seenInSlots.set(idOf(item.word), list)
    }
  }
  for (const plan of plans) {
    const asked = seenInSlots.get(plan.id) || []
    assert.deepEqual(asked.map((entry) => entry.mode).sort(), [...plan.modes].sort(), `plan of ${plan.item.word.lemma} matches its slots`)
    assert.equal(new Set(plan.modes).size, plan.modes.length, 'a word is asked the same question type twice')
    assert.equal(new Set(asked.map((entry) => entry.round)).size, asked.length, 'a word appears twice in the same round')
  }
  return { slots, plans }
}

test('every word is tested with 2–3 different random question types', () => {
  const counts = new Set()
  for (let seed = 1; seed <= 60; seed++) {
    const { plans, slots } = inspectPlan(planSession({ items, env, modeIds: MODE_IDS, rng: seeded(seed) }), MODE_IDS)
    assert.equal(plans.length, items.length, 'no word is skipped')
    for (const plan of plans) {
      assert.ok(plan.modes.length >= 2 && plan.modes.length <= 3, `${plan.item.word.lemma} has ${plan.modes.length} question types`)
      counts.add(plan.modes.length)
    }
    // Hai câu của cùng một từ không được liền nhau.
    for (let i = 1; i < slots.length; i++) {
      const shared = slots[i].items.some((a) => slots[i - 1].items.some((b) => idOf(a.word) === idOf(b.word)))
      assert.equal(shared, false, `seed ${seed}: slot ${i} repeats a word of the previous slot`)
    }
  }
  assert.deepEqual([...counts].sort(), [2, 3], 'both 2 and 3 question types occur')
})

test('question types are drawn randomly: different seeds give different plans and all types appear', () => {
  const signatures = new Set()
  const modesSeen = new Set()
  for (let seed = 1; seed <= 25; seed++) {
    const { slots } = planSession({ items, env, rng: seeded(seed) })
    signatures.add(slots.map((slot) => slot.mode).join(','))
    slots.forEach((slot) => modesSeen.add(slot.mode))
  }
  assert.ok(signatures.size > 15)
  assert.deepEqual([...modesSeen].sort(), [...MODE_IDS].sort())
})

test('a limited pool of types is respected and two types give exactly two questions per word', () => {
  const allowed = ['quiz', 'scramble']
  const { plans } = inspectPlan(planSession({ items, env, modeIds: allowed, rng: seeded(7) }), allowed)
  assert.ok(plans.every((plan) => plan.modes.length === 2))
})

test('types a word cannot play are never assigned (no example or definition → no fill-in-the-blank)', () => {
  const bare = items.slice(0, 6).map((item) => ({ ...item, contexts: [], word: { ...item.word, definitionEn: null } }))
  const bareEnv = { words: [...bare.map((item) => item.word), ...pool] }
  for (let seed = 1; seed <= 20; seed++) {
    const { slots } = planSession({ items: bare, env: bareEnv, rng: seeded(seed) })
    assert.ok(slots.every((slot) => slot.mode !== 'fill'))
  }
})

test('tiny sessions still plan without crashing and never drop below one question per word', () => {
  for (const size of [1, 2, 3]) {
    const subset = items.slice(0, size)
    const { slots, plans } = planSession({ items: subset, env: { words: [...subset.map((i) => i.word), ...pool] }, rng: seeded(size) })
    assert.equal(plans.length, size)
    assert.ok(slots.length >= size)
    assert.ok(plans.every((plan) => plan.modes.length >= 1))
  }
  assert.deepEqual(planSession({ items: [], env }).slots, [])
})
