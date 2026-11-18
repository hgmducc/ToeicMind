export const PART_COUNTS = [6, 25, 39, 30, 30, 16, 54]
export const PART_STARTS = [1, 7, 32, 71, 101, 131, 147]
export const PART_GROUP_LIMITS = [1, 1, 3, 3, 1, 4, 5]
const trim = (value) => value?.trim?.() || ''

export function groupPayload(group) {
  return {
    ...(group.groupId ? { groupId: group.groupId } : {}),
    partNo: group.partNo,
    groupOrder: group.groupOrder,
    categoryId: Number(group.categoryId),
    groupLevelNo: group.groupLevelNo || null,
    passageHtml: group.passageHtml || null,
    transcriptEn: group.transcriptEn || null,
    translationVi: group.translationVi || null,
    specialTagIds: group.specialTagIds || [],
    audioSegments: (group.audioSegments || []).map((s) => ({
      ...(s.clipId ? { clipId: s.clipId } : {}),
      seq: s.seq,
      clipKey: s.clip_id,
      role: s.kind === 'option' ? `OPTION_${s.label}` : s.kind.toUpperCase(),
      text: s.text,
      speaker: s.speaker || null,
      translationVi: s.translationVi || null,
      sourceAudio: s.source_audio || null,
      clipAudio: s.clip_audio || null,
      textSource: s.text_source || null,
      startSec: s.start_sec,
      endSec: s.end_sec,
      durationSec: s.duration_sec,
    })),
    questions: group.questions.map((q) => ({
      ...(q.questionId ? { questionId: q.questionId } : {}),
      questionNo: q.questionNo,
      levelNo: q.levelNo || null,
      questionText: q.questionText || null,
      explanation: q.explanation || null,
      optionExplanations: q.optionExplanations || null,
      options: q.options.map(({ optionLabel, optionText, isCorrect }) => ({
        optionLabel,
        optionText,
        isCorrect,
      })),
      vocabularies: (q.vocabularies || []).map((v) => ({
        term: v.term,
        base: v.base,
        pos: v.pos,
        ipa: v.ipa || null,
        cefr: v.cefr,
        meaningBase: v.meaning_base,
        termMeaningVi: v.term_meaning_vi || null,
        definitionEn: v.definition_en || null,
        exampleEn: v.example_en || null,
        exampleVi: v.example_vi || null,
      })),
    })),
  }
}

export function fromServerGroup(group, local) {
  return {
    ...group,
    sourceGroupId: local?.sourceGroupId,
    tempId: local?.tempId || `saved-${group.groupId}`,
    audioPreviewUrl: local?.audioPreviewUrl || null,
    audioFile: local?.audioFile || null,
    imageFiles: local?.imageFiles || [],
    imagePreviewUrls: local?.imagePreviewUrls || [],
    audioSegments: (group.audioSegments || []).map((s) => ({
      ...s,
      clip_id: s.clipKey,
      clip_audio: s.clipAudio,
      source_audio: s.sourceAudio,
      text_source: s.textSource,
      kind: s.role.startsWith('OPTION_') ? 'option' : s.role.toLowerCase(),
      label: s.role.startsWith('OPTION_') ? s.role.slice(7) : '',
      start_sec: s.startSec,
      end_sec: s.endSec,
      duration_sec: s.durationSec,
      audioFile: local?.audioSegments?.find((c) => c.clip_id === s.clipKey)?.audioFile || null,
      previewUrl: local?.audioSegments?.find((c) => c.clip_id === s.clipKey)?.previewUrl || null,
    })),
    questions: group.questions.map((q) => ({
      ...q,
      sourceRow: local?.questions?.find((item) => item.questionNo === q.questionNo)?.sourceRow,
      vocabularies: (q.vocabularies || []).map((v) => ({
        ...v,
        meaning_base: v.meaningBase,
        term_meaning_vi: v.termMeaningVi || '',
        definition_en: v.definitionEn || '',
        example_en: v.exampleEn || '',
        example_vi: v.exampleVi || '',
        ipa: v.ipa || '',
      })),
    })),
  }
}

