namespace ToeicMind.Services.Exams;

// Khóa tự nhiên của nội dung đề: nhóm = (Part, GroupOrder), câu = QuestionNo trong nhóm, clip = SeqNo trong nhóm.
public record StoredGroupKey(int GroupId, byte PartNo, short GroupOrder,
    IReadOnlyList<(int QuestionId, short QuestionNo)> Questions, IReadOnlyList<(int ClipId, short SeqNo)> Clips);
