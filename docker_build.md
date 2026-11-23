# Chạy ứng dụng bằng Docker

## Yêu cầu

- Docker Desktop đang chạy (Windows/macOS), hoặc Docker Engine (Linux).
- Chạy các lệnh tại thư mục chứa `Dockerfile`.

## Build image

```bash
docker build -t hotel-user:local .
```

## Chạy container

```bash
docker run --rm -p 3000:3000 --name hotel-user hotel-user:local
```

Mở <http://localhost:3000> để xem ứng dụng. Nhấn `Ctrl+C` để dừng container.

## Chạy nền

```bash
docker run -d -p 3000:3000 --name hotel-user hotel-user:local
```

Dừng và xóa container:

```bash
docker stop hotel-user
docker rm hotel-user
```

## Build lại sau khi sửa code

```bash
docker build -t hotel-user:local .
docker rm -f hotel-user
docker run --rm -p 3000:3000 --name hotel-user hotel-user:local
```

## Kết nối API sau này

Các biến `NEXT_PUBLIC_*` được Next.js nhúng vào bundle ở bước build, nên truyền chúng khi build image:

```bash
docker build \
  --build-arg NEXT_PUBLIC_HOTELS_API_URL=https://api.example.com/hotels \
  --build-arg NEXT_PUBLIC_BOOKINGS_API_URL=https://api.example.com/bookings \
  --build-arg NEXT_PUBLIC_PAYMENTS_API_URL=https://api.example.com/payments \
  -t hotel-user:local .
```

Dockerfile đã khai báo sẵn các `ARG` này. Hiện frontend vẫn dùng mock data, vì vậy chưa cần các URL API để chạy.

Không đưa secret/token riêng tư vào `NEXT_PUBLIC_*`; các giá trị này có thể được nhìn thấy trong trình duyệt.
