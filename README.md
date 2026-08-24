# Thung Lũng Quái Vật

Game survivor-like chơi trực tiếp trên trình duyệt: nhân vật tự tấn công, vượt 3 đợt quái và hạ trùm qua chiến dịch 100 màn.

## Điểm nổi bật

- 6 kỹ năng, 6 bị động, hệ tiến hóa và mastery cho giai đoạn cuối game.
- Độ khó tăng theo đường cong riêng cho máu, sát thương, tốc độ, số lượng quái và trùm.
- 10 biome, 100 trùm, 40 skin nhân vật và 20 skin vũ khí.
- Điều khiển bàn phím trên desktop và joystick cảm ứng trên mobile.
- Boss có cảnh báo trực quan trước các đòn charge, bắn vòng và dậm đất.
- Save cũ được chuẩn hóa an toàn khi tải; mỗi trùm thưởng chính xác 1 lõi tiến hóa.

## Chạy dự án

Yêu cầu Node.js 20+.

```bash
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal (mặc định `http://localhost:3000`).

## Điều khiển

- `WASD` hoặc phím mũi tên: di chuyển.
- Cần ảo: di chuyển trên thiết bị cảm ứng.
- `P` hoặc `Esc`: tạm dừng/tiếp tục.
- `M`: bật/tắt âm thanh.
- `1`, `2`, `3`: chọn nâng cấp khi lên cấp.

## Kiểm tra chất lượng

```bash
npm run test:run
npm run typecheck
npm run build
npm run test:e2e
```

E2E dùng Google Chrome đã cài trên máy để kiểm tra animation, lỗi runtime và bố cục HUD desktop/mobile.
