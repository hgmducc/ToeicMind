import { useEffect, useRef } from 'react'

export function PublishCheckModal({
  isOpen,
  onClose,
  issues = [],
  isValid,
  onJumpToIssue,
  onConfirmPublish,
  isPublishing,
}) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])
  return (
    <dialog
      ref={ref}
      className="publish-dialog"
      aria-labelledby="publish-modal-title"
      onCancel={(e) => {
        e.preventDefault()
        if (!isPublishing) onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current && !isPublishing) onClose()
      }}
    >
      <div className="modal-header">
        <h2 id="publish-modal-title">{isValid ? 'Đề đủ điều kiện xuất bản' : 'Kết quả kiểm tra xuất bản'}</h2>
        <button
          type="button"
          className="modal-close-btn"
          disabled={isPublishing}
          onClick={onClose}
          aria-label="Đóng"
        >
          ×
        </button>
      </div>
      {isValid ? (
        <p>Backend đã kiểm tra nội dung hiện lưu. Xác nhận để xuất bản đề cho học viên.</p>
      ) : (
        <>
          <p>Có {issues.length} vấn đề cần sửa trước khi xuất bản.</p>
          <div className="issues-list">
            {issues.map((issue, i) => (
              <div className="issue-item" key={i}>
                <div>
                  <strong>{issue.message}</strong>
                  <p className="muted">
                    {issue.code}
                    {issue.partNo ? ` · Part ${issue.partNo}` : ''}
                    {issue.groupId ? ` · Nhóm #${issue.groupId}` : ''}
                  </p>
                </div>
                {onJumpToIssue && (issue.partNo || issue.groupId) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    disabled={isPublishing}
                    onClick={() => {
                      onJumpToIssue(issue.partNo, issue.questionNo, issue)
                      onClose()
                    }}
                  >
                    Đến lỗi
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      <div className="admin-actions modal-actions">
        <button type="button" className="btn btn-outline" disabled={isPublishing} onClick={onClose}>
          Đóng
        </button>
        {isValid && onConfirmPublish && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={isPublishing}
            onClick={onConfirmPublish}
          >
            {isPublishing ? 'Đang xuất bản…' : 'Xác nhận xuất bản'}
          </button>
        )}
      </div>
    </dialog>
  )
}
