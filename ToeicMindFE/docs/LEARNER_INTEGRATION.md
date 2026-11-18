# Tích hợp giao diện người học vào ToeicMindFE

Cập nhật 14/11/2026. Nguồn: `../LEARNER` (HTML/JS thuần, hash route). Đích: ToeicMindFE (React 19, Vite, react-router-dom 7). Đọc cùng [AUTH_INTEGRATION.md](AUTH_INTEGRATION.md) và [quy chuẩn giao diện](DESIGN_SYSTEM.md).

Backend `../ToeicMind` **không đổi mã**. Chỉ thay: `.env.example` và `Docs/VIP_PAYMENT_2026-11-13.md` (URL trang kết quả thanh toán), cùng một dòng cấu hình cục bộ `VnPay__FrontendResultUrl` trong `.env` (xem mục 3).

## 1. Trang và API

Đăng nhập xong mở **Trang chủ** (`/`). Trang Tài khoản nằm ở `/account`, mở từ menu người dùng. Từ 18/11/2026 trang này không còn JSON UserDto hay hạn token; người dùng tự sửa tên hiển thị và đổi mật khẩu (xem AUTH_INTEGRATION.md). Đổi đích sau đăng nhập tại `LANDING_PATH` trong `src/routes/learnerRoutes.js`. Người dùng mở trang cần đăng nhập khi chưa có phiên sẽ quay lại đúng trang đó sau khi đăng nhập.

| Đường dẫn | Trang LEARNER cũ | API chính |
| --- | --- | --- |
| `/` | `#/` | `GET /api/me/dashboard` |
| `/tests` + hộp “Chọn chế độ” | `#/tests` | `/exam-sets`, `/exams`, `/exams/{id}/modes`, `POST /attempts` |
| `/attempt/:id` | `#/attempt/{id}` | Luyện thi liền mạch: `/exams/{id}/directions`, `/parts/{n}`, `/parts/{n}/media`, `PUT /attempts/{id}/answers/{q}`, `/direction-time`, `/submit`. Luyện tập/ngân hàng: chấm ngay kèm giải thích |
| `/result/:id`, `/review/:id` | `#/result`, `#/review` | `GET /attempts/{id}/result[?includeReview=true]` |
| `/history` | `#/history` | `GET/DELETE /attempts` |
| `/listen/:tab`, `/read/:tab` | `#/listen`, `#/read` | `/bank/parts/{n}/cards`, `POST /bank/attempts`, `/grammar/topics`, `/dictation/*` |
| `/dictation/items`, `/dictation/item/:id` | `#/dictation/*` | `/dictation/items`, `/items/{id}`, `POST …/progress` |
| `/vocab`, `/vocab/learn`, `/vocab/play`, `/vocab/words`, `/vocab/mine` | `#/vocab*` | `/vocab/overview`, `/sets/{id}/exams`, `/words`, `/study`, `POST /{id}/review`, `/me/vocabulary` |
| `/reports` | `#/reports` | `GET /reports`, `POST /reports` |
| `/vip`, `/vip/result` | `#/vip`, `#/vip/result` | `/vip/plans`, `/vip/me`, `/vip/orders` |

Liên kết hash cũ (`/#/vip/result?...`) được đổi sang đường dẫn khi mở ở gốc `/` (`legacyHashToPath`). Màn làm bài (`/attempt/:id`) ẩn thanh điều hướng để tập trung. Hộp thoại dùng `<dialog>` native; thông báo dùng vùng `aria-live`; không dùng `alert`.

**Không port** từ LEARNER: trang “Ghi nhớ” kèm công cụ thử nghiệm (tua ngày, tạo dữ liệu mẫu, xuất JSON) và bộ theo dõi lưu `localStorage`. Độ quen thuộc nay lấy từ lịch ôn SM-2 ở máy chủ (đồng bộ giữa thiết bị) và từ kết quả từng phiên. Trang `/vocab/study` (thẻ SM-2 cổ điển) được thay bằng dạng Memory Cards trong phiên học.

## 2. Học từ vựng: mỗi từ 2–3 dạng câu hỏi ngẫu nhiên

Mỗi từ trong một phiên được hỏi bằng **2 hoặc 3 dạng khác nhau**, chọn ngẫu nhiên trong 7 dạng: Word Quiz, Word Matching, Word Scramble, True or False, Fill in the Blank, Memory Cards, Missing Letters (người học có thể tắt bớt, tối thiểu 2 dạng).

