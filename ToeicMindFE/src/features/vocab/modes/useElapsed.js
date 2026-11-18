import { useCallback, useState } from 'react'

// Trả về hàm cho biết đã trôi qua bao nhiêu ms kể từ lúc câu hỏi hiện ra.
export function useElapsed() {
  const [startedAt] = useState(() => Date.now())
  return useCallback(() => Date.now() - startedAt, [startedAt])
}
