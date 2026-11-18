using System.Text.RegularExpressions;
using ToeicMind.DTOs.Exams.Request;
using ToeicMind.DTOs.Exams.Response;

namespace ToeicMind.Services.Exams;

/// <summary>Kiểm tra dữ liệu nhóm câu hỏi theo quy tắc của từng Part trước khi lưu.</summary>
public static class ExamContentValidator
{
    public static List<ExamIssueDto> Validate(SaveGroupRequestDto group)
    {
        var issues = new List<ExamIssueDto>();
        void Add(string code, string message) => issues.Add(new() { Code = code, Message = message, PartNo = group.PartNo });
        var max = group.PartNo switch { 1 or 2 or 5 => 1, 3 or 4 => 3, 6 => 4, _ => 5 };
        if (group.Questions.Count > max) Add("GROUP_SIZE_INVALID", $"Part {group.PartNo} có tối đa {max} câu mỗi nhóm.");
        if (group.Questions.Count == 0 && !group.GroupOrder.HasValue) Add("GROUP_ORDER_REQUIRED", "Nhóm chưa có câu phải nhập GroupOrder.");
        if (group.Questions.Select(q => q.QuestionNo).Distinct().Count() != group.Questions.Count)
            Add("QUESTION_NUMBER_DUPLICATE", "Số câu trong nhóm bị trùng.");
        if (group.Questions.Where(q => q.QuestionId.HasValue).GroupBy(q => q.QuestionId).Any(g => g.Count() > 1))
            Add("QUESTION_ID_DUPLICATE", "ID câu hỏi bị lặp trong request.");
        if (group.SpecialTagIds.Distinct().Count() != group.SpecialTagIds.Count || group.SpecialTagIds.Any(id => id <= 0))
            Add("SPECIAL_TAG_INVALID", "Danh sách cờ không hợp lệ.");
        if (group.PartNo is not (3 or 4 or 6 or 7) && group.GroupLevelNo.HasValue)
            Add("GROUP_LEVEL_NOT_ALLOWED", "Độ khó nhóm chỉ áp dụng Part 3, 4, 6, 7.");
        if (group.PartNo is not (6 or 7) && !string.IsNullOrWhiteSpace(group.PassageHtml))
            Add("PASSAGE_NOT_ALLOWED", "Đoạn văn chỉ áp dụng Part 6, 7.");
        if (group.PartNo > 4 && !string.IsNullOrWhiteSpace(group.TranscriptEn))
            Add("TRANSCRIPT_NOT_ALLOWED", "Transcript chỉ áp dụng Part 1–4.");
        var segments = group.AudioSegments ?? [];
        if (segments.Count > 0 && group.PartNo > 4) Add("AUDIO_NOT_ALLOWED", "Audio cắt chỉ áp dụng Part 1–4.");
        if (segments.Select(s => s.Seq).Distinct().Count() != segments.Count ||
            segments.Select(s => s.ClipKey.Trim().ToLowerInvariant()).Distinct().Count() != segments.Count ||
            segments.Where(s => s.ClipId.HasValue).GroupBy(s => s.ClipId).Any(g => g.Count() > 1) ||
            segments.Where(s => s.Role != "SENTENCE").GroupBy(s => s.Role).Any(g => g.Count() > 1))
            Add("SEGMENT_DUPLICATE", "Trùng thứ tự, ID hoặc vai trò audio cắt.");
        foreach (var segment in segments)
        {
            var validRole = group.PartNo switch { 1 => segment.Role.StartsWith("OPTION_"), 2 => segment.Role is "QUESTION" or "OPTION_A" or "OPTION_B" or "OPTION_C", _ => segment.Role == "SENTENCE" };
            if (!validRole || segment.EndSec < segment.StartSec) Add("SEGMENT_INVALID", $"Audio cắt {segment.ClipKey}: vai trò hoặc mốc thời gian không hợp lệ.");
        }
        foreach (var question in group.Questions)
        {
            if (question.Vocabularies?.GroupBy(v => (v.Base.Trim().ToLowerInvariant(), v.Pos, v.Term.Trim().ToLowerInvariant())).Any(g => g.Count() > 1) == true)
                Add("VOCAB_DUPLICATE", $"Câu {question.QuestionNo}: từ vựng bị lặp cùng nguyên thể, loại từ và dạng xuất hiện.");
            var labels = group.PartNo == 2 ? "ABC" : "ABCD";
            if (question.Options.Any(o => !labels.Contains(o.OptionLabel, StringComparison.Ordinal)) ||
                question.Options.Select(o => o.OptionLabel).Distinct().Count() != question.Options.Count)
                Add("OPTION_LABEL_INVALID", $"Câu {question.QuestionNo}: nhãn đáp án không hợp lệ hoặc trùng.");
            if (question.Options.Count(o => o.IsCorrect) > 1)
                Add("MULTIPLE_CORRECT_OPTIONS", $"Câu {question.QuestionNo}: chỉ được có một đáp án đúng.");
            if (!string.IsNullOrWhiteSpace(question.OptionExplanations) && !ValidExplanations(question.OptionExplanations, labels, question.Options))
                Add("OPTION_EXPLANATIONS_INVALID", $"Câu {question.QuestionNo}: giải thích phải đủ nhãn theo thứ tự, đúng một nhãn Đúng khớp đáp án đúng.");
        }
        return issues;
    }

    public static bool ValidExplanations(string text, string labels, IReadOnlyList<SaveQuestionOptionRequestDto> options)
    {
        var lines = text.Replace("\r", "").Split('\n').Where(l => !string.IsNullOrWhiteSpace(l)).ToArray();
        if (lines.Length != labels.Length) return false;
        var correct = new List<string>();
        for (var i = 0; i < labels.Length; i++)
        {
            if (!Regex.IsMatch(lines[i], $@"^\s*{labels[i]}:\s*\S")) return false;
            var matches = Regex.Matches(lines[i], @"[-–—]\s*(Đúng|Sai)\b");
            if (matches.Count != 1 || Regex.IsMatch(lines[i], @"Sai\s*/\s*Đúng|Đúng\s*/\s*Sai")) return false;
            if (matches[0].Groups[1].Value == "Đúng") correct.Add(labels[i].ToString());
        }
        return correct.Count == 1 && options.Count(o => o.IsCorrect) == 1 &&
            options.Any(o => o.OptionLabel == correct[0] && o.IsCorrect);
    }
}