- **Lập kế hoạch** (`features/vocab/engine/planner.js`): chọn số dạng (2 hoặc 3) và các dạng cho từng từ; cân bằng để mọi dạng đều xuất hiện, dạng yếu (đúng/sai 50%, tự chấm) ít được chọn hơn cho từ đã quen. Dạng không chơi được với từ (không có câu ví dụ/định nghĩa, từ quá ngắn…) không bao giờ được gán.
- **Chia vòng**: vòng 1 gồm câu đầu của mọi từ, vòng 2 câu thứ hai… nên hai câu của cùng một từ cách nhau cả một vòng — đo độ nhớ thật, không phải nhớ ngắn hạn. Ghép cặp gộp 3–6 từ cùng vòng thành một màn.
- **Chấm từng câu**: sai / đúng nhưng chậm (quá thời gian của dạng, hoặc dùng gợi ý) / đúng / đúng nhanh. Độ khó khởi điểm lấy từ tiến độ SM-2 của từ (hoặc cố định theo lựa chọn); ở chế độ tự động còn tăng sau câu đúng nhanh, giảm sau câu sai.
- **Độ quen thuộc của từ** (sau khi đủ 2–3 câu): sai hết → *Chưa quen* (0); sai một phần → *Mới quen* (1); đúng hết với điểm trung bình ≥ 2,5 (chậm 1, đúng 2, nhanh 3) → *Rất quen* (3), ≥ 1,75 → *Quen* (2), thấp hơn → *Mới quen*.
- **Lưu**: mỗi từ gửi **một** `POST /api/vocab/{id}/review { grade }` với grade = mức trên (0 Quên, 1 Khó, 2 Nhớ, 3 Dễ), chỉ cho từ mới hoặc đã đến hạn để luyện tự do không làm lệch lịch ôn. Lỗi mạng giữ kết quả và cho “Thử lưu lại” ở màn tổng kết.
- **Tổng kết**: độ chính xác, phân bố độ quen thuộc, bảng từng từ (nhãn, các dạng đã làm ✓/✗/chậm, lịch ôn kế tiếp lấy từ máy chủ), thống kê theo dạng.

Mã thuần (không phụ thuộc React) nằm ở `features/vocab/engine/` và có test ở `tests/vocabEngine.test.js`; phần hiển thị từng dạng ở `features/vocab/modes/`.

## 3. Thanh toán VIP (VNPay) — hướng dẫn test

Luồng: `/vip` → chọn gói → `POST /api/vip/orders` trả `paymentUrl` → trình duyệt sang VNPay → VNPay đưa trình duyệt về `ReturnUrl` (backend `GET /api/vip/vnpay-return`, chốt đơn một lần) → backend chuyển 302 về `FrontendResultUrl?status=PAID|FAILED|INVALID|NOT_FOUND&txnRef=…` → `/vip/result` hiển thị kết quả, menu người dùng hiện “VIP · còn N ngày”.

1. **Cơ sở dữ liệu**: cần bảng VIP (`Docs/DATABASE/01_schema.sql`, phần D — CHG-006). Kiểm tra: `GET /api/vip/plans` trả các gói.
2. **Cấu hình backend** (`../ToeicMind/.env`, nạp lúc khởi động nên phải **khởi động lại backend** sau khi đổi):

   | Khóa | Giá trị |
   | --- | --- |
   | `VnPay__TmnCode`, `VnPay__HashSecret` | Từ Merchant Admin VNPay sandbox (không đưa vào mã, tài liệu hay log) |
   | `VnPay__PaymentUrl` | `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` |
   | `VnPay__ReturnUrl` | `http://localhost:5078/api/vip/vnpay-return` |
   | `VnPay__FrontendResultUrl` | `http://localhost:5173/vip/result` |

   Ngày 14/11/2026 dòng `VnPay__FrontendResultUrl` trong `.env` cục bộ được đổi từ `http://localhost:8000/#/vip/result` (giao diện HTML cũ) sang giá trị trên; các khóa khác giữ nguyên. Muốn quay lại LEARNER cũ thì đặt lại giá trị cũ.
3. **Kiểm tra cấu hình**: `npm run check:payment`. Đọc `.env` backend, kiểm từng khóa (chỉ báo “đã đặt/trống”, không in bí mật), gọi `GET /api/vip/plans` và proxy của Vite, rồi in việc cần sửa.
4. **Chạy**: backend `dotnet run --launch-profile http` (cổng 5078) và `npm run dev` (cổng 5173). Đăng nhập bằng tài khoản người học → **VIP** → chọn gói → thanh toán trên VNPay sandbox bằng thẻ test (nằm trong `Docs/## Cấu hình (Sandbox).txt` của backend) → tự quay về `/vip/result`.
5. **Kết quả mong đợi**: `PAID` “Thanh toán thành công” kèm hạn VIP; hủy/thất bại → `FAILED` “chưa bị trừ tiền”; chữ ký sai → `INVALID`. Quay lại trang VIP thấy đơn “Đã thanh toán” và nút “Gia hạn”.
6. **Gỡ lỗi nhanh**: thanh toán xong mà không về giao diện → `FrontendResultUrl` sai hoặc chưa khởi động lại backend; “Hệ thống đang gặp sự cố” khi chọn gói → thiếu bảng VIP; “Cổng thanh toán VNPay chưa được cấu hình” → thiếu `TmnCode`/`HashSecret`/`ReturnUrl`. Hết phiên giữa chừng thì đăng nhập lại sẽ về đúng trang kết quả. IPN (`vnpay-ipn`) cần URL công khai; ở local trạng thái vẫn được chốt qua return URL.

