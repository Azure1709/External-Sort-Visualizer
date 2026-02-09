/**
 * @fileoverview Module xử lý đọc/ghi tệp nhị phân
 * @description Cung cấp các hàm để đọc và tạo tệp nhị phân chứa số thực Double (8-bytes)
 * @author DSA++ Team
 * @version 1.0.0
 */

/**
 * Đọc tệp nhị phân và chuyển đổi thành mảng số thực
 * @param {File} file - Đối tượng File từ input
 * @returns {Promise<Float64Array>} Mảng số thực Double precision
 * @throws {Error} Nếu tệp không hợp lệ hoặc không thể đọc
 * @example
 * const fileInput = document.getElementById('fileInput');
 * const data = await readBinaryFile(fileInput.files[0]);
 * console.log('Số phần tử:', data.length);
 */
export async function readBinaryFile(file) {
    if (!file) {
        throw new Error('Không có tệp được chọn');
    }

    // Kiểm tra kích thước tệp
    if (file.size === 0) {
        throw new Error('Tệp trống');
    }

    // Kiểm tra kích thước có chia hết cho 8 không (8 bytes = 1 Double)
    if (file.size % 8 !== 0) {
        throw new Error('Tệp không hợp lệ: kích thước không chia hết cho 8 bytes');
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const arrayBuffer = event.target.result;
                const float64Array = new Float64Array(arrayBuffer);
                
                // Kiểm tra giá trị hợp lệ
                for (let i = 0; i < float64Array.length; i++) {
                    if (!Number.isFinite(float64Array[i])) {
                        console.warn(`Cảnh báo: Giá trị tại vị trí ${i} không hợp lệ (NaN hoặc Infinity)`);
                    }
                }
                
                resolve(float64Array);
            } catch (error) {
                reject(new Error('Lỗi khi phân tích dữ liệu: ' + error.message));
            }
        };

        reader.onerror = () => {
            reject(new Error('Lỗi khi đọc tệp'));
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * Tạo tệp nhị phân từ mảng số thực
 * @param {Float64Array|number[]} data - Mảng số thực cần ghi
 * @returns {Blob} Đối tượng Blob chứa dữ liệu nhị phân
 * @example
 * const sortedData = new Float64Array([1.0, 2.0, 3.0]);
 * const blob = createBinaryFile(sortedData);
 * // Tạo link download
 * const url = URL.createObjectURL(blob);
 */
export function createBinaryFile(data) {
    // Chuyển đổi sang Float64Array nếu cần
    const float64Array = data instanceof Float64Array 
        ? data 
        : new Float64Array(data);
    
    // Tạo ArrayBuffer từ Float64Array
    const buffer = float64Array.buffer.slice(
        float64Array.byteOffset,
        float64Array.byteOffset + float64Array.byteLength
    );
    
    return new Blob([buffer], { type: 'application/octet-stream' });
}

/**
 * Tải xuống tệp nhị phân
 * @param {Blob} blob - Đối tượng Blob cần tải
 * @param {string} [filename='sorted_output.bin'] - Tên tệp kết quả
 * @example
 * const data = new Float64Array([1.0, 2.0, 3.0]);
 * const blob = createBinaryFile(data);
 * downloadFile(blob, 'my_sorted_data.bin');
 */
export function downloadFile(blob, filename = 'sorted_output.bin') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Giải phóng bộ nhớ
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Định dạng kích thước tệp cho hiển thị
 * @param {number} bytes - Kích thước tính bằng bytes
 * @returns {string} Chuỗi định dạng (VD: "1.5 MB")
 * @example
 * formatFileSize(1024); // "1 KB"
 * formatFileSize(1536); // "1.5 KB"
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
}

/**
 * Tạo tệp nhị phân mẫu để test
 * @param {number} count - Số lượng phần tử
 * @param {number} [min=0] - Giá trị nhỏ nhất
 * @param {number} [max=100] - Giá trị lớn nhất
 * @returns {Float64Array} Mảng số thực ngẫu nhiên
 * @example
 * const testData = generateTestData(20, 0, 100);
 * console.log(testData); // Float64Array với 20 số ngẫu nhiên
 */
export function generateTestData(count, min = 0, max = 100) {
    const data = new Float64Array(count);
    
    for (let i = 0; i < count; i++) {
        data[i] = min + Math.random() * (max - min);
    }
    
    return data;
}
