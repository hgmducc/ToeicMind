export function Pagination({ page, total, pageSize = 10, onChange, loading }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="pagination">
      <button type="button" className="btn btn-sm btn-outline" disabled={loading || page <= 1} onClick={() => onChange(page - 1)}>
        Trước
      </button>
      <span>
        Trang {page}/{pages} · {total} kết quả
      </span>
      <button type="button" className="btn btn-sm btn-outline" disabled={loading || page >= pages} onClick={() => onChange(page + 1)}>
        Sau
      </button>
    </div>
  )
}