## 4. Cấu trúc mã

```text
src/
├── App.jsx                     # Phiên, onboarding mật khẩu; chưa đăng nhập → AuthLayout, đã đăng nhập → LearnerLayout
├── routes/                     # LearnerRoutes.jsx (lazy), learnerRoutes.js (điều hướng, đường dẫn thuần JS)
├── components/layout/          # LearnerLayout (thanh điều hướng, menu người dùng, hộp mời nâng cấp VIP)
├── components/ui/              # Icon, Badges, Controls, Dialog, Feedback + Brand/GoogleIcon dùng chung
├── providers/                  # Toast, Confirm
├── hooks/                      # useAsync, useHotkeys, useStoredState, useDocumentTitle
├── lib/                        # apiClient (refresh token), learnerHttp (Bearer + query + 402/503), format, sanitize, speech
├── features/
│   ├── auth/                   # đăng nhập/đăng ký/quên mật khẩu/tài khoản (giữ nguyên)
│   ├── home/  exams/  bank/  dictation/  vocab/  reports/  vip/
└── styles/                     # tokens, global, auth, components, learner, vocab, exam, dictation
scripts/                        # mock-learner-api/content (backend GIẢ), ui-harness, check-*-ui, check-payment-setup, capture-screens
tests/                          # npm test (node --test)
```

HTML đoạn văn/bài đọc do quản trị biên soạn luôn đi qua `lib/sanitize.js` (DOMPurify) trước khi chèn. Mọi lời gọi API người học đi qua `lib/learnerHttp.js`; token hết hạn được làm mới tự động (một lượt refresh dùng chung).

## 5. Bằng chứng kiểm tra (14/11/2026)

| Kiểm tra | Kết quả | API |
| --- | --- | --- |
| `npm test` | 63/63 (35 xác thực có sẵn + 28 mới: động cơ từ vựng, lập kế hoạch 2–3 dạng/từ trên 60 hạt giống, chấm độ quen, nghe chép, tùy chọn thi, đường dẫn, lỗi 503) | — |
| `npm run lint`, `npm run build` | Không cảnh báo; build đạt, trang tải theo nhu cầu | — |
| `node scripts/check-vocab-ui.mjs` (Chromium) | Đạt 4/4 lần: mỗi từ 2–3 dạng khác nhau, grade gửi `/review` khớp nhãn độ quen, mỗi từ một lần, luyện tự do không đổi lịch ôn, 320px | **Mock** |
| `node scripts/check-learner-ui.mjs` (Chromium) | Đạt: đăng nhập/điều hướng, trang chủ, Luyện tập, Luyện thi liền mạch (tự phát/tự chuyển, cộng bù giờ hướng dẫn, không lộ đáp án khi đang làm, bảng đáp án + đáp án chi tiết sau khi nộp), ngân hàng câu hỏi, nghe chép 3 chế độ, lịch sử, từ của tôi, báo lỗi, VIP đầu-cuối qua cổng thanh toán giả (PAID/FAILED/INVALID/NOT_FOUND, hash cũ, hết phiên), lọc HTML độc hại, 320px | **Mock** |
| Backend thật (build từ mã nguồn, `.env` của bạn, chỉ gọi đường không ghi dữ liệu) | `vnpay-return` chữ ký sai → 302 `http://localhost:5173/vip/result?status=INVALID`; IPN → `97`; tạo đơn khi chưa đăng nhập → 401; `GET /vip/plans` → 3 gói; hình dạng JSON của các API công khai (đề thi, từ vựng, ngân hàng, ngữ pháp, nghe chép, VIP) khớp các trường giao diện đọc | **Thật** (chỉ đọc) |
| `node scripts/check-auth-ui.cjs` (Chromium, cổng 5173) | Đạt: Google popup, onboarding mật khẩu, bỏ qua/thiết lập, kiểm tra form, khôi phục phiên, đăng xuất, UserDto, đăng ký, 320px; sau đăng nhập mở Trang chủ rồi vào `/account` | **Mock** (API xác thực giả trong script) |
| Admin sau khi đồng bộ token/icon | `npm run build` đạt, `npm test` 59/59. Kịch bản `check-auth-ui.cjs` của Admin **chưa chạy được**: nó đọc `.user-dto-json` trên trang tài khoản cũ, còn Admin đã chuyển sang `AdminAccountPage` (thay đổi riêng của Admin, không phải do đồng bộ token/icon) | — |