export function contentCounts(groups) {
  return {
    groups: groups.length,
    questions: groups.reduce((n, g) => n + g.questions.length, 0),
    vocab: groups.reduce((n, g) => n + g.questions.reduce((m, q) => m + (q.vocabularies?.length || 0), 0), 0),
    segments: groups.reduce((n, g) => n + (g.audioSegments?.length || 0), 0),
    audio: groups.filter((g) => g.audioFile || g.media?.some((m) => m.mediaType === 'AUDIO')).length,
    images: groups.reduce(
      (n, g) =>
        n + Math.max(g.imageFiles?.length || 0, g.media?.filter((m) => m.mediaType === 'IMAGE').length || 0),
      0,
    ),
    clips: groups.reduce(
      (n, g) => n + (g.audioSegments || []).filter((s) => s.audioFile || s.media?.length).length,
      0,
    ),
  }
}

export function validOptionExplanations(question, partNo) {
  const labels = [...(partNo === 2 ? 'ABC' : 'ABCD')]
  const lines = trim(question.optionExplanations)
    .split(/\r?\n/)
    .filter((l) => l.trim())
  const correct = []
  if (lines.length !== labels.length) return false
  for (let i = 0; i < labels.length; i++) {
    if (
      !new RegExp(`^\\s*${labels[i]}:\\s*\\S`).test(lines[i]) ||
      /Sai\s*\/\s*Đúng|Đúng\s*\/\s*Sai/.test(lines[i])
    )
      return false
    const marks = [...lines[i].matchAll(/[-–—]\s*(Đúng|Sai)(?=[\s,.:;!?)]|$)/g)]
    if (marks.length !== 1) return false
    if (marks[0][1] === 'Đúng') correct.push(labels[i])
  }
  return (
    correct.length === 1 &&
    question.options.filter((o) => o.isCorrect).length === 1 &&
    question.options.some((o) => o.isCorrect && o.optionLabel === correct[0])
  )
}

