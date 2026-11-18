using Microsoft.EntityFrameworkCore;
using ToeicMind.Models.Exams;
using ToeicMind.Models.Catalogs;
using ToeicMind.Models.Learning;
using ToeicMind.Models.Vip;

namespace ToeicMind.Data;

/// <summary>Kết nối EF Core với SQL Server: mỗi DbSet tương ứng một bảng. Cấu trúc bảng do script SQL tạo, không tạo bảng khi khởi động.</summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Users> Users { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }
    public DbSet<PasswordResetOtp> PasswordResetOtps { get; set; }
    public DbSet<ExamSet> ExamSets { get; set; }
    public DbSet<Exam> Exams { get; set; }
    public DbSet<PartSetting> PartSettings { get; set; }
    public DbSet<LevelBand> LevelBands { get; set; }
    public DbSet<QuestionCategory> QuestionCategories { get; set; }
    public DbSet<SpecialTag> SpecialTags { get; set; }
    public DbSet<QuestionGroup> QuestionGroups { get; set; }
    public DbSet<Question> Questions { get; set; }
    public DbSet<QuestionOption> QuestionOptions { get; set; }
    public DbSet<QuestionGroupTag> QuestionGroupTags { get; set; }
    public DbSet<ExamDirection> ExamDirections { get; set; }
    public DbSet<MediaFile> Media { get; set; }
    public DbSet<Vocabulary> Vocabularies { get; set; }
    public DbSet<VocabularyContext> VocabularyContexts { get; set; }
    public DbSet<ListeningItem> ListeningItems { get; set; }
    public DbSet<ListeningClip> ListeningClips { get; set; }
    public DbSet<Attempt> Attempts { get; set; }
    public DbSet<AttemptAnswer> AttemptAnswers { get; set; }
    public DbSet<UserQuestionProgress> UserQuestionProgress { get; set; }
    public DbSet<StudyDay> StudyDays { get; set; }
    public DbSet<ScoreConversion> ScoreConversions { get; set; }
    public DbSet<UserListeningProgress> UserListeningProgress { get; set; }
    public DbSet<UserVocabProgress> UserVocabProgress { get; set; }
    public DbSet<GrammarTopic> GrammarTopics { get; set; }
    public DbSet<GrammarArticle> GrammarArticles { get; set; }
    public DbSet<UserVocabulary> UserVocabularies { get; set; }
    public DbSet<Report> Reports { get; set; }
    public DbSet<VipPlan> VipPlans { get; set; }
    public DbSet<PaymentOrder> PaymentOrders { get; set; }
    public DbSet<VipHistory> VipHistories { get; set; }
    public DbSet<LearnerProfile> LearnerProfiles { get; set; }
    public DbSet<PlacementTest> PlacementTests { get; set; }
    public DbSet<PlacementTestGroup> PlacementTestGroups { get; set; }
    public DbSet<PlacementAttempt> PlacementAttempts { get; set; }
}