Chạy lại kiểm tra giao diện: cần Playwright, ví dụ `PLAYWRIGHT_MODULE=../ToeicMindAdmin/node_modules/playwright npm run test:ui` (bật backend giả ở cổng 5078 và Vite ở 5173 nên **tắt backend thật** trước). Backend giả chỉ dùng dữ liệu tự tạo. Riêng `scripts/check-auth-ui.cjs` không tự bật Vite: chạy `npm run dev` trước (đặt `UI_HOST=localhost` nếu Vite chỉ nghe IPv6).

## 5b. Cá nhân hóa và kiểm tra đầu vào (17/11/2026, CHG-007)

Backend có mã mới (xem `../ToeicMind/Docs/PERSONALIZATION_2026-11-17.md`); **phải chạy phần E của `Docs/DATABASE/01_schema.sql`** trên database đích trước, nếu không các trang mới báo "chưa có phần cá nhân hóa (CHG-007)" còn các trang cũ vẫn chạy.

| Đường dẫn | Nội dung | API |
| --- | --- | --- |
| `/plan` (menu **Lộ trình**) | Kết quả kiểm tra đầu vào, mục tiêu (hộp đặt điểm/ngày thi/phút mỗi ngày), trình độ từng kỹ năng, **Kế hoạch hôm nay** và gợi ý thêm, chủ điểm cần củng cố/đã vững, phân tích theo Part | `GET /me/learning-plan`, `PUT /me/profile` |
| `/placement` | Giới thiệu bài kiểm tra, bắt đầu/làm tiếp, kết quả gần nhất | `GET /placement`, `POST /placement/attempts` |
| `/attempt/:id` (Scope `PLACEMENT`) | `PlacementRunner`: có đồng hồ theo máy chủ, không báo đúng/sai, đổi/bỏ chọn đáp án, Part 1–2 chỉ hiện A/B/C, tự nộp khi hết giờ | `/attempts/*` |
| `/result/:id`, `/review/:id` | Điểm ước tính, Level Nghe/Đọc, nút "Xem lộ trình"; được xem lại đáp án | `/attempts/{id}/result` |
| `/` | Mời kiểm tra đầu vào (khi chưa làm) và khối **Hôm nay nên học** (3 gợi ý); lỗi tải thì ẩn khối, Trang chủ vẫn dùng được | `GET /me/learning-plan` |

Mỗi gợi ý mở thẳng bài đã chia trong database: thẻ ngân hàng (`useStartBank`, cùng hộp "hết câu mới → làm lại toàn bộ"), `/vocab/play?src=REVIEW|NEW&n=…`, `/dictation/items?status=…&levelNo=…`, `/tests`, `/placement`. Mã thuần ở `features/plan/planModel.js` (test `tests/planModel.test.js`). Admin thiết lập bài ở mục **Kiểm tra đầu vào** (`/placement-tests` của ToeicMindAdmin).

Bằng chứng 17/11/2026: `npm run lint` sạch, `npm test` 67/67, `npm run build` đạt. Chromium với **backend thật** (bản build mới, cổng 5099) trên **bản sao database** (tạm, đã xóa): Admin tạo bài bằng gợi ý tự động + thêm tay → người học thấy lời mời ở Trang chủ, làm 43/43 câu qua 7 Part, nộp, xem điểm ước tính/Level, xem lại; đặt mục tiêu (báo lỗi điểm không chia hết cho 5), lộ trình cập nhật và có gợi ý thi thử khi sắp thi; mở gợi ý chủ điểm yếu ra lượt ngân hàng; 360px không tràn ngang; không lỗi JavaScript. Chưa thử với database ứng dụng.

**Hướng dẫn làm bài chỉ tiếng Anh (17/11/2026):** màn hướng dẫn của Luyện thi và hộp "Hướng dẫn" khi Luyện tập chỉ hiện `directionsEn`/`exampleEn` (tiêu đề "Listening Test"/"Reading Test", "Example"), không hiện `directionsVi`/`exampleVi` dù API vẫn trả. Kiểm bằng `check-learner-ui.mjs` (**mock**).

