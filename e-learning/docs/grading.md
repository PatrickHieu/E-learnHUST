# Cơ chế chấm bài lập trình (C / C++ / Python)

Tài liệu này mô tả pipeline chấm bài cho các lesson loại `exercise`, để
khắc phục góp ý "chấm bằng regex/expected output không đủ tin cậy". Có
hai chế độ cùng tồn tại trong codebase:

| Chế độ                      | Áp dụng cho                       | Vị trí kiểm tra | Tin cậy            |
| --------------------------- | --------------------------------- | --------------- | ------------------ |
| Test case stdin/stdout      | C, C++, Python                    | Server (Judge0) | Cao — đo output    |
| Regex / substring (legacy)  | HTML/CSS/JS Sandpack, lesson cũ   | Server (Node)   | Yếu — đo source    |

Lesson được tạo mới cho C/C++/Python **bắt buộc** dùng test case nếu
muốn có XP. Regex/substring chỉ còn là fallback cho các lesson đã có
sẵn từ trước.

## 1. Mô hình dữ liệu

`config/schema.tsx` định nghĩa `ExerciseTestCase`:

```ts
export type ExerciseTestCase = {
    name?: string;
    input: string;          // stdin truyền vào chương trình
    expectedOutput: string; // stdout mong đợi (đã chuẩn hoá whitespace)
    hidden?: boolean;       // nếu true, học sinh không thấy input/expected
};
```

`ExerciseLessonContent.testcases?: ExerciseTestCase[]` được lưu trong
cột `content` (JSONB) của bảng `lessons`. Admin nhập qua component
`TestcasesEditor` ở các form Create/Edit Lesson; payload serialise dưới
dạng JSON vào hidden input `name="testcases"`.

## 2. Pipeline chấm

Khi học sinh bấm **Mark Completed**, frontend POST `/api/lesson/complete`
với `{ lessonId, submission }`. Server làm theo thứ tự:

1. **Xác thực & uỷ quyền** (`auth()` + chapter-gating).
2. **Phát hiện ngôn ngữ chấm** bằng `detectGradingLanguage(starterCode)`:
   xét đuôi file trong `starterCode` (`.py` → python, `.cpp/.cxx/.cc` →
   cpp, `.c` → c). Trả về `null` cho HTML/CSS/JS — rơi xuống nhánh
   regex/substring cũ.
3. **Chấm test case** (`gradeWithTestcases` trong `lib/code-grading.ts`):
   - Map language ID: `c=50, cpp=54, python=71`.
   - Với mỗi test case, POST 1 submission tới Judge0 RapidAPI (
     `?wait=true`) với:
     - `language_id`, `source_code`, `stdin = case.input`
     - `cpu_time_limit` (default 5s, env `JUDGE0_CPU_TIME`)
     - `wall_time_limit` (default 8s, env `JUDGE0_WALL_TIME`)
     - `memory_limit` (default 256 MB = 256_000 KB, env
       `JUDGE0_MEMORY_KB`)
     - `stack_limit = 64_000`, `max_processes_and_or_threads = 16`
   - Chuẩn hoá `stdout` và `expectedOutput` trước khi so sánh:
     - CRLF → LF
     - Xoá whitespace cuối mỗi dòng
     - Xoá blank line cuối
   - Test case pass ⇔ `status.description == "Accepted"` AND
     output (đã chuẩn hoá) == expected (đã chuẩn hoá).
4. **Quyết định cấp XP**: chỉ khi `passedCases == totalCases`. Nếu không
   pass → trả 422 kèm `grading` payload để UI hiển thị từng case.
5. **Idempotency**: row `CompletedLessonTable` insert với
   `onConflictDoNothing`, double-click không double-XP.

Server *luôn* tự chạy bộ test khi `testcases` có dữ liệu — frontend
không có quyền tự khai báo "tôi pass". Endpoint trial-run riêng
`/api/code/grade` cũng có sẵn, nhưng nó **không cấp XP**; nó chỉ là
oracle cho học sinh xem trước.

## 3. Sandbox & giới hạn tài nguyên

Judge0 chạy mỗi submission trong container isolate riêng. Các giới hạn
do server gửi cùng request — Judge0 enforce:

| Giới hạn                     | Default | Override                 |
| ---------------------------- | ------- | ------------------------ |
| CPU time per test case       | 5s      | `JUDGE0_CPU_TIME`        |
| Wall clock per test case     | 8s      | `JUDGE0_WALL_TIME`       |
| Memory                       | 256 MB  | `JUDGE0_MEMORY_KB`       |
| Stack                        | 64 MB   | hard-coded               |
| Số process/thread tối đa     | 16      | hard-coded (fork-bomb)   |

Vượt giới hạn → Judge0 trả `status.description` khác `Accepted`
("Time Limit Exceeded", "Memory Limit Exceeded", …) và test case fail.

API key `JUDGE0_RAPIDAPI_KEY` chỉ tồn tại server-side; không bao giờ
xuất hiện trong bundle browser.

## 4. Test case ẩn (hidden)

`hidden: true` → grader vẫn chạy bình thường, nhưng response client
chỉ chứa `{ name, passed, status }`. Các field `input`, `expectedOutput`,
`actual`, `stderr` bị tước. Mục đích: chống học sinh hard-code đáp án
khi đã biết input.

## 5. So sánh với cách cũ (regex / expectedOutput substring)

| Tiêu chí                          | Regex/substring  | Test case stdin/stdout |
| --------------------------------- | ---------------- | ---------------------- |
| Kiểm tra thuật toán đúng?         | Không (chỉ source) | Có (chạy thực tế)     |
| Lách bằng comment / pattern dán?  | Dễ                | Không                  |
| Có timeout / memory limit?        | Không             | Có (Judge0)            |
| Sandbox?                          | Không cần         | Có (Judge0 isolate)    |
| Phân biệt đúng/đáp án khác form?  | Không             | Có (so output)         |
| Phù hợp HTML/CSS/JS Sandpack?     | Có                | Không (không có stdin) |

Do đó:
- **Khẳng định "đáng tin cậy"** chỉ áp dụng cho lesson có
  `testcases.length > 0` chạy qua Judge0.
- Lesson HTML/CSS/JS tiếp tục dùng regex, và báo cáo nên nói rõ đây là
  "kiểm tra mẫu", không phải chấm thuật toán.

## 6. Cách viết lesson test-case

Trong admin → Edit Lesson → mục "Test cases (stdin → stdout)":
1. Bấm "Add test case", đặt tên (ví dụ `small input`).
2. Nhập `stdin` đúng định dạng input đề yêu cầu (mỗi dòng = 1 line).
3. Nhập `expected stdout` — bao gồm xuống dòng nếu chương trình in từng
   số một dòng.
4. Đánh `hidden` cho 1–2 case "chốt" để chống ăn gian.
5. Lưu. Khi học sinh bấm Mark Completed, server sẽ chạy lại tất cả case.

## 7. Liên kết file

| Mục đích                          | File                                                  |
| --------------------------------- | ----------------------------------------------------- |
| Type & schema                     | `config/schema.tsx` (`ExerciseTestCase`)              |
| Grader                            | `lib/code-grading.ts`                                 |
| Run-only proxy (debug Run button) | `app/api/code/run/route.ts`                           |
| Trial-grade endpoint              | `app/api/code/grade/route.ts`                         |
| Gate cấp XP                       | `app/api/lesson/complete/route.ts`                    |
| Admin editor                      | `app/(admin)/admin/courses/[courseId]/lessons/TestcasesEditor.tsx` |
| UI hiển thị kết quả               | `app/(routes)/courses/.../TestcaseResults.tsx`        |
