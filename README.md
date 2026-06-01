# CaComBietBay - Quản Lý Truyện

Dự án đã được chuyển đổi sang sử dụng Python (Flask) và SQLite.

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
4. Deploy bằng Vercel CLI hoặc dashboard.

> Lưu ý: `SUPABASE_SERVICE_ROLE_KEY` cần giữ bí mật, chỉ cấu hình trong Vercel Environment Variables.

## Các tính năng mới
- Quản lý Truyện và Chương riêng biệt.
- Hỗ trợ upload ảnh bìa cho truyện.
- Lưu trữ dữ liệu tập trung trong SQLite (`database.db`).
- Chỉnh sửa và xóa Truyện/Chương dễ dàng.