**Luyện thi xem đáp án sau khi nộp (17/11/2026, sửa BR-09):** trang `/result/:id` của mọi chế độ (kể cả Luyện thi) có khối **Đáp án**: ô từng câu theo Part gồm số câu, đáp án đúng, lựa chọn sai (gạch ngang) hoặc "–" khi bỏ trống, đếm Đúng/Sai/Bỏ trống; bấm ô mở `/review/:id#q-{questionId}` (cuộn tới câu). Trang **Đáp án chi tiết** lọc Tất cả/Câu sai/Bỏ trống/Câu đúng kèm số lượng, mỗi câu có dòng "Đáp án đúng: X · Bạn chọn: Y" và giải thích. Cần backend mới: `questions[]` có `selectedLabel`/`correctLabel`, `Learning:AllowExamReview` mặc định `true` (khi đặt `false` trang kết quả hiện lời báo "đang tắt xem đáp án"). Mã thuần ở `features/exams/resultModel.js` (test `tests/resultModel.test.js`). Kiểm: lint sạch, `npm test` 72/72, build đạt, `check-learner-ui.mjs` đạt (**mock**, cổng 5088/5183); chưa thử với backend thật.

**Đáp án chi tiết tách 3 khối (17/11/2026):** `features/exams/components/AnswerDetails.jsx` gồm `ExplanationCard` (Giải thích: tách "Bước N:" thành từng bước, "Mẹo:/Lưu ý:" thành ô gợi ý), `OptionAnalysis` (Phân tích các đáp án: mỗi phương án A–D một dòng kèm nhãn Đúng/Sai bằng chữ và màu, "bạn chọn"), `VocabCards` (Từ vựng liên quan dạng thẻ: từ, loại từ, IPA, CEFR, nghĩa, nghĩa trong câu, từ gốc, ví dụ; nút **Lưu vào bộ từ** từng thẻ, **Lưu tất cả (n)**, nút phát âm) và `Transcript` (script ghép từng câu tiếng Anh với bản dịch, nhãn (A)–(D), in đậm người nói; số dòng lệch thì hiện hai khối). Dùng ở trang Đáp án chi tiết và khi Luyện tập hiện đáp án. Văn bản do quản trị nhập không theo mẫu thì hiện nguyên văn. Mã tách ở `features/exams/answerDetails.js` (test `tests/answerDetails.test.js`). Trang Đáp án chi tiết: ảnh/audio bên trái, script bên phải (một cột dưới 900px), phương án 2 cột (một cột dưới 720px).

**Thiết lập mục tiêu bắt buộc (17/11/2026):** sau khi đăng ký/đăng nhập, nếu `GET /me/profile` trả `isSet = false` thì mọi trang chuyển về `/welcome` (toàn màn hình, không có thanh điều hướng, có nút Đăng xuất). Bước 1: điểm mục tiêu và số phút mỗi ngày bắt buộc, ngày thi tùy chọn (`GoalForm` dùng chung với hộp mục tiêu ở Lộ trình). Bước 2: mời làm kiểm tra đầu vào (nếu Admin đã bật) hoặc "Để sau" → về trang định mở. Lỗi tải hồ sơ (mạng, 503 chưa chạy phần E CHG-007) không chặn. Đã thiết lập thì nhớ trên máy (`toeicmind_fe_profile_ok_{userId}`), không hỏi lại máy chủ. Áp dụng cho mọi tài khoản chưa từng lưu mục tiêu, kể cả tài khoản cũ. Mã: `features/plan/useProfileGate.js`, `WelcomePage.jsx`, `onboardingRedirect`/`needsOnboarding` trong `planModel.js`.

Kiểm tra hai mục trên: `npm test` 83/83, lint sạch, build đạt; `check-learner-ui.mjs` đạt (**mock**): 3 khối, lưu từng từ và lưu tất cả, script ghép cặp, tài khoản mới bị chuyển về `/welcome` (không đi vòng, lỗi tại ô, không gửi khi thiếu), lưu → bước 2 → về trang định mở, đã thiết lập thì `/welcome` → `/plan`; `check-auth-ui.cjs` đạt (Vite 5173, API xác thực giả). Chưa thử với backend thật.

