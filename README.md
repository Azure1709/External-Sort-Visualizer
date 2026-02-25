# 📊 External Sort Visualizer

> **Minh họa trực quan thuật toán Sắp Xếp Ngoại (External Merge Sort)**

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-GitHub_Pages-2ea44f)](https://azure1709.github.io/External-Sort-Visualizer/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

| 📚 Môn học | CS523 - Cấu trúc dữ liệu và Giải thuật nâng cao |
| ---------- | ------------------------------------------------- |
| 🏫 Trường  | Đại học Công nghệ Thông tin - ĐHQG TP.HCM (UIT)  |
| 👨‍💻 Tác giả | Bùi Ngọc Thiên Thanh - 23521436                  |

---

## 🚀 Demo Trực Tuyến

**👉 [Truy cập ứng dụng tại đây](https://azure1709.github.io/External-Sort-Visualizer/)**

> Không cần cài đặt, chỉ cần mở link và sử dụng ngay!

---

## 📖 Giới Thiệu

**External Sort** (Sắp xếp ngoại) là thuật toán sắp xếp được thiết kế để xử lý **dữ liệu lớn hơn bộ nhớ RAM**. Ứng dụng này minh họa trực quan toàn bộ quá trình hoạt động với **số thực 8 bytes (Double)**:

1. **Phase 1 - Tạo Run**: Chia dữ liệu thành các chunk vừa RAM → Sắp xếp từng chunk → Tạo thành các Run
2. **Phase 2 - K-Way Merge**: Gộp các Run đã sắp xếp thành output cuối cùng

---

## 🎯 Tính Năng

| Tính năng                    | Mô tả                                                     |
| ---------------------------- | ---------------------------------------------------------- |
| 🖥️ **3 bước rõ ràng**        | Cấu hình → Mô phỏng → Kết quả                            |
| 📊 **Animation realtime**    | Xem từng bước: chia run, sắp xếp, merge                   |
| 🎮 **Điều khiển linh hoạt**  | Play/Pause, Step từng bước, tốc độ 10ms–2000ms            |
| 📈 **Thống kê chi tiết**     | Số bước thực hiện, phép so sánh, MIN/MAX                  |
| 🎲 **3 cách nhập dữ liệu**  | Random, nhập tay, hoặc upload file .bin/.dat               |
| 💾 **Lưu phiên làm việc**    | Reload trang vẫn giữ dữ liệu (sessionStorage)            |
| 📥 **Xuất file kết quả**     | Download .bin hoặc .txt                                    |
| 🌗 **Dark/Light mode**       | Chuyển đổi giao diện sáng/tối                              |
| 📜 **Lịch sử sắp xếp**      | Lưu lại các lần sắp xếp trước đó                          |

---

## 🛠️ Cài Đặt Và Chạy Locally

### Yêu Cầu

- Trình duyệt web hiện đại (Chrome, Firefox, Edge)
- (Tùy chọn) Node.js hoặc Python để chạy server local

### Cách 1: Mở trực tiếp (Đơn giản nhất)

```bash
# Clone repository
git clone https://github.com/Azure1709/External-Sort-Visualizer.git

# Mở file index.html trực tiếp bằng trình duyệt
```

### Cách 2: Dùng Live Server (Khuyến nghị cho VS Code)

```bash
# 1. Clone repository
git clone https://github.com/Azure1709/External-Sort-Visualizer.git
cd External-Sort-Visualizer

# 2. Mở VS Code
code .

# 3. Cài extension "Live Server" nếu chưa có
# 4. Click phải vào index.html → "Open with Live Server"
```

### Cách 3: Dùng Node.js

```bash
# 1. Clone repository
git clone https://github.com/Azure1709/External-Sort-Visualizer.git
cd External-Sort-Visualizer

# 2. Chạy server
npx serve .

# 3. Mở http://localhost:3000
```

### Cách 4: Dùng Python

```bash
# 1. Clone repository
git clone https://github.com/Azure1709/External-Sort-Visualizer.git
cd External-Sort-Visualizer

# 2. Chạy server
python -m http.server 8000

# 3. Mở http://localhost:8000
```

---

## 📋 Hướng Dẫn Sử Dụng

### Bước 1: Tạo hoặc upload dữ liệu

- **🎲 Random**: Tùy chỉnh số lượng (2–100), khoảng giá trị Min/Max → Click "Tạo dãy ngẫu nhiên"
- **✏️ Nhập tay**: Nhập trực tiếp các số, phân cách bằng dấu cách hoặc dấu phẩy
- **📁 Tải tệp**: Kéo thả hoặc chọn file .bin/.dat (chứa số thực Double 8-bytes)

### Bước 2: Cấu hình tham số

| Tham số            | Ý nghĩa                              | Phạm vi | Gợi ý              |
| ------------------ | ------------------------------------- | ------- | ------------------- |
| **M (Giới hạn RAM)** | Số phần tử tối đa chứa trong RAM     | 2 – 20  | 4–6 để dễ quan sát  |
| **K (Số luồng Merge)** | Số Run được merge cùng lúc mỗi pass | 2 – 8   | 2–3 cho demo        |

> 💡 Ước tính hiệu suất (Số Run, Số Pass) sẽ tự động cập nhật khi thay đổi tham số.

### Bước 3: Chạy mô phỏng

1. Nhấn **"⚡ Bắt đầu sắp xếp"**
2. Tự động chuyển sang tab **Mô phỏng** với animation realtime
3. Sử dụng các nút điều khiển:
   - ▶️ **Play/Pause**: Chạy/dừng tự động
   - ⏭️ **Step**: Đi từng bước một
   - 🔄 **Reset**: Quay lại bước đầu
4. Điều chỉnh **tốc độ** bằng thanh trượt (10ms nhanh ↔ 2000ms chậm)

### Bước 4: Xem kết quả

- Xem thống kê tổng hợp (tổng phần tử, số run, số bước, so sánh)
- Xem trước mảng đã sắp xếp với MIN/MAX
- Tải xuống file `.bin` hoặc `.txt`

---

## 🔬 Thuật Toán

### Phase 1: Tạo Run

```
Cho dữ liệu: [15, 42, 7, 23, 31, 4, 18, 56, 12, 9]  (10 phần tử)
Với M = 5 và K = 2:

Run 1: [15, 42, 7, 23, 31] → sắp xếp → [7, 15, 23, 31, 42]
Run 2: [4, 18, 56, 12, 9]  → sắp xếp → [4, 9, 12, 18, 56]
```

### Phase 2: K-Way Merge

```
Merge Run 1 & 2 →
[4, 7, 9, 12, 15, 18, 23, 31, 42, 56] 
```

### Độ Phức Tạp

| Metric     | Độ phức tạp   | Giải thích                    |
| ---------- | ------------- | ----------------------------- |
| Thời gian  | O(N log N)    | N = tổng số phần tử           |
| Không gian | O(M)          | Chỉ cần M phần tử trong RAM   |
| Số Run     | ⌈N/M⌉         | N phần tử, mỗi Run chứa M    |
| Số Pass    | ⌈logₖ(Runs)⌉  | Merge K Run mỗi lần          |

---

## 📁 Cấu Trúc Dự Án

```
📦 External-Sort-Visualizer/
├── 📄 index.html       # Giao diện chính (Single Page App)
├── 📄 package.json     # Cấu hình npm
├── 📄 .gitignore       # Git ignore rules
├── 📄 LICENSE          # MIT License
├── 📄 README.md        # Tài liệu dự án
├── 📂 css/
│   └── styles.css      # Styles (Glassmorphism + Gradient + Dark mode)
└── 📂 js/
    ├── app.js           # Module chính - điều phối toàn bộ ứng dụng
    ├── sorter.js        # Thuật toán External Merge Sort
    ├── visualizer.js    # Animation và rendering visualization
    ├── fileHandler.js   # Xử lý đọc/ghi file nhị phân (Float64Array)
    └── main.js          # Module điều khiển (phiên bản modular)
```

---

## 🛠️ Công Nghệ

- **HTML5** — Cấu trúc semantic
- **Vanilla CSS** — Styling (Glassmorphism, Gradient, Dark/Light theme)
- **Vanilla JavaScript ES6+** — Logic ứng dụng
- **Google Fonts (Inter)** — Typography
- **GitHub Pages** — Hosting

---

## 📜 License

MIT License — Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Azure1709">Bùi Ngọc Thiên Thanh</a> | UIT 2026
</p>
