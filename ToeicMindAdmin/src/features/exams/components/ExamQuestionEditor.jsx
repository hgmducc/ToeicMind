import { useState } from 'react'
import { Icon } from '../../../components/ui/Icon.jsx'
import { EqualHeightRow } from './EqualHeightRow.jsx'
import { PassageEditor } from './PassageEditor.jsx'
import { QuestionVocabEditor } from './QuestionVocabEditor.jsx'
import { MediaPreview } from './MediaPreview.jsx'
import { SegmentEditor } from './SegmentEditor.jsx'

export function ExamQuestionEditor({
  group,
  onUpdateGroup,
  onDeleteGroup,
  isReadOnly = false,
  catalog = {},
  accessToken,
  maxQuestions = 5,
}) {
  const [collapsed, setCollapsed] = useState(false)

  // Cập nhật trường của nhóm
  function handleGroupFieldChange(field, value) {
    if (isReadOnly) return
    onUpdateGroup({
      ...group,
      [field]: value,
    })
  }

  // Cập nhật một câu hỏi con trong nhóm
  function handleQuestionChange(qIndex, updatedQuestion) {
    if (isReadOnly) return
    const newQuestions = [...(group.questions || [])]
    newQuestions[qIndex] = updatedQuestion
    onUpdateGroup({
      ...group,
      questions: newQuestions,
    })
  }

  // Đổi đáp án đúng của câu hỏi (không tự động ghi đè giải thích của người dùng)
  function handleSetCorrectOption(qIndex, correctLabel) {
    if (isReadOnly) return
    const q = group.questions[qIndex]
    const updatedOptions = (q.options || []).map((opt) => ({
      ...opt,
      isCorrect: opt.optionLabel === correctLabel,
    }))

    handleQuestionChange(qIndex, {
      ...q,
      options: updatedOptions,
    })
  }

  // Cập nhật text của một option
  function handleOptionTextChange(qIndex, optLabel, newText) {
    if (isReadOnly) return
    const q = group.questions[qIndex]
    const updatedOptions = (q.options || []).map((opt) =>
      opt.optionLabel === optLabel ? { ...opt, optionText: newText } : opt,
    )
    handleQuestionChange(qIndex, {
      ...q,
      options: updatedOptions,
    })
  }

  const startQ = group.questions?.[0]?.questionNo || group.groupOrder
  const endQ = group.questions?.[group.questions.length - 1]?.questionNo || startQ
  const qRangeLabel = startQ === endQ ? `Câu ${startQ}` : `Câu ${startQ} - ${endQ}`

  // Media đã lưu trên máy chủ (hiển thị tự động) và media đang chọn trên máy (chưa tải lên)
  const serverAudio = (group.media || []).find((m) => m.mediaType === 'AUDIO')
  const serverImages = (group.media || []).filter((m) => m.mediaType === 'IMAGE')
  const pendingImageUrls = group.imageFiles?.length ? group.imagePreviewUrls || [] : []
  const hasImages = serverImages.length > 0 || pendingImageUrls.length > 0

  return (
    <div className="group-card" id={`group-p${group.partNo}-q${startQ}`}>
      <div className="group-card-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="group-title-tag">
            Part {group.partNo} · {qRangeLabel}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
            {group.questions?.length || 0} câu hỏi
          </span>
          {group.audioSegments && group.audioSegments.length > 0 && (
            <span
              style={{
                fontSize: '11px',
                background: 'var(--color-accent)',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: 700,
              }}
            >
              Có {group.audioSegments.length} phân đoạn audio_split
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            {collapsed ? 'Mở rộng' : 'Thu gọn'}
          </button>
          {!isReadOnly && onDeleteGroup && (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => onDeleteGroup(group)}
              title="Xóa nhóm câu hỏi này"
            >
              Xóa nhóm
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="admin-form-grid group-classification">
            <label>
              Phân loại *
              <select
                disabled={isReadOnly}
                value={group.categoryId || ''}
                onChange={(e) => handleGroupFieldChange('categoryId', Number(e.target.value))}
              >
                <option value="">
                  Chọn phân loại lá{group.categoryCode ? ` (${group.categoryCode})` : ''}
                </option>
                {(catalog.categories || [])
                  .filter((c) => c.partNo === group.partNo && c.isLeaf)
                  .map((c) => (
                    <option key={c.categoryId} value={c.categoryId}>
                      {c.nameVi} · {c.code}
                    </option>
                  ))}
              </select>
            </label>
            {[3, 4, 6, 7].includes(group.partNo) && (
              <label>
                Độ khó nhóm
                <select
                  value={group.groupLevelNo || ''}
                  disabled={isReadOnly}
                  onChange={(e) => handleGroupFieldChange('groupLevelNo', Number(e.target.value) || null)}
                >
                  <option value="">Chưa phân loại</option>
                  {[1, 2, 3, 4].map((level) => (
                    <option key={level} value={level}>
                      Level {level}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div>
              <span>Cờ đặc biệt</span>
              <div className="admin-actions">
                {(catalog.specialTags || [])
                  .filter((t) => t.partNo === group.partNo)
                  .map((tag) => (
                    <label key={tag.specialTagId}>
                      <input
                        type="checkbox"
                        disabled={isReadOnly}
                        checked={group.specialTagIds?.includes(tag.specialTagId) || false}
                        onChange={(e) =>
                          handleGroupFieldChange(
                            'specialTagIds',
                            e.target.checked
                              ? [...(group.specialTagIds || []), tag.specialTagId]
                              : group.specialTagIds.filter((id) => id !== tag.specialTagId),
                          )
                        }
                      />{' '}
                      {tag.nameVi}
                    </label>
                  ))}
              </div>
            </div>
          </div>

          {/* Media Player Bar (Audio & Image) */}
          <div className="group-media-box">
            {group.partNo <= 4 ? (
              <div className="group-audio-column">
                <div className="group-audio-player">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon name="headphones" size={18} />
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>Audio nhóm (chính):</span>
                  </div>
                  {group.audioPreviewUrl ? (
                    <audio controls src={group.audioPreviewUrl} preload="metadata">
                      Trình duyệt không hỗ trợ audio element.
                    </audio>
                  ) : serverAudio ? (
                    <MediaPreview
                      media={serverAudio}
                      accessToken={accessToken}
                      label={`audio chính câu ${startQ}`}
                    />
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--color-danger)', fontWeight: 600 }}>
                      Chưa có file audio!
                    </span>
                  )}
                  {group.audioFile && (
                    <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                      Đã chọn, sẽ tải lên khi bấm Lưu
                    </span>
                  )}
                  {!isReadOnly && (
                    <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer', margin: 0 }}>
                      Chọn file audio (.mp3)
                      <input
                        type="file"
                        accept=".mp3,.wav"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            onUpdateGroup({
                              ...group,
                              audioFile: file,
                              audioPreviewUrl: URL.createObjectURL(file),
                            })
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            ) : null}

            {/* Hình ảnh (Part 1 bắt buộc, Part 3/4/7 tùy chọn) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>Hình ảnh / Biểu đồ:</span>
              {pendingImageUrls.map((url, i) => (
                <div key={`pending-${i}`} className="group-image-preview">
                  <img src={url} alt={`Minh họa Part ${group.partNo} (chưa tải lên)`} />
                </div>
              ))}
              {serverImages.map((media) => (
                <div key={media.mediaId} className="group-image-preview">
                  <MediaPreview media={media} accessToken={accessToken} label={`ảnh câu ${startQ}`} />
                </div>
              ))}
              {!hasImages && group.partNo === 1 && (
                <span style={{ fontSize: '12px', color: 'var(--color-danger)', fontWeight: 600 }}>
                  Part 1 yêu cầu hình ảnh!
                </span>
              )}
              {!isReadOnly && (
                <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer', margin: 0 }}>
                  + Thêm ảnh (.jpg, .png)
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const newUrls = [...(group.imagePreviewUrls || []), URL.createObjectURL(file)]
                        const newFiles = [...(group.imageFiles || []), file]
                        onUpdateGroup({ ...group, imageFiles: newFiles, imagePreviewUrls: newUrls })
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>
          <SegmentEditor
            segments={group.audioSegments || []}
            onChange={(segments) => handleGroupFieldChange('audioSegments', segments)}
            accessToken={accessToken}
            readOnly={isReadOnly}
          />

          {/* Đoạn văn Passage HTML cho Part 6 và Part 7 */}
          {group.partNo >= 6 && (
            <div className="passage-editor-box">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                }}
              >
                <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-ink)' }}>
                  Đoạn văn đọc hiểu (Passage HTML/Text):
                </label>
                <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                  Part {group.partNo} · Hỗ trợ định dạng HTML, bảng biểu, chỗ trống điền từ
                </span>
              </div>
              <PassageEditor
                value={group.passageHtml || ''}
                partNo={group.partNo}
                isReadOnly={isReadOnly}
                onChange={(val) => handleGroupFieldChange('passageHtml', val)}
              />
            </div>
          )}

          {/* Transcript tiếng Anh (Part 1-4) & Dịch nghĩa tiếng Việt - 2 ô cân bằng nhau */}
          {group.partNo <= 4 ? (
            <EqualHeightRow
              leftLabel="Transcript bài nghe tiếng Anh (Part 1-4):"
              leftValue={group.transcriptEn || ''}
              leftPlaceholder="Nội dung lời thoại audio tiếng Anh..."
              onLeftChange={(val) => handleGroupFieldChange('transcriptEn', val)}
              rightLabel="Bản dịch tiếng Việt:"
              rightValue={group.translationVi || ''}
              rightPlaceholder="Nội dung dịch tiếng Việt của nhóm..."
              onRightChange={(val) => handleGroupFieldChange('translationVi', val)}
              isReadOnly={isReadOnly}
            />
          ) : (
            <div style={{ marginBottom: '14px' }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--color-muted)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Bản dịch tiếng Việt:
              </label>
              <textarea
                className="equal-textarea"
                style={{ height: '72px' }}
                value={group.translationVi || ''}
                readOnly={isReadOnly}
                onChange={(e) => handleGroupFieldChange('translationVi', e.target.value)}
                placeholder="Nội dung dịch tiếng Việt của nhóm..."
              />
            </div>
          )}

          {/* Danh sách câu hỏi trong nhóm */}
          <div className="questions-container">
            {(group.questions || []).map((q, qIndex) => (
              <div key={q.questionId || qIndex} className="question-item-card">
                <div className="question-item-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="question-number-badge">CÂU {q.questionNo}</span>
                    <label>
                      Số câu
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={q.questionNo}
                        readOnly={isReadOnly}
                        onChange={(e) =>
                          handleQuestionChange(qIndex, { ...q, questionNo: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label>
                      Độ khó
                      <select
                        value={q.levelNo || ''}
                        disabled={isReadOnly}
                        onChange={(e) =>
                          handleQuestionChange(qIndex, { ...q, levelNo: Number(e.target.value) || null })
                        }
                      >
                        <option value="">Chưa phân loại</option>
                        {[1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>
                            Level {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    {!isReadOnly && group.questions.length > 1 && (
                      <button
                        className="btn btn-sm btn-danger"
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Xóa câu ${q.questionNo}?`))
                            handleGroupFieldChange(
                              'questions',
                              group.questions.filter((_, i) => i !== qIndex),
                            )
                        }}
                      >
                        Xóa câu
                      </button>
                    )}
                  </div>
                </div>

                {/* Nội dung câu hỏi (Part 1 có thể để null theo chuẩn TOEIC) */}
                {group.partNo !== 1 && (
                  <input
                    type="text"
                    className="question-text-input"
                    aria-label={`Nội dung câu ${q.questionNo}`}
                    value={q.questionText || ''}
                    readOnly={isReadOnly}
                    onChange={(e) => handleQuestionChange(qIndex, { ...q, questionText: e.target.value })}
                    placeholder="Nhập nội dung câu hỏi..."
                  />
                )}

                {/* Lựa chọn A, B, C, D */}
                <div className="options-grid">
                  {(q.options || []).map((opt) => (
                    <div key={opt.optionLabel} className="option-row" data-correct={opt.isCorrect}>
                      <input
                        type="radio"
                        name={`correct-q-${q.questionNo}`}
                        className="option-radio"
                        checked={!!opt.isCorrect}
                        disabled={isReadOnly}
                        onChange={() => handleSetCorrectOption(qIndex, opt.optionLabel)}
                        title={`Chọn ${opt.optionLabel} là đáp án đúng`}
                        aria-label={`Câu ${q.questionNo}: chọn ${opt.optionLabel} là đáp án đúng`}
                      />
                      <span className="option-label">{opt.optionLabel}.</span>
                      <input
                        type="text"
                        className="option-text-input"
                        aria-label={`Câu ${q.questionNo}: phương án ${opt.optionLabel}`}
                        value={opt.optionText || ''}
                        readOnly={isReadOnly}
                        onChange={(e) => handleOptionTextChange(qIndex, opt.optionLabel, e.target.value)}
                        placeholder={`Nội dung phương án ${opt.optionLabel}...`}
                      />
                      {opt.isCorrect && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: 'var(--color-success)',
                            marginLeft: 'auto',
                          }}
                        >
                          ✓ Đáp án đúng
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Giải thích chung & Giải thích từng phương án: 2 bên cân bằng tuyệt đối, tự động khớp theo ô cao nhất */}
                <EqualHeightRow
                  leftLabel="Lời giải thích chung:"
                  leftValue={q.explanation || ''}
                  leftPlaceholder="Giải thích ngữ pháp/ngữ cảnh chung cho câu hỏi..."
                  onLeftChange={(val) => handleQuestionChange(qIndex, { ...q, explanation: val })}
                  rightLabel="Giải thích từng phương án:"
                  rightValue={q.optionExplanations || ''}
                  rightPlaceholder="Nhập giải thích cho các phương án..."
                  onRightChange={(val) => handleQuestionChange(qIndex, { ...q, optionExplanations: val })}
                  isReadOnly={isReadOnly}
                />

                {/* Danh sách & Trình biên tập Từ vựng (Vocab) gắn liền với câu hỏi */}
                <QuestionVocabEditor
                  questionNo={q.questionNo}
                  vocabularies={q.vocabularies || []}
                  isReadOnly={isReadOnly}
                  onChange={(updatedVocabs) =>
                    handleQuestionChange(qIndex, { ...q, vocabularies: updatedVocabs })
                  }
                />
              </div>
            ))}
          </div>
          {!isReadOnly && group.questions.length < maxQuestions && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                const questionNo = Math.max(...group.questions.map((q) => q.questionNo)) + 1
                handleGroupFieldChange('questions', [
                  ...group.questions,
                  {
                    questionNo,
                    levelNo: null,
                    questionText: '',
                    explanation: '',
                    optionExplanations: '',
                    vocabularies: [],
                    options: [...(group.partNo === 2 ? 'ABC' : 'ABCD')].map((optionLabel) => ({
                      optionLabel,
                      optionText: '',
                      isCorrect: false,
                    })),
                  },
                ])
              }}
            >
              Thêm câu vào nhóm
            </button>
          )}
        </>
      )}
    </div>
  )
}