**Đáp án chi tiết dạng không gian học (18/11/2026):** `/review/:id` dùng lại bố cục của Luyện tập, chạy toàn màn hình (thêm vào `FOCUS_ROUTES`), mỗi lần một nhóm câu:
- **Thanh trên:** nút "Kết quả", tên đề "· Xem lại kết quả", "Câu x/N", số câu đúng/sai/bỏ trống.
- **Khung trái:** câu dẫn, thanh âm thanh (sóng âm, tua 3s/5s, nghe lại, tốc độ; không tự phát), hình, đoạn văn.
- **Khung phải:** từng câu có nhãn Đúng/Sai/Bỏ trống; đáp án đúng tô xanh, lựa chọn sai tô đỏ, câu bỏ trống vẫn tô đáp án đúng; nút báo lỗi và đánh dấu; các khối bật/tắt Script & bản dịch / Giải thích chi tiết / Từ vựng nên học (`RevealPanels`).
- **Thanh dưới:** Báo lỗi, Từ của tôi, bộ lọc Tất cả/Sai/Đúng/Bỏ trống/Đánh dấu kèm số câu, nút câu trước/sau và nút "x/N" mở bảng chọn câu (`QuestionNavigator` chế độ `review`, nhóm ngoài bộ lọc bị làm mờ).
- **Phím tắt:** ←/→ chuyển câu, P/J/R điều khiển âm thanh.
- **Vị trí:** giữ trên URL `#q-{questionId}`; liên kết từ bảng đáp án ở trang kết quả mở đúng nhóm.
- Dấu sao dùng chung với lượt luyện (`toeicmind_fe_marks_{attemptId}`).
- Màn ≤ 480px: thanh dưới hai hàng (nút công cụ chỉ biểu tượng + điều hướng; bộ lọc cuộn ngang).
- Mô hình thuần `reviewModel`, `groupMatches`, `reviewCounts`, `nextGroupIndex` ở `features/exams/resultModel.js` (có test).
- Kiểm: lint sạch, `npm test` 93/93, build đạt, `check-learner-ui.mjs` đạt (**mock**; thêm bước kiểm nhãn trạng thái, âm thanh, khối bật/tắt, bảng chọn câu, phím ←/→, tải lại giữ vị trí), ảnh chụp 1440px và 375px không tràn ngang. Chưa thử với backend thật.

**Rà soát khả năng tiếp cận (17/11/2026, theo skill ui-ux-pro-max + WCAG 2.2 AA):** quét tự động trên Chromium (**mock**) màn Luyện tập hiện đáp án, Kết quả, Đáp án chi tiết, `/welcome` hai bước: mọi chữ đạt tương phản 4.5:1 và mọi vùng bấm ≥ 24px, trừ `Pill` tone `muted` dùng chung (4.38:1). Lỗi này đã sửa ngày 18/11 khi áp quy chuẩn 2.0, xem đoạn dưới. Đã sửa: chữ xám trên nền xám/xanh của bảng đáp án, thẻ từ đã lưu (chỉ đổi viền, giữ nền sáng), nhãn "Bạn chọn"; tên đọc của nút lưu từ chứa chữ hiển thị (`Lưu vào bộ từ: <từ>`, WCAG 2.5.3); "Báo lỗi" và dòng mở script cao ≥ 28px. Vòng focus và giảm chuyển động có sẵn ở `global.css`.

**Áp Quy chuẩn thiết kế 2.0 — Calm Focus Learning (18/11/2026):** chi tiết ở mục 14.8 của `../ToeicMindAdmin/docs/DESIGN_SYSTEM.md`, đối chiếu từng vấn đề ở `docs/UI_AUDIT_2026-11-17.md`.
- Giữ xanh lá và Manrope; token ngữ nghĩa giống hệt nhau ở hai ứng dụng.
- Không còn mã hex/rgba ngoài `tokens.css`; chữ tối thiểu 12px.
- Nút 44px, ô nhập 48px; focus chuyển tới `main` sau khi đổi trang.
- Kiểm tra (**mock**): `check-learner-ui`, `check-vocab-ui`, `check-auth-ui` đạt. Quét WCAG 2.2 AA 23 màn ở 1280px và 375px: 0 lỗi. `npm test` 83/83.
- `check-auth-ui.cjs` nay chờ chuyển trang xong sau đăng ký, vì sau đăng nhập còn bước kiểm tra hồ sơ mục tiêu.
- Trang chủ sắp lại theo mục 14.5:
  - Hàng đầu: bên trái "Hôm nay nên học" và bài đang dở; bên phải thẻ "Thành tích của bạn" gom 4 số liệu thành lưới 2×2, thay cho hàng 4 thẻ ngang cấp trước đây.
  - Tiếp theo: lối tắt; rồi "Tiến độ theo Part" (chân thẻ có tổng số câu đã luyện) bên cạnh cột "Lịch học 12 tuần" + "Điểm các bài Luyện thi"; cuối cùng là bài làm gần đây.
  - Các cột giãn bằng nhau nên không còn khoảng trống.
  - Trên điện thoại xếp một cột cùng thứ tự; lối tắt dạng lưới 2×2.
  - Lớp CSS: `.home-*` trong `learner.css`.
