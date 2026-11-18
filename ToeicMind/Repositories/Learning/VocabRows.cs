namespace ToeicMind.Repositories.Learning;

/// <summary>Một từ vựng hệ thống (dòng phẳng để lưu cache).</summary>
public record VocabWordRow(int VocabId, string Lemma, string PosCode, string? IpaUs, string? IpaUk, string CefrLevel, string MeaningVi, string? DefinitionEn);

/// <summary>Từ vựng xuất hiện trong một đề ở một Part (qua câu hỏi hoặc clip nghe).</summary>
public record VocabLinkRow(int VocabId, int ExamId, byte PartNo);

/// <summary>Đề đã xuất bản kèm bộ đề; VocabVip = bộ đề đặt quyền từ vựng là VIP.</summary>
public record VocabExamRow(int ExamId, int ExamSetId, string ExamCode, string Title, string SetName, bool VocabVip);

/// <summary>Ngữ cảnh xuất hiện của từ.</summary>
public record VocabContextRow(int VocabId, string? SurfaceForm, string? MeaningVi, string? ExampleEn, string? ExampleVi);
