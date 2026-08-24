# Thiết kế nâng cấp gameplay, đồ họa và cân bằng

## Mục tiêu

Nâng cấp `slime-game-chill` mà không thay đổi bản sắc pixel-art và không phụ thuộc thêm vào asset hoặc dịch vụ bên ngoài. Bản nâng cấp phải sửa các lỗi gameplay/UI đã xác minh, làm hiệu ứng chiến đấu rõ và đẹp hơn, tạo nhịp tiến triển hợp lý từ màn 1 đến màn 100, đồng thời giữ game chạy mượt trên desktop và điện thoại.

## Hiện trạng đã xác minh

- `npm run typecheck` thành công.
- `npm run build` thành công khi chạy ngoài giới hạn sandbox của môi trường kiểm tra.
- Game khởi động, cửa hàng, điều khiển bàn phím và tạm dừng hoạt động trên desktop.
- Viewport điện thoại 390 × 844 không tràn trang nhưng các cụm HUD phía trên chồng lên nhau.
- `TouchControls` nhận callback mới mỗi lần HUD render; cleanup của effect gọi `onMove(0, 0)`, có thể ngắt joystick đang được giữ.
- `onBossKilled` tăng `cores` trực tiếp rồi còn thả thêm một core, khiến một boss có thể thưởng hai core dù UI mô tả một core.
- Hiệu ứng sét vẽ lõi sáng trước lớp glow dày, khiến lớp glow che lõi.
- Công thức hiện tại đưa sát thương quái thường từ 7 ở màn 1 lên khoảng 120 ở màn 100, trong khi HP tối đa từ passive chỉ đạt 210. Đường cong tạo spike sát thương muộn nhưng HP quái và số lượng quái không tạo đủ biến thiên chiến thuật.
- Với giả định nhặt phần lớn XP, người chơi có thể vượt cấp 170 vào màn 100, trong khi toàn bộ cây kỹ năng, passive và tiến hóa hoàn tất khoảng cấp 84. Phần sau chủ yếu chỉ còn lựa chọn hồi máu.
- Dependency audit báo ba cảnh báo mức trung bình trong `react-router` và `uuid`; hai package này hiện không được source game sử dụng trực tiếp.

## Phạm vi

### 1. Sửa lỗi và độ ổn định

- Ổn định callback điều khiển cảm ứng để joystick không bị reset theo nhịp cập nhật HUD.
- Thiết kế lại HUD responsive cho màn hình hẹp: hàng trạng thái chính, hàng tiến trình wave/boss và chỉ số phụ không chồng nhau; loại bỏ nút âm thanh trùng lặp trên touch.
- Mỗi boss chỉ trao đúng một core tiến hóa. Core được cộng ngay khi boss chết để không thể mất do chuyển màn; không thả thêm pickup core từ boss.
- Đảo thứ tự vẽ sét: glow ngoài trước, lõi trắng bên trong sau.
- Reset toàn bộ trạng thái tạm thời của combat khi bắt đầu lượt chơi mới, gồm cooldown, regen accumulator, orbit timer, input giữ và HUD timer.
- Chuẩn hóa save khi đọc từ `localStorage`: vàng không âm, danh sách sở hữu chỉ chứa ID hợp lệ và không trùng, loadout phải thuộc danh sách đã sở hữu.
- Loại bỏ dependency runtime không sử dụng và xử lý cảnh báo audit mà không dùng nâng cấp phá vỡ không cần thiết.

### 2. Kiến trúc cân bằng

Tạo module `src/game/balance.ts` làm nguồn dữ liệu duy nhất cho:

- HP, sát thương, tốc độ và quota của quái theo stage/wave.
- HP, sát thương và nhịp kỹ năng của boss.
- XP cần theo level, giá trị gem và phần thưởng vàng.
- Thông số sát thương/cooldown/radius/count của sáu kỹ năng.
- Ngưỡng mở mastery và trọng số lựa chọn nâng cấp.

`engine.ts` chỉ tiêu thụ các hàm thuần từ module này. Các hàm thuần được kiểm thử bằng Vitest, cho phép xác minh đường cong màn 1–100 mà không cần khởi tạo Canvas.

Đường cong dùng ba chặng:

- Màn 1–20: onboarding, quái thường cần 1–4 đòn cơ bản, boss mục tiêu 12–22 giây với build hợp lý; người chơi nhận kỹ năng mới thường xuyên.
- Màn 21–60: áp lực tăng qua mật độ, elite và tốc độ vừa phải; boss mục tiêu 18–32 giây; tránh tăng sát thương theo kiểu hai-hit-kill.
- Màn 61–100: quái có HP cao hơn và wave dày hơn nhưng sát thương được làm mềm; boss mục tiêu 25–45 giây với build cuối game; màn vua mỗi 10 stage vẫn là spike có chủ đích.

Giới hạn cân bằng:

