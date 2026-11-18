using ToeicMind.Models.Exams;

namespace ToeicMind.Services.Media;

// Quy tắc tên tệp media (không gồm phần mở rộng): {Mã đề}_Part{n}_{số câu}; nhóm nhiều câu là {đầu}-{cuối}, số câu 3 chữ số.
// Ví dụ ETSTEST1_Part1_001, ETSTEST1_Part3_032-034. Audio cắt của nhóm thêm hậu tố _sNN theo thứ tự clip.
public static class MediaFileNaming
{
    public static string GroupName(string examCode, byte partNo, short firstNo, short lastNo) =>
        $"{examCode}_Part{partNo}_{(firstNo == lastNo ? $"{firstNo:D3}" : $"{firstNo:D3}-{lastNo:D3}")}";

    public static string GroupName(string examCode, QuestionGroup group)
    {
        var numbers = group.Questions.Where(q => !q.IsDeleted).Select(q => q.QuestionNo).DefaultIfEmpty(group.GroupOrder).ToList();
        return GroupName(examCode, group.PartNo, numbers.Min(), numbers.Max());
    }

    public static string ClipName(string groupName, short seq) => $"{groupName}_s{seq:D2}";

    // FE gửi tên theo quy tắc; so khớp không phân biệt hoa thường và bỏ phần mở rộng nếu có.
    public static bool Matches(string? fileName, string expected) =>
        string.Equals(Path.GetFileNameWithoutExtension(fileName?.Trim()), expected, StringComparison.OrdinalIgnoreCase);
}
