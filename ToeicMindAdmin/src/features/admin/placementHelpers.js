// Tiện ích thuần JS của trình ghép bài kiểm tra đầu vào (kiểm thử được, không phụ thuộc React).

// Giây mỗi câu khi đề xuất thời gian (khớp ExamTimeRules của backend: Nghe 27 giây, Đọc 45 giây).
const secondsPer = (partNo) => (partNo <= 4 ? 27 : 45)

export function suggestedMinutes(groups) {
  const seconds = groups.reduce((sum, g) => sum + g.questionCount * secondsPer(g.partNo), 0)
  return Math.min(240, Math.max(5, Math.ceil(seconds / 60)))
}

// Giữ danh sách theo Part (người học làm theo thứ tự Part); nhóm mới đứng cuối khối Part của nó.
export function insertByPart(groups, group) {
  const index = groups.findIndex((g) => g.partNo > group.partNo)
  return index < 0 ? [...groups, group] : [...groups.slice(0, index), group, ...groups.slice(index)]
}

// Đổi chỗ nhóm với nhóm kề (step = -1 lên, 1 xuống) trong cùng Part; khác Part thì giữ nguyên.
export function moveWithinPart(groups, index, step) {
  const target = index + step
  if (target < 0 || target >= groups.length || groups[target].partNo !== groups[index].partNo) return groups
  const next = [...groups]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

// Số nhóm/câu theo Part, bỏ nhóm không còn dùng được.
export function partSummary(groups) {
  return [1, 2, 3, 4, 5, 6, 7].map((partNo) => {
    const inPart = groups.filter((g) => g.partNo === partNo && g.isAvailable !== false)
    return { partNo, groups: inPart.length, questions: inPart.reduce((sum, g) => sum + g.questionCount, 0) }
  }).filter((p) => p.groups > 0)
}