- Sát thương tiếp xúc quái thường màn 100 không vượt 82 trước các nâng cấp phòng thủ.
- Sát thương tiếp xúc boss màn 100 không vượt 118; projectile boss dùng hệ số thấp hơn.
- Tốc độ quái thường không vượt 138, để người chơi cơ bản vẫn có thể tạo khoảng cách.
- Wave quota tăng dần đến tối đa 54 thay vì dừng ở 46 quá sớm.
- Level dự kiến khi thu thập XP tốt nằm khoảng 115–135 ở màn 100.
- Sau khi đã tối đa kỹ năng/passive/tiến hóa, lựa chọn level-up chuyển sang mastery lặp lại có giới hạn: sát thương, tốc độ, HP/hồi máu và nhặt đồ. Không xuất hiện màn chọn chỉ có một thẻ.

### 3. Đồ họa và hiệu ứng

Giữ renderer Canvas 2D và sprite pixel hiện tại. Không thêm image asset hoặc thư viện đồ họa.

- Nền biome có lớp vignette nhẹ, tile accents, patch lớn bán trong suốt và decor có chiều sâu để giảm cảm giác phẳng.
- Nhân vật và quái có contact shadow mềm; elite/boss có aura pulse rõ nhưng không che sprite.
- Projectile có trail giới hạn số lượng; hit tạo spark theo màu vũ khí; kẻ địch chết tạo burst hai tầng; pickup core có beacon/pulse.
- Boss telegraph rõ cho charge, radial shot và ground slam bằng vòng cảnh báo đổi màu theo thời gian.
- Player hit feedback gồm flash/vignette ngắn; low-health vignette giảm cường độ để không che gameplay.
- Sét, aura, frost, boomerang và orbit có silhouette khác biệt ở cả trạng thái thường và tiến hóa.
- Camera shake được giữ nhưng giới hạn biên độ; hiệu ứng mới dùng pool/cap hiện có để tránh tăng mảng không giới hạn.
- HUD desktop được tinh gọn; HUD mobile ưu tiên HP, stage, wave/boss và số core, còn chỉ số phụ được gom gọn.

## Luồng dữ liệu

1. `balance.ts` nhận `stage`, `wave`, `level` hoặc trạng thái skill và trả về số liệu thuần.
2. `engine.ts` dùng số liệu đó khi spawn, gây sát thương, tạo lựa chọn và cập nhật tiến trình.
3. Engine phát `HudData`; React chỉ render UI và chuyển input ổn định trở lại engine.
4. `shop.ts` chuẩn hóa save trước khi App áp dụng loadout.
5. Renderer đọc trạng thái combat sẵn có cùng các telegraph/trail ngắn hạn và vẽ theo thứ tự background → entities → combat FX → atmosphere → screen feedback.

## Biên hiệu năng

- Mục tiêu ít nhất 60 FPS ở viewport desktop 1440 × 900 và mobile 390 × 844 trên máy kiểm tra.
- Không tạo thêm `setInterval` hoặc animation loop ngoài `requestAnimationFrame` hiện có.
- Mọi collection hiệu ứng mới có hard cap và bị dọn khi đổi lượt/màn.
- Không gọi DOM query, `getContext`, hoặc tải tài nguyên trong game loop.
- Giảm allocation trong vòng lặp nóng khi chỉnh vào khu vực liên quan; không refactor renderer ngoài phạm vi nâng cấp.

## Kiểm thử

- Vitest kiểm tra các mốc balance 1, 10, 20, 50, 75 và 100; kiểm tra tính đơn điệu, giới hạn sát thương/tốc độ, quota và XP dự kiến.
- Test save normalization với dữ liệu hỏng, ID không hợp lệ, danh sách trùng và loadout chưa sở hữu.
- Test helper lựa chọn nâng cấp để đảm bảo luôn có ba lựa chọn hợp lệ khi mastery đã mở.
- Regression test cho core boss: một boss kill tạo đúng một core reward.
- `npm run typecheck`, `npm test -- --run` và `npm run build` phải thành công.
- Playwright smoke test desktop/mobile: menu, shop, start, movement, pause; không có page error; HUD không chồng theo các bounding box chính; đo requestAnimationFrame đạt ít nhất 60 FPS trong mẫu kiểm tra.
- Kiểm tra hình ảnh thủ công bằng screenshot menu, shop, combat desktop và combat mobile.

## Ngoài phạm vi

- Không đổi tên game hoặc cốt truyện.
- Không thêm multiplayer, backend, tài khoản, leaderboard online hoặc thanh toán.
- Không thay toàn bộ sprite bằng asset mới.
- Không thiết kế lại cửa hàng hoặc thay đổi giá skin ngoài việc sửa dữ liệu save không hợp lệ.
- Không tự merge PR; PR chỉ được tạo để chủ repo review và merge.

## Tiêu chí hoàn tất

- Các lỗi đã xác minh có regression test hoặc smoke-test assertion tương ứng.
- Cả 100 stage dùng đường cong balance mới và thỏa các giới hạn nêu trên.
- Level-up cuối game vẫn đưa ba lựa chọn hữu ích.
- Hiệu ứng chiến đấu và telegraph mới xuất hiện rõ trên desktop/mobile mà không làm HUD hoặc sprite khó đọc.
- Tất cả lệnh kiểm tra bắt buộc thành công và PR mô tả rõ thay đổi, bằng chứng test cùng các ảnh trước/sau.
