import { MediaPreview } from './MediaPreview.jsx'

export function SegmentEditor({ segments, onChange, accessToken, readOnly }) {
  if (!segments.length) return null
  function update(index, patch) {
    onChange(segments.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }
  return (
    <details className="segment-editor">
      <summary>Audio cắt · {segments.length} phân đoạn</summary>
      {segments.map((s, i) => (
        <details className="direction-item" key={s.clipId || i}>
          <summary>
            #{s.seq} {s.label} · {s.clip_id}
            {!s.audioFile && !s.media?.length ? ' · Chưa có tệp' : ''}
          </summary>
          <div className="admin-form-grid">
            <label>
              Mã clip
              <input
                value={s.clip_id}
                readOnly={readOnly}
                onChange={(e) => update(i, { clip_id: e.target.value })}
              />
            </label>
            <label>
              Thứ tự
              <input
                type="number"
                min={1}
                value={s.seq}
                readOnly={readOnly}
                onChange={(e) => update(i, { seq: Number(e.target.value) })}
              />
            </label>
            <label>
              Loại
              <select
                disabled={readOnly}
                value={s.kind}
                onChange={(e) => update(i, { kind: e.target.value })}
              >
                {['question', 'option', 'sentence'].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label>
              Nhãn đáp án
              <select
                disabled={readOnly}
                value={s.label || ''}
                onChange={(e) => update(i, { label: e.target.value })}
              >
                {['', 'A', 'B', 'C', 'D'].map((k) => (
                  <option value={k} key={k}>
                    {k || 'Không có'}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Lời thoại
              <textarea
                value={s.text}
                readOnly={readOnly}
                maxLength={1000}
                onChange={(e) => update(i, { text: e.target.value })}
              />
            </label>
            <label>
              Người nói
              <input
                value={s.speaker || ''}
                readOnly={readOnly}
                onChange={(e) => update(i, { speaker: e.target.value })}
              />
            </label>
            {['start_sec', 'end_sec', 'duration_sec'].map((field) => (
              <label key={field}>
                {
                  {
                    start_sec: 'Bắt đầu (giây)',
                    end_sec: 'Kết thúc (giây)',
                    duration_sec: 'Thời lượng (giây)',
                  }[field]
                }
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={s[field] ?? ''}
                  readOnly={readOnly}
                  onChange={(e) =>
                    update(i, { [field]: e.target.value === '' ? null : Number(e.target.value) })
                  }
                />
              </label>
            ))}
          </div>
          <p className="muted preserve-lines">
            Nguồn: {s.source_audio || 'Chưa có'}
            <br />
            Tệp cắt: {s.clip_audio || 'Chưa có'}
            <br />
            Nguồn lời thoại: {s.text_source || 'Chưa có'}
          </p>
          {s.previewUrl ? (
            <audio controls preload="none" src={s.previewUrl} aria-label={`Clip ${s.clip_id}`} />
          ) : s.media?.[0] ? (
            <MediaPreview media={s.media[0]} accessToken={accessToken} label={`clip ${s.clip_id}`} />
          ) : (
            <p className="field-error">Chưa liên kết tệp audio cắt.</p>
          )}
          {!readOnly && (
            <label className="btn btn-sm btn-outline">
              Chọn tệp clip
              <input
                type="file"
                accept=".mp3,.wav"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) update(i, { audioFile: file, previewUrl: URL.createObjectURL(file) })
                }}
              />
            </label>
          )}
        </details>
      ))}
    </details>
  )
}
