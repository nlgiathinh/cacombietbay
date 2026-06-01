# CaComBietBay - Quản Lý Truyện

Dự án đã được chuyển đổi sang sử dụng Python (Flask) và Supabase để lưu metadata truyện/chương. SQLite vẫn được dùng làm fallback cục bộ khi không cấu hình Supabase.

## Hướng dẫn cài đặt

1. Cài đặt Python (nếu chưa có).
2. Cài đặt các thư viện cần thiết:
   ```bash
   pip install -r requirements.txt
   ```

## Cách chạy ứng dụng

Chạy lệnh sau để khởi tạo database và bắt đầu server:
```bash
python run.py
```

Sau đó, mở trình duyệt và truy cập:
- Trang chủ: `http://localhost:5000`
- Trang Admin: `http://localhost:5000/admin.html`

## Deploy lên Vercel + Supabase

Phiên bản này đã được chuẩn bị để deploy tĩnh lên Vercel và dùng Supabase làm backend database.

### Bước cần làm
1. Tạo project Supabase.
2. Tạo bảng `stories` và `chapters`:
```sql
create table stories (
  id bigint generated always as identity primary key,
  title text not null,
  author text,
  description text,
  cover_path text,
  status text default 'ongoing',
  genre text,
  created_at timestamptz default now()
);

create table chapters (
  id bigint generated always as identity primary key,
  story_id bigint references stories(id) on delete cascade,
  chapter_number int not null,
  title text,
  content text,
  created_at timestamptz default now()
);
```
3. Trong Vercel, thêm biến môi trường:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_PATH` (nếu bạn cần trỏ SQLite vào thư mục writable như `/tmp/database.db` trên môi trường serverless)
4. Deploy bằng Vercel CLI hoặc dashboard.

> Lưu ý: `SUPABASE_SERVICE_ROLE_KEY` cần giữ bí mật, chỉ cấu hình trong Vercel Environment Variables.

### Cấu hình Supabase Storage
1. Vào Supabase dashboard, chọn `Storage`.
2. Tạo bucket mới tên `covers`.
3. Mở quyền public cho bucket hoặc cấu hình URL public để ứng dụng có thể lấy ảnh bìa trực tiếp.
4. Trong trang admin, bạn có thể chọn ảnh và upload trực tiếp lên bucket `covers`, sau đó ứng dụng sẽ lưu URL trả về vào `cover_path`.

> Lưu ý: upload ảnh bìa hiện được xử lý trên server Flask bằng `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY`, nên bạn không cần cung cấp `SUPABASE_ANON_KEY` cho frontend admin.

### Lưu ý về SQLite trên môi trường serverless
- Nếu bạn chạy app trong môi trường serverless như Vercel, thư mục chứa mã nguồn có thể ở chế độ read-only.
- Ứng dụng hiện đã cố gắng tự động dùng `DATABASE_PATH` hoặc thư mục tạm của hệ thống nếu thư mục gốc không ghi được.
- Với deploy production lâu dài, Supabase database là lựa chọn tốt hơn để lưu dữ liệu bền vững.
## Các tính năng mới
- Quản lý Truyện và Chương riêng biệt.
- Hỗ trợ upload ảnh bìa cho truyện.
- Lưu trữ metadata truyện/chương qua Supabase.
- Còn giữ fallback SQLite cục bộ để chạy offline.
- Chỉnh sửa và xóa Truyện/Chương dễ dàng.