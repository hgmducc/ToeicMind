import { useLayoutEffect, useRef } from 'react'

export function EqualHeightRow({
  leftLabel,
  leftValue,
  onLeftChange,
  leftPlaceholder,
  rightLabel,
  rightValue,
  onRightChange,
  rightPlaceholder,
  isReadOnly = false,
  minHeight = 68,
  maxHeightLimit = null,
}) {
  const leftRef = useRef(null)
  const rightRef = useRef(null)

  // Đồng bộ chiều cao 2 ô: lấy ô có nội dung cao hơn làm chuẩn, co giãn trùng khớp với dữ liệu
  useLayoutEffect(() => {
    const syncHeights = () => {
      const leftEl = leftRef.current
      const rightEl = rightRef.current
      if (!leftEl || !rightEl) return

      // Đặt tạm về auto để đo scrollHeight thực tế theo nội dung
      leftEl.style.height = 'auto'
      rightEl.style.height = 'auto'

      const getBoxHeight = (el) => {
        const computed = window.getComputedStyle(el)
        const borderTop = parseFloat(computed.borderTopWidth) || 0
        const borderBottom = parseFloat(computed.borderBottomWidth) || 0
        return el.scrollHeight + borderTop + borderBottom
      }

      const leftH = getBoxHeight(leftEl)
      const rightH = getBoxHeight(rightEl)
      let maxH = Math.max(leftH, rightH, minHeight)

      if (maxHeightLimit && maxH > maxHeightLimit) {
        maxH = maxHeightLimit
        leftEl.style.overflowY = 'auto'
        rightEl.style.overflowY = 'auto'
      } else {
        leftEl.style.overflowY = 'hidden'
        rightEl.style.overflowY = 'hidden'
      }

      leftEl.style.height = `${maxH}px`
      rightEl.style.height = `${maxH}px`
    }

    syncHeights()

    window.addEventListener('resize', syncHeights)
    return () => window.removeEventListener('resize', syncHeights)
  }, [leftValue, rightValue, minHeight, maxHeightLimit])

  return (
    <div className="equal-height-row">
      {/* Cột trái */}
      <div className="equal-col">
        <label className="equal-label">{leftLabel}</label>
        <textarea
          ref={leftRef}
          aria-label={leftLabel}
          className="equal-textarea"
          value={leftValue || ''}
          placeholder={leftPlaceholder}
          readOnly={isReadOnly}
          onChange={(e) => onLeftChange && onLeftChange(e.target.value)}
        />
      </div>

      {/* Cột phải */}
      <div className="equal-col">
        <label className="equal-label">{rightLabel}</label>
        <textarea
          ref={rightRef}
          aria-label={rightLabel}
          className="equal-textarea"
          value={rightValue || ''}
          placeholder={rightPlaceholder}
          readOnly={isReadOnly}
          onChange={(e) => onRightChange && onRightChange(e.target.value)}
        />
      </div>
    </div>
  )
}
