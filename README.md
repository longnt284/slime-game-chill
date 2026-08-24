# Thung Lũng Quái Vật

Game survivor-like chơi trực tiếp trên trình duyệt: nhân vật tự tấn công, vượt 3 đợt quái và hạ trùm qua chiến dịch 100 màn.

## Điểm nổi bật

- 6 vũ khí, mỗi vũ khí **6 bậc**: bậc càng cao thì sát thương, độ phủ, phạm vi và số kẻ địch dính đòn càng lớn.
- **Mảnh vũ khí** rơi ra từ quái, elite và trùm; gom đủ là tự động lên một bậc mới.
- 6 bị động, hệ tiến hóa và mastery cho giai đoạn cuối game.
- Độ khó tăng theo đường cong riêng cho máu, sát thương, tốc độ, số lượng quái và trùm.
- 16 bản đồ, 100 trùm, 40 skin nhân vật và 20 skin vũ khí.
- Điều khiển bàn phím trên desktop và joystick cảm ứng trên mobile.
- Boss có cảnh báo trực quan trước các đòn charge, bắn vòng và dậm đất.
- Save cũ được chuẩn hóa an toàn khi tải; mỗi trùm thưởng chính xác 1 lõi tiến hóa.

## Hệ nâng cấp vũ khí

Mỗi vũ khí đi từ bậc 1 tới bậc 6 bằng hai đường: nhặt đủ **mảnh vũ khí** rơi trong trận,
hoặc chọn thẻ nâng cấp khi lên cấp. Ngưỡng mảnh tăng dần theo bậc (10 · 16 · 24 · 34 · 46),
và mảnh chỉ rơi cho vũ khí đang sở hữu mà chưa đạt bậc tối đa nên không bao giờ phí.

Mỗi bậc đều cộng sát thương, rút ngắn hồi chiêu và mở rộng vùng ảnh hưởng:

| Vũ khí | Bậc 1 | Bậc 6 |
| --- | --- | --- |
| Kiếm Hộ Mệnh | 2 lưỡi quét nửa vòng 180° | 6 lưỡi khép kín 360°, bán kính gấp đôi |
| Hào Quang Nắng | Quét 180°, trúng 4 kẻ địch | Trọn 360°, trúng 26 kẻ địch |
| Bùa Ánh Sáng | 1 tia, không xuyên | 5 tia xòe quạt, xuyên vô hạn |
| Sét Thiên | 1 tia sét đơn lẻ | 5 tia kèm vùng nổ lan rộng |
| Boomerang Gió | 1 lưỡi bay thẳng | 3 nguyệt đao tỏa thành quạt |
| Mưa Băng Giá | 2 tảng băng, trúng 5 kẻ địch | 7 tảng băng, trúng 26 kẻ địch |

Vũ khí đạt bậc 5 trở lên cộng thêm một lõi tiến hóa sẽ hóa thành tuyệt kỹ: mạnh hơn gấp bội,
mở trọn vòng quét và xuyên thấu mọi mục tiêu.

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
Nếu máy không có Google Chrome, chạy `npx playwright install chrome` trước.
