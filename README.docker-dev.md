# Chạy hotel.user bằng Docker

Dockerfile và Compose hiện được quản lý tập trung trong `vtrip/deploy`.

Chạy từ `D:\Sourcecode\vinai\vsf\src\vtrip\deploy`:

```powershell
docker compose --profile hotel-user-dev up -d --build hotel-user-dev
```

Mở <http://localhost:3000>. Source `D:\Sourcecode\vinai\vsf\src\hotel.user` được bind mount; khi lưu code, Next.js hot-reload mà không cần build image.

Xem log:

```powershell
docker compose --profile hotel-user-dev logs -f hotel-user-dev
```

Restart dev server mà không build:

```powershell
docker compose --profile hotel-user-dev restart hotel-user-dev
```