- Trang Lộ trình `/plan` sắp lại (18/11/2026):
  - **Hàng tổng quan:** Mục tiêu (có thanh "Đã đạt n% mục tiêu"), Kết quả kiểm tra đầu vào, Trình độ theo kỹ năng. Ba thẻ cao bằng nhau, phần chân thẻ dồn xuống đáy.
    - Khi chưa có kết quả, hoặc bài kiểm tra đầu vào đang làm dở, lời mời chiếm cả hàng phía trên. Hàng tổng quan khi đó còn 2 thẻ.
  - **Hai cột:** việc cần làm (Kế hoạch hôm nay, Gợi ý thêm) | phân tích (Phân tích theo Part, Chủ điểm cần củng cố, Chủ điểm đã vững).
  - **Co dãn theo bề rộng:**
    - Hàng tổng quan: 3 cột → 2 cột ở ≤1100px (thẻ Trình độ trải cả hàng) → 1 cột ở ≤640px.
    - Hai cột chính thành 1 cột ở ≤900px.
    - Tên Part quá dài thì rút gọn bằng "…", không xuống dòng.
  - Lớp CSS: `.plan-overview`, `.plan-layout`, `.plan-card` trong `plan.css`.
  - Mock có thêm `GET /me/learning-plan`, theo đúng dạng `LearningPlanDto`.
  - `check-learner-ui` kiểm thứ tự các thẻ, và trang `/plan` ở 320px không tràn ngang.

**Luyện tập: tùy chọn "Hiện đáp án ngay" (17/11/2026):** bật/tắt trong hộp Chọn chế độ (tab Luyện tập) hoặc nút **Đáp án ngay: Bật/Tắt** trên thanh làm bài; lưu ở `localStorage` khóa `toeicmind_fe_practice_options` (`readPracticeOptions`/`writePracticeOptions` trong `examOptions.js`), mặc định bật. Bật: chọn là chấm ngay kèm giải thích (như cũ). Tắt: `saveAnswer(..., reveal=false)` chỉ lưu lựa chọn, đổi được; mỗi câu có nút **Xem đáp án**, cột phải có **Xem đáp án các câu đã chọn (n)**; câu chưa xem được chấm khi Kết thúc. Từ 18/11/2026, nút trên thanh làm bài được thay bằng công tắc **Hiện đáp án ngay** trong khung câu hỏi (xem đoạn "Không gian học" bên dưới). Cần backend mới (trường `reveal` trong body; backend cũ từ chối trường lạ → 400). Kiểm: `npm test` 74/74, `check-learner-ui.mjs` đạt (**mock**): đổi lựa chọn trước khi xem, xem từng câu, xem tất cả, body gửi `reveal: false, false` rồi mới chấm, tùy chọn được nhớ sau khi tải lại.

**Không gian học cho Luyện tập và Luyện thi (18/11/2026):** giao diện dựng lại theo ảnh mẫu của người dùng, nhưng giữ màu xanh lá và Manrope của mục 14 thay cho màu xanh dương trong ảnh. Quy ước giao diện chung xem mục 14.8 của DESIGN_SYSTEM.md.
- **Mã nguồn:**
  - `features/exams/workspace/`:
    - `StudyLayout.jsx`: các khối `StudyLayout`, `StudySplit`, `StudySolo`, `StudyBottom`, `Switch`.
    - `AudioBar.jsx` và `useAudioPlayer.js`.
    - `ContextPane.jsx`, `QuestionCard.jsx` (gồm `RevealPanels`), `QuestionNavigator.jsx`.
    - `studyModel.js`: chia nhóm câu, đánh số, trạng thái câu, sóng âm. Có test ở `tests/studyModel.test.js`.
  - CSS ở `styles/study.css`.
- **Luyện tập** (`PracticeRunner`):
  - Mỗi màn là một nhóm câu. Đề thi xếp theo Part rồi số câu; ngân hàng câu hỏi giữ thứ tự và đánh số lại từ 1.
  - Âm thanh có sóng âm tua được, lùi 3s/5s, Nghe lại và tốc độ 0.75–1.5x.
  - Phím tắt: ←/→ đổi nhóm câu; P phát/dừng; J lùi 3s; R nghe lại; 1–4 hoặc A–D chọn đáp án.
  - Part 1–2 chỉ hiện (A)–(D); nút "Hiện chữ Part 1–2" hiện nội dung đáp án.
  - Đánh dấu sao từng câu.
  - Sau khi xem đáp án có 3 công tắc, trạng thái được nhớ:
    - "Script & bản dịch" (Reading: "Bản dịch");
    - "Giải thích chi tiết" (Giải thích + Phân tích các đáp án), bật sẵn;
    - "Từ vựng nên học".
  - Bảng câu hỏi bấm được để chuyển câu.
  - Nhớ vị trí đang làm khi tải lại.
