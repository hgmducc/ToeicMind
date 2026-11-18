namespace ToeicMind.Repositories.Exams;

/// <summary>
/// Hướng dẫn làm bài mặc định của đề TOEIC (dùng khi một đề chưa có hướng dẫn riêng).
/// Nguồn: toeic_directions.xlsx. Mỗi dòng: (loại, kỹ năng, số Part, tiếng Anh, tiếng Việt, ví dụ EN, ví dụ VI).
/// </summary>
public static class DefaultExamDirections
{
    public static readonly List<(string Kind, string? Skill, byte? PartNo, string En, string Vi, string? ExampleEn, string? ExampleVi)> All = new()
    {
        ("SECTION", "LISTENING", null,
            "In the Listening test, you will be asked to demonstrate how well you understand spoken English. " +
            "The entire Listening test will last approximately 45 minutes. There are four parts, and directions are given for each part. " +
            "You must mark your answers on the separate answer sheet. Do not write your answers in your test book.",
            "Trong phần thi Nghe, bạn sẽ được yêu cầu thể hiện mức độ hiểu tiếng Anh nói của mình. " +
            "Toàn bộ phần thi Nghe kéo dài khoảng 45 phút. Có bốn phần, và hướng dẫn được đưa ra cho từng phần. " +
            "Bạn phải đánh dấu câu trả lời trên phiếu trả lời riêng. Không viết câu trả lời vào sách đề thi.",
            null, null),
        ("PART", null, 1,
            "Directions: For each question in this part, you will hear four statements about a picture in your test book. " +
            "When you hear the statements, you must select the one statement that best describes what you see in the picture. " +
            "Then find the number of the question on your answer sheet and mark your answer. " +
            "The statements will not be printed in your test book and will be spoken only one time.",
            "Hướng dẫn: Với mỗi câu hỏi trong phần này, bạn sẽ nghe bốn câu mô tả về một bức tranh trong sách đề thi. " +
            "Khi nghe các câu, bạn phải chọn câu mô tả đúng nhất những gì bạn thấy trong tranh. " +
            "Sau đó tìm số câu hỏi trên phiếu trả lời và đánh dấu đáp án. " +
            "Các câu mô tả sẽ không được in trong sách đề thi và chỉ được đọc một lần.",
            "Statement (C), \"They're sitting at a table,\" is the best description of the picture, " +
            "so you should select answer (C) and mark it on your answer sheet.",
            "Câu (C) \"They're sitting at a table\" (Họ đang ngồi ở bàn) mô tả bức tranh đúng nhất, " +
            "nên bạn chọn đáp án (C) và đánh dấu trên phiếu trả lời."),
        ("PART", null, 2,
            "Directions: You will hear a question or statement and three responses spoken in English. " +
            "They will not be printed in your test book and will be spoken only one time. " +
            "Select the best response to the question or statement and mark the letter (A), (B), or (C) on your answer sheet.",
            "Hướng dẫn: Bạn sẽ nghe một câu hỏi hoặc một câu nói và ba phản hồi bằng tiếng Anh. " +
            "Chúng sẽ không được in trong sách đề thi và chỉ được đọc một lần. " +
            "Chọn phản hồi phù hợp nhất với câu hỏi hoặc câu nói và đánh dấu chữ cái (A), (B) hoặc (C) trên phiếu trả lời.",
            null, null),
        ("PART", null, 3,
            "Directions: You will hear some conversations between two or more people. " +
            "You will be asked to answer three questions about what the speakers say in each conversation. " +
            "Select the best response to each question and mark the letter (A), (B), (C), or (D) on your answer sheet. " +
            "The conversations will not be printed in your test book and will be spoken only one time.",
            "Hướng dẫn: Bạn sẽ nghe một số đoạn hội thoại giữa hai người trở lên. " +
            "Bạn sẽ phải trả lời ba câu hỏi về nội dung người nói trong mỗi đoạn hội thoại. " +
            "Chọn đáp án phù hợp nhất cho mỗi câu hỏi và đánh dấu chữ cái (A), (B), (C) hoặc (D) trên phiếu trả lời. " +
            "Các đoạn hội thoại sẽ không được in trong sách đề thi và chỉ được đọc một lần.",
            null, null),
        ("PART", null, 4,
            "Directions: You will hear some talks given by a single speaker. " +
            "You will be asked to answer three questions about what the speaker says in each talk. " +
            "Select the best response to each question and mark the letter (A), (B), (C), or (D) on your answer sheet. " +
            "The talks will not be printed in your test book and will be spoken only one time.",
            "Hướng dẫn: Bạn sẽ nghe một số bài nói do một người nói thực hiện. " +
            "Bạn sẽ phải trả lời ba câu hỏi về nội dung người nói trong mỗi bài nói. " +
            "Chọn đáp án phù hợp nhất cho mỗi câu hỏi và đánh dấu chữ cái (A), (B), (C) hoặc (D) trên phiếu trả lời. " +
            "Các bài nói sẽ không được in trong sách đề thi và chỉ được đọc một lần.",
            null, null),
        ("SECTION", "READING", null,
            "In the Reading test, you will read a variety of texts and answer several different types of reading comprehension questions. " +
            "The entire Reading test will last 75 minutes. There are three parts, and directions are given for each part. " +
            "You are encouraged to answer as many questions as you can within the time allowed. " +
            "You must mark your answers on the separate answer sheet. Do not write your answers in your test book.",
            "Trong phần thi Đọc, bạn sẽ đọc nhiều loại văn bản và trả lời nhiều dạng câu hỏi đọc hiểu khác nhau. " +
            "Toàn bộ phần thi Đọc kéo dài 75 phút. Có ba phần, và hướng dẫn được đưa ra cho từng phần. " +
            "Bạn nên trả lời càng nhiều câu càng tốt trong thời gian cho phép. " +
            "Bạn phải đánh dấu câu trả lời trên phiếu trả lời riêng. Không viết câu trả lời vào sách đề thi.",
            null, null),
        ("PART", null, 5,
            "Directions: A word or phrase is missing in each of the sentences below. " +
            "Four answer choices are given below each sentence. Select the best answer to complete the sentence. " +
            "Then mark the letter (A), (B), (C), or (D) on your answer sheet.",
            "Hướng dẫn: Mỗi câu dưới đây bị thiếu một từ hoặc cụm từ. " +
            "Bốn đáp án được cho bên dưới mỗi câu. Chọn đáp án đúng nhất để hoàn thành câu. " +
            "Sau đó đánh dấu chữ cái (A), (B), (C) hoặc (D) trên phiếu trả lời.",
            null, null),
        ("PART", null, 6,
            "Directions: Read the texts that follow. A word, phrase, or sentence is missing in parts of each text. " +
            "Four answer choices for each question are given below the text. Select the best answer to complete the text. " +
            "Then mark the letter (A), (B), (C), or (D) on your answer sheet.",
            "Hướng dẫn: Đọc các đoạn văn sau. Mỗi đoạn văn bị thiếu một từ, cụm từ hoặc câu ở một số chỗ. " +
            "Bốn đáp án cho mỗi câu hỏi được cho bên dưới đoạn văn. Chọn đáp án đúng nhất để hoàn thành đoạn văn. " +
            "Sau đó đánh dấu chữ cái (A), (B), (C) hoặc (D) trên phiếu trả lời.",
            null, null),
        ("PART", null, 7,
            "Directions: In this part you will read a selection of texts, such as magazine and newspaper articles, " +
            "e-mails, and instant messages. Each text or set of texts is followed by several questions. " +
            "Select the best answer for each question and mark the letter (A), (B), (C), or (D) on your answer sheet.",
            "Hướng dẫn: Trong phần này, bạn sẽ đọc một số văn bản như bài báo, tạp chí, email và tin nhắn nhanh. " +
            "Mỗi văn bản hoặc nhóm văn bản được theo sau bởi một số câu hỏi. " +
            "Chọn đáp án đúng nhất cho mỗi câu hỏi và đánh dấu chữ cái (A), (B), (C) hoặc (D) trên phiếu trả lời.",
            null, null),
    };
}
