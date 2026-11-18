using Microsoft.AspNetCore.Mvc;

namespace ToeicMind.Controllers;

/// <summary>
/// Bảng mã lỗi nghiệp vụ dùng chung (đề thi, làm bài, từ vựng, báo lỗi, người dùng) → HTTP status và thông báo.
/// Phản hồi luôn có dạng { code, message, traceId }. Mã không có trong bảng: *_NOT_FOUND → 404, còn lại → 409.
/// </summary>
internal static class ApiErrors
{
    private const int BadRequest = StatusCodes.Status400BadRequest;
    private const int NotFound = StatusCodes.Status404NotFound;

    private static readonly Dictionary<string, (int Status, string Message)> Catalog = new()
    {
        // Không tìm thấy (404)
        ["EXAM_SET_NOT_FOUND"] = (NotFound, "Không tìm thấy bộ đề"),
        ["EXAM_NOT_FOUND"] = (NotFound, "Không tìm thấy đề thi"),
        ["GROUP_NOT_FOUND"] = (NotFound, "Không tìm thấy nhóm trong đề"),
        ["QUESTION_NOT_FOUND"] = (NotFound, "Không tìm thấy câu hỏi trong nhóm"),
        ["DIRECTION_NOT_FOUND"] = (NotFound, "Không tìm thấy hướng dẫn"),
        ["MEDIA_NOT_FOUND"] = (NotFound, "Không tìm thấy media đang hoạt động"),
        ["ATTEMPT_NOT_FOUND"] = (NotFound, "Không tìm thấy lượt làm bài"),
        ["QUESTION_NOT_IN_ATTEMPT"] = (NotFound, "Câu hỏi không thuộc lượt làm bài này"),
        ["VOCAB_NOT_FOUND"] = (NotFound, "Không tìm thấy từ trong bộ từ của bạn"),
        ["SOURCE_QUESTION_NOT_FOUND"] = (NotFound, "Không tìm thấy câu hỏi nguồn"),
        ["VOCAB_SOURCE_NOT_FOUND"] = (NotFound, "Không tìm thấy từ vựng hệ thống"),
        ["VOCAB_PROGRESS_NOT_FOUND"] = (NotFound, "Từ này chưa có tiến độ học"),
        ["REPORT_TARGET_NOT_FOUND"] = (NotFound, "Không tìm thấy nội dung cần báo lỗi"),
        ["REPORT_NOT_FOUND"] = (NotFound, "Không tìm thấy báo cáo"),
        ["GRAMMAR_ARTICLE_NOT_FOUND"] = (NotFound, "Không tìm thấy bài ngữ pháp"),
        ["GRAMMAR_TOPIC_NOT_FOUND"] = (NotFound, "Không tìm thấy chủ điểm ngữ pháp"),
        ["LISTENING_ITEM_NOT_FOUND"] = (NotFound, "Không tìm thấy bộ clip sưu tầm"),
        ["CLIP_NOT_FOUND"] = (NotFound, "Không tìm thấy clip"),
        ["DICTATION_ITEM_NOT_FOUND"] = (NotFound, "Không tìm thấy bộ clip nghe chép"),
        ["USER_NOT_FOUND"] = (NotFound, "Không tìm thấy người dùng"),
        ["PLACEMENT_TEST_NOT_FOUND"] = (NotFound, "Không tìm thấy bài kiểm tra đầu vào"),

        // Dữ liệu gửi lên không hợp lệ (400)
        ["CATEGORY_MUST_BE_ACTIVE_LEAF"] = (BadRequest, "Phân loại phải là nút lá đang hoạt động của đúng Part"),
        ["SPECIAL_TAG_INVALID"] = (BadRequest, "Cờ đặc biệt không thuộc đúng Part"),
        ["QUESTION_NOT_IN_GROUP"] = (BadRequest, "ID câu hỏi không thuộc nhóm đang sửa"),
        ["OPTION_REMOVAL_NOT_ALLOWED"] = (BadRequest, "Phương án đã lưu phải sửa tại chỗ, không xóa riêng lẻ"),
        ["DIRECTION_KEY_INVALID"] = (BadRequest, "SECTION cần Skill và không có PartNo; PART cần PartNo và không có Skill"),
        ["MEDIA_INVALID"] = (BadRequest, "Tệp media, mô tả hoặc thứ tự không hợp lệ"),
        ["MEDIA_TYPE_INVALID"] = (BadRequest, "Chỉ hỗ trợ MP3, WAV, PNG, JPEG và WebP; nội dung tệp phải khớp định dạng"),
        ["MEDIA_FILE_NAME_INVALID"] = (BadRequest, "Tên tệp phải theo quy tắc {Mã đề}_Part{n}_{số câu} (audio cắt thêm _sNN); xem GET media-slots để lấy đúng tên"),
        ["AUDIO_NOT_ALLOWED"] = (BadRequest, "Audio nhóm chỉ áp dụng Part 1–4"),
        ["OPTION_NOT_IN_QUESTION"] = (BadRequest, "Phương án không thuộc câu hỏi"),
        ["ANSWER_CLEAR_NOT_ALLOWED"] = (BadRequest, "Chỉ Luyện thi mới được bỏ chọn đáp án"),
        ["SCOPE_PARTS_INVALID"] = (BadRequest, "Danh sách Part không hợp lệ cho phạm vi đã chọn"),
        ["TIME_LIMIT_NOT_ALLOWED"] = (BadRequest, "Chỉ Luyện thi mới đặt được thời gian; Luyện tập không có đồng hồ"),
        ["BANK_CARD_INVALID"] = (BadRequest, "Thẻ ngân hàng không tồn tại trong Part đã chọn"),
        ["VOCAB_INVALID"] = (BadRequest, "Cần VocabId hoặc từ tự thêm (CustomWord và CustomMeaning), không dùng cả hai"),
        ["REPORT_INVALID"] = (BadRequest, "Thiếu đối tượng báo lỗi hoặc mô tả (bắt buộc khi loại lỗi là OTHER)"),
        ["GRAMMAR_ARTICLE_EMPTY"] = (BadRequest, "Bài ngữ pháp cần có tiêu đề và nội dung"),
        ["GRAMMAR_TOPIC_INVALID"] = (BadRequest, "Chủ điểm không thuộc danh sách chủ điểm ngữ pháp"),
        ["LISTENING_CATEGORY_INVALID"] = (BadRequest, "Loại bài phải là phân loại lá đang dùng của đúng Part"),
        ["LISTENING_LEVEL_INVALID"] = (BadRequest, "Level không tồn tại"),
        ["LISTENING_CLIP_ROLE_INVALID"] = (BadRequest, "Vai trò clip không hợp lệ với Part: Part 1 OPTION_A–D; Part 2 QUESTION, OPTION_A–C; Part 3, 4 SENTENCE"),
        ["LISTENING_CLIP_EMPTY"] = (BadRequest, "Clip cần có script tiếng Anh"),
        ["PASSWORD_TOO_LONG"] = (BadRequest, "Mật khẩu không được vượt quá 72 byte UTF-8"),
        ["PLACEMENT_GROUP_INVALID"] = (BadRequest, "Có nhóm câu hỏi không tồn tại, đã xóa hoặc thuộc đề chưa xuất bản. Hãy bỏ các nhóm đó rồi lưu lại."),
        ["PLACEMENT_EMPTY"] = (BadRequest, "Không tìm được nhóm câu hỏi phù hợp với số câu đã chọn"),

        // Khác
        ["VIP_PLAN_NOT_FOUND"] = (NotFound, "Không tìm thấy gói VIP"),
        ["ORDER_NOT_FOUND"] = (NotFound, "Không tìm thấy đơn thanh toán"),
        ["VIP_REQUIRED"] = (StatusCodes.Status402PaymentRequired, "Nội dung này dành cho tài khoản VIP. Vui lòng nâng cấp VIP để sử dụng."),
        ["PAYMENT_NOT_CONFIGURED"] = (StatusCodes.Status503ServiceUnavailable, "Cổng thanh toán VNPay chưa được cấu hình. Vui lòng thử lại sau."),
        ["ADMIN_NO_PURCHASE"] = (StatusCodes.Status409Conflict, "Quản trị viên đã có toàn quyền, không cần mua VIP"),
        ["VIP_PLAN_CODE_EXISTS"] = (StatusCodes.Status409Conflict, "Mã gói VIP đã tồn tại"),
        ["VIP_ACTION_INVALID"] = (BadRequest, "Thao tác phải là GRANT (cộng thêm ngày) hoặc REVOKE (thu hồi)"),
        ["VIP_DAYS_INVALID"] = (BadRequest, "Số ngày VIP cộng thêm phải từ 1 đến 3660"),
        ["VIP_REASON_REQUIRED"] = (BadRequest, "Vui lòng nhập lý do cấp hoặc thu hồi VIP"),
        ["VIP_TARGET_ADMIN"] = (StatusCodes.Status409Conflict, "Quản trị viên đã có toàn quyền, không cần cấp VIP"),
        ["VIP_NOT_ACTIVE"] = (StatusCodes.Status409Conflict, "Tài khoản đang không có VIP nên không có gì để thu hồi"),
        ["VIP_HISTORY_SCHEMA_MISSING"] = (StatusCodes.Status503ServiceUnavailable, "Cơ sở dữ liệu chưa có bảng lịch sử VIP. Hãy chạy phần F của Docs/DATABASE/01_schema.sql trên đúng database rồi thử lại"),
        ["REVIEW_NOT_ALLOWED"] = (StatusCodes.Status403Forbidden, "Luyện thi không hiển thị đáp án chi tiết; hãy dùng chế độ Luyện tập để xem giải thích"),
        ["MEDIA_TOO_LARGE"] = (StatusCodes.Status413PayloadTooLarge, "Tệp vượt quá dung lượng media được cấu hình"),
        ["STORAGE_UNAVAILABLE"] = (StatusCodes.Status503ServiceUnavailable, "Kho media chưa sẵn sàng. Vui lòng thử lại sau."),
        ["VOCAB_SCHEMA_MISSING"] = (StatusCodes.Status503ServiceUnavailable, "Cơ sở dữ liệu chưa có bảng UserVocabProgress hoặc cột StudyDay.VocabReviewCount. Hãy chạy Docs/DATABASE/01_schema.sql trên đúng database rồi thử lại"),
        ["PERSONALIZATION_SCHEMA_MISSING"] = (StatusCodes.Status503ServiceUnavailable, "Cơ sở dữ liệu chưa có phần cá nhân hóa và kiểm tra đầu vào (CHG-007). Hãy chạy Docs/DATABASE/01_schema.sql trên đúng database rồi thử lại"),
        ["PLACEMENT_NOT_AVAILABLE"] = (StatusCodes.Status409Conflict, "Hiện chưa có bài kiểm tra đầu vào. Vui lòng quay lại sau."),

        // Xung đột trạng thái (409)
        ["EXAM_SET_NAME_EXISTS"] = (StatusCodes.Status409Conflict, "Tên bộ đề đã tồn tại"),
        ["EXAM_CODE_EXISTS"] = (StatusCodes.Status409Conflict, "Mã đề đã tồn tại trong bộ đề"),
        ["EXAM_TITLE_EXISTS"] = (StatusCodes.Status409Conflict, "Tên đề đã tồn tại trong bộ đề"),
        ["EXAM_SET_NOT_EMPTY"] = (StatusCodes.Status409Conflict, "Bộ đề còn đề chưa xóa. Hãy xóa hoặc chuyển các đề trước."),
        ["EXAM_SET_DELETED"] = (StatusCodes.Status409Conflict, "Cần khôi phục bộ đề trước khi thực hiện thao tác"),
        ["EXAM_DELETED"] = (StatusCodes.Status409Conflict, "Cần khôi phục đề trước khi chỉnh sửa"),
        ["EXAM_MUST_BE_DRAFT"] = (StatusCodes.Status409Conflict, "Cần chuyển đề về Nháp trước khi chỉnh sửa nội dung, mã hoặc bộ đề"),
        ["EXAM_CONTENT_LOCKED"] = (StatusCodes.Status409Conflict, "Đề đã có lượt làm. Nội dung, đáp án và cấu trúc được khóa; chỉnh sửa lớn cần tạo đề mới."),
        ["DEFAULT_DIRECTIONS_LOCKED"] = (StatusCodes.Status409Conflict, "Đã có lượt làm sử dụng kho đề; cần giữ nguyên hướng dẫn mặc định để bảo toàn nội dung."),
        ["EXAM_CONTENT_CONFLICT"] = (StatusCodes.Status409Conflict, "Trùng thứ tự nhóm, số câu, phương án hoặc mục hướng dẫn đang tồn tại"),
        ["GROUP_PART_IMMUTABLE"] = (StatusCodes.Status409Conflict, "Không đổi Part của nhóm đã có; hãy tạo nhóm mới"),
        ["DIRECTION_KEY_IMMUTABLE"] = (StatusCodes.Status409Conflict, "Không đổi khóa mục hướng dẫn đã có; hãy tạo bản riêng phù hợp"),
        ["CONCURRENT_CHANGE"] = (StatusCodes.Status409Conflict, "Có thay đổi đồng thời. Vui lòng tải lại và thử lại."),
        ["ATTEMPT_NOT_IN_PROGRESS"] = (StatusCodes.Status409Conflict, "Lượt làm bài không còn ở trạng thái đang làm"),
        ["ATTEMPT_NOT_SUBMITTED"] = (StatusCodes.Status409Conflict, "Lượt làm bài chưa được nộp"),
        ["ATTEMPT_IN_PROGRESS"] = (StatusCodes.Status409Conflict, "Lượt đang làm cần nộp hoặc bỏ dở trước khi xóa"),
        ["ATTEMPT_EXPIRED"] = (StatusCodes.Status409Conflict, "Đã hết giờ, bài đã được tự động nộp"),
        ["ANSWER_LOCKED"] = (StatusCodes.Status409Conflict, "Câu này đã được chấm, không đổi đáp án trong Luyện tập"),
        ["SCOPE_EMPTY"] = (StatusCodes.Status409Conflict, "Đề không có câu hỏi trong phạm vi đã chọn"),
        ["BANK_EMPTY"] = (StatusCodes.Status409Conflict, "Không còn câu nào phù hợp để luyện trong thẻ này"),
        ["VOCAB_EXISTS"] = (StatusCodes.Status409Conflict, "Từ này đã có trong bộ từ của bạn"),
        ["REPORT_DUPLICATE"] = (StatusCodes.Status409Conflict, "Bạn đã có báo lỗi cho nội dung này đang chờ xử lý"),
        ["GRAMMAR_ARTICLE_EXISTS"] = (StatusCodes.Status409Conflict, "Chủ điểm này đã có bài học; mỗi chủ điểm chỉ có một bài, hãy sửa bài hiện có"),
        ["LISTENING_ITEM_CLASSIFICATION_REQUIRED"] = (StatusCodes.Status409Conflict, "Cần gán loại bài và Level trước khi xuất bản bộ clip"),
        ["LISTENING_ITEM_EMPTY"] = (StatusCodes.Status409Conflict, "Bộ clip đang xuất bản phải có ít nhất một clip; hãy ẩn bộ clip trước"),
        ["LISTENING_ITEM_PART_LOCKED"] = (StatusCodes.Status409Conflict, "Chỉ đổi Part khi bộ clip chưa có clip nào"),
        ["LISTENING_CLIP_CONFLICT"] = (StatusCodes.Status409Conflict, "Trùng thứ tự hoặc vai trò clip trong bộ (mỗi vai trò A/B/C/D/QUESTION chỉ một clip)"),
        ["REPORT_REOPEN_CONFLICT"] = (StatusCodes.Status409Conflict, "Người học đã có báo lỗi khác đang mở cho nội dung này; hãy xử lý báo lỗi đó thay vì mở lại"),
        ["EMAIL_EXISTS"] = (StatusCodes.Status409Conflict, "Email đã tồn tại"),
        ["CANNOT_MODIFY_SELF"] = (StatusCodes.Status409Conflict, "Không thể tự đổi vai trò hoặc tự khóa tài khoản của chính mình"),
        ["LAST_ADMIN"] = (StatusCodes.Status409Conflict, "Hệ thống phải còn ít nhất một ADMIN đang hoạt động")
    };

    public static ObjectResult Result(HttpContext context, string code)
    {
        var (status, message) = Catalog.TryGetValue(code, out var known) ? known
            : (code.EndsWith("_NOT_FOUND", StringComparison.Ordinal) ? NotFound : StatusCodes.Status409Conflict, "Không thể thực hiện thao tác");
        return new ObjectResult(Body(context, code, message)) { StatusCode = status };
    }

    /// <summary>Thân phản hồi lỗi chuẩn của API: mã lỗi để client xử lý, thông báo cho người dùng, traceId để tra log.</summary>
    public static object Body(HttpContext context, string? code, string message) =>
        new { code, message, traceId = context.TraceIdentifier };
}