export function contentIssues(groups, catalog = {}) {
  const issues = [],
    seen = new Set()
  for (const g of groups) {
    const add = (message, questionNo, sheet = 'Questions', row) =>
      issues.push({
        message,
        partNo: g.partNo,
        questionNo: questionNo || g.groupOrder,
        sheet,
        row:
          row ||
          (sheet === 'Questions'
            ? g.questions.find((q) => q.questionNo === (questionNo || g.groupOrder))?.sourceRow
            : undefined),
      })
    if (!Number.isInteger(g.partNo) || g.partNo < 1 || g.partNo > 7) add('Part phải từ 1 đến 7.')
    if (
      !catalog.categories?.some(
        (c) => c.categoryId === Number(g.categoryId) && c.partNo === g.partNo && c.isLeaf,
      )
    )
      add(`Chọn phân loại lá cho nhóm (${g.categoryCode || 'chưa có mã phân loại'}).`)
    if (g.questions.length > PART_GROUP_LIMITS[g.partNo - 1]) add('Số câu trong nhóm vượt giới hạn của Part.')
    if (
      g.groupLevelNo != null &&
      (!Number.isInteger(g.groupLevelNo) ||
        g.groupLevelNo < 1 ||
        g.groupLevelNo > 4 ||
        ![3, 4, 6, 7].includes(g.partNo))
    )
      add('Độ khó nhóm không hợp lệ.')
    if (g.partNo < 6 && trim(g.passageHtml)) add('Bài đọc chỉ áp dụng Part 6–7.')
    if (g.partNo > 4 && trim(g.transcriptEn)) add('Transcript chỉ áp dụng Part 1–4.')
    for (const q of g.questions) {
      if (!Number.isInteger(q.questionNo) || q.questionNo < 1 || q.questionNo > 200 || seen.has(q.questionNo))
        add('Số câu phải từ 1–200 và không trùng.', q.questionNo)
      seen.add(q.questionNo)
      if (q.levelNo != null && (!Number.isInteger(q.levelNo) || q.levelNo < 1 || q.levelNo > 4))
        add('Level phải từ 1–4 hoặc để trống.', q.questionNo)
      if (trim(q.optionExplanations) && !validOptionExplanations(q, g.partNo))
        add(
          'Giải thích phương án cần đủ nhãn theo thứ tự, đúng một dấu “— Đúng” khớp đáp án; các nhãn còn lại “— Sai”.',
          q.questionNo,
        )
      const vocabKeys = new Set()
      for (const v of q.vocabularies || []) {
        const key = `${v.base}|${v.pos}|${v.term}`.toLowerCase()
        if (
          !trim(v.term) ||
          !trim(v.base) ||
          !trim(v.meaning_base) ||
          !['n', 'v', 'adj', 'adv', 'prep', 'phr', 'phr.v'].includes(v.pos) ||
          !/^[ABC][12]$/.test(v.cefr) ||
          vocabKeys.has(key)
        )
          add(
            `Từ “${v.term}”: thiếu nguyên thể/nghĩa gốc, loại từ/CEFR sai hoặc trùng từ.`,
            q.questionNo,
            'Vocab',
            v.sourceRow,
          )
        if (
          v.term?.length > 100 ||
          v.base?.length > 100 ||
          v.meaning_base?.length > 500 ||
          v.term_meaning_vi?.length > 500 ||
          v.example_en?.length > 1000 ||
          v.example_vi?.length > 1000
        )
          add(`Từ “${v.term}” vượt giới hạn độ dài.`, q.questionNo, 'Vocab', v.sourceRow)
        vocabKeys.add(key)
      }
    }
    const seqs = new Set(),
      keys = new Set(),
      roles = new Set()
    for (const s of g.audioSegments || []) {
      const role = s.kind === 'option' ? `OPTION_${s.label}` : s.kind?.toUpperCase()
      const allowed =
        g.partNo === 1
          ? ['OPTION_A', 'OPTION_B', 'OPTION_C', 'OPTION_D']
          : g.partNo === 2
            ? ['QUESTION', 'OPTION_A', 'OPTION_B', 'OPTION_C']
            : g.partNo <= 4
              ? ['SENTENCE']
              : []
      if (
        !allowed.includes(role) ||
        !trim(s.clip_id) ||
        !trim(s.text) ||
        s.text.length > 1000 ||
        !Number.isInteger(s.seq) ||
        s.seq < 1 ||
        seqs.has(s.seq) ||
        keys.has(s.clip_id) ||
        (role !== 'SENTENCE' && roles.has(role)) ||
        s.end_sec < s.start_sec
      )
        add(
          `Audio cắt “${s.clip_id}”: thứ tự, vai trò, nội dung hoặc mốc thời gian không hợp lệ.`,
          null,
          'Audio_Segments',
          s.sourceRow,
        )
      seqs.add(s.seq)
      keys.add(s.clip_id)
      roles.add(role)
    }
  }
  return issues
}

export function sourceIssues(workbook, groups) {
  if (!workbook) return []
  const issues = [],
    numbers = new Set(groups.flatMap((g) => g.questions.map((q) => q.questionNo)))
  const keys = new Set(groups.map((g) => g.sourceGroupId))
  for (const [i, row] of workbook.vocabRows.entries())
    if (!numbers.has(Number(row.question_no)))
      issues.push({
        sheet: 'Vocab',
        row: i + 2,
        message: `Không tìm thấy câu ${row.question_no} để gắn từ vựng.`,
      })
  for (const [i, row] of workbook.segments.entries())
    if (!keys.has(String(row.group_id).trim().toLowerCase().replace(/^grp-/, '')))
      issues.push({ sheet: 'Audio_Segments', row: i + 2, message: `Không tìm thấy nhóm ${row.group_id}.` })
  for (const [i, row] of workbook.rows.entries()) {
    const group = groups.find((g) => g.questions.some((q) => q.questionNo === Number(row.question_no)))
    if (group && group.partNo !== Number(row.part))
      issues.push({ sheet: 'Questions', row: i + 2, message: 'Một mã nhóm đang chứa câu thuộc nhiều Part.' })
  }
  return issues
}
