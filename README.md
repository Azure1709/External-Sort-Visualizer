# Binary File Sorter

Ứng dụng Web sắp xếp tệp nhị phân sử dụng thuật toán **External Merge Sort**.

## ✨ Tính năng

- 📁 **Tải file nhị phân** (chứa số thực Double 8-bytes)
- ⚡ **Sắp xếp nhanh** cho file lớn (>50 phần tử)
- 🎬 **Visualization** cho file nhỏ (≤50 phần tử)
- 💾 **Tải xuống** file kết quả đã sắp xếp

## 🚀 Sử dụng

1. Mở `index.html` trong trình duyệt
2. Kéo thả hoặc chọn file `.bin`/`.dat`
3. Nhấn "Bắt đầu sắp xếp"
4. Tải xuống file kết quả

## 📁 Cấu trúc dự án

```
BT2/
├── index.html          # Trang chính
├── css/
│   └── styles.css      # Styles (Glassmorphism + Gradient)
├── js/
│   ├── main.js         # Điều khiển ứng dụng
│   ├── fileHandler.js  # Đọc/ghi file nhị phân
│   ├── sorter.js       # External Merge Sort
│   └── visualizer.js   # Visualization
└── README.md
```

## 🔧 Thuật toán External Merge Sort

1. **Chia (Divide)**: Chia dữ liệu thành các "runs" nhỏ
2. **Sắp xếp (Sort)**: Sắp xếp từng run trong bộ nhớ
3. **Trộn (Merge)**: K-way merge các runs đã sắp xếp

## 📝 Tạo file test

```javascript
// Chạy trong Console (F12)
const data = new Float64Array([5.5, 2.1, 8.3, 1.0, 9.9]);
const blob = new Blob([data.buffer]);
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url; a.download = 'test.bin'; a.click();
```

## 📄 License

MIT License - DSA++ Team