- **Luyện thi** (`ExamRunner`): logic không đổi; hướng dẫn tự phát/tự chuyển, không quay lại, hết giờ tự nộp.
  - Màn hướng dẫn và màn kết thúc là một khung (`StudySolo`).
  - Nhóm câu dùng hai khung. Âm thanh không tua được (sóng âm chỉ là thanh tiến độ).
  - Đồng hồ và nút Nộp bài nằm trên thanh trên.
  - Bảng câu hỏi chỉ để xem: không bấm chuyển, chỉ phân biệt Đã chọn/Chưa làm, không lộ đúng/sai.
- **Khóa `localStorage` mới:**
  - `toeicmind_fe_study_split`: tỉ lệ hai khung.
  - `toeicmind_fe_audio_rate`: tốc độ âm thanh.
  - `toeicmind_fe_study_panels`: trạng thái 3 công tắc.
  - `toeicmind_fe_marks_{attemptId}`: câu đã đánh dấu sao.
  - Mọi khóa chỉ lưu trên máy, đọc ghi có `try/catch`.
- **Không làm theo ảnh mẫu:**
  - Nút "Tra từ": chưa có dịch vụ từ điển.
  - "Giỏ từ" thay bằng liên kết "Từ của tôi".
  - "Dịch câu hỏi" chỉ có sau khi xem đáp án, vì bản dịch đến từ phần chấm của backend.
- **Kiểm tra (backend giả, Chromium thật):**
  - `npm test` 88/88, lint sạch, build đạt.
  - `check-learner-ui.mjs` và `check-vocab-ui.mjs` đạt.
  - Quét WCAG 2.2 AA ở 1280px và 375px: 0 lỗi (gồm 4 màn mới: Part 1 hai khung, bảng câu hỏi, đã chấm có 3 khối, câu sai).
  - `capture-screens.mjs` đã cập nhật bộ chọn và chạy được.
  - Chưa thử với backend thật.

**Tài khoản và Lịch sử VIP (18/11/2026, CHG-008):**
- **`/account`:**
  - hồ sơ, form sửa tên hiển thị (`PUT /api/auth/me`), form đổi mật khẩu (giữ phiên bằng cách đăng nhập lại);
  - không còn JSON UserDto hay hạn token.
- **`/vip`:** thêm "Lịch sử VIP" (`GET /api/vip/history`) trước "Lịch sử thanh toán":
  - "Mua <gói> · số tiền · mã đơn";
  - "Được quản trị viên tặng N ngày VIP · Miễn phí";
  - "VIP đã được quản trị viên kết thúc".
- VIP do quản trị viên tặng không phải thanh toán nên không có trong "Lịch sử thanh toán". Lý do nội bộ của quản trị viên không hiển thị cho người học.
- Backend cũ (404) hoặc database chưa chạy phần F (503) thì trang VIP vẫn hoạt động, chỉ báo chưa tải được lịch sử.
- **Mock:** `GET /vip/history`, `/__mock/vip-grant`, `PUT /auth/me`, `PUT /auth/change-password` (mật khẩu hiện tại của mock: `secret123`).
- Chi tiết backend ở `../ToeicMind/Docs/VIP_HISTORY_2026-11-18.md`.

Chạy kịch bản giao diện khi 5078/5173 đang bận (backend/Vite thật đang chạy): đặt `UI_API_PORT` và `UI_WEB_PORT`, ví dụ `UI_API_PORT=5088 UI_WEB_PORT=5183`.

## 6. Chưa kiểm chứng và hạn chế

- **Chưa thanh toán bằng thẻ test trên giao diện VNPay sandbox** từ ToeicMindFE (cần thao tác thủ công trong trình duyệt). Phần giao diện gửi người dùng đi và nhận kết quả đã được kiểm với cổng giả và với đường chữ ký sai của backend thật. Chữ ký VNPay hợp lệ **nhận về** cũng chưa từng được xác nhận bằng một giao dịch thật (báo cáo VIP của backend nêu đúng điều này), nên lần test của bạn là lần xác nhận đầu tiên.
- Các luồng cần đăng nhập (làm bài, từ vựng, nghe chép…) chưa chạy với backend và tài khoản thật để không ghi vào cơ sở dữ liệu của bạn; hình dạng JSON được đối chiếu với DTO và với các API công khai thật.
- Audio/hình dùng link ký R2 thật chưa được thử (kiểm bằng audio giả); khi link hết hạn giao diện lấy lại một lần.
- Chưa có giao diện đổi mật khẩu và bài viết ngữ pháp (như LEARNER).
- Backend chưa có API theo dõi chi tiết từng lượt trả lời (`/vocab/{id}/attempts`, `/vocab/memory` trong `LEARNER/API_VOCAB_TRACKING.md`); độ quen thuộc hiện lưu qua lịch SM-2. Thêm các API đó là việc riêng nếu cần thống kê theo từng dạng câu hỏi.
