/**
 * @fileoverview External Sort Visualizer - Dashboard App
 * @description Ứng dụng sắp xếp ngoại với giao diện dashboard 3 cột.
 *              Bao gồm các module: File Handler, Sorter, Visualizer, và App chính.
 * @author Bùi Ngọc Thiên Thanh
 * @version 3.0.0
 */

// ==================== FILE HANDLER ====================

/**
 * Đọc tệp nhị phân và trả về mảng Float64Array
 * @param {File} file - Đối tượng File từ input
 * @returns {Promise<Float64Array>} Mảng số thực Double precision
 * @throws {Error} Nếu tệp trống, không hợp lệ hoặc lỗi đọc
 */
async function readBinaryFile(file) {
    if (!file) throw new Error('Không có tệp được chọn');
    if (file.size === 0) throw new Error('Tệp trống');
    if (file.size % 8 !== 0) throw new Error('Tệp không hợp lệ: kích thước không chia hết cho 8 bytes');
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => { try { resolve(new Float64Array(e.target.result)); } catch (err) { reject(new Error('Lỗi phân tích: ' + err.message)); } };
        reader.onerror = () => reject(new Error('Lỗi đọc tệp'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Tạo tệp nhị phân từ mảng số thực
 * @param {Float64Array|number[]} data - Mảng số thực cần ghi
 * @returns {Blob} Đối tượng Blob chứa dữ liệu nhị phân
 */
function createBinaryFile(data) {
    const f = data instanceof Float64Array ? data : new Float64Array(data);
    return new Blob([f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength)], { type: 'application/octet-stream' });
}

/**
 * Tải xuống tệp từ Blob
 * @param {Blob} blob - Đối tượng Blob cần tải
 * @param {string} [filename='sorted_output.bin'] - Tên tệp kết quả
 */
function downloadFile(blob, filename = 'sorted_output.bin') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Định dạng kích thước tệp thành chuỗi dễ đọc
 * @param {number} bytes - Kích thước tính bằng bytes
 * @returns {string} Chuỗi định dạng (VD: "1.5 MB")
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const u = ['Bytes', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + u[i];
}

/**
 * Tạo dữ liệu ngẫu nhiên để test
 * @param {number} count - Số lượng phần tử
 * @param {number} [min=0] - Giá trị nhỏ nhất
 * @param {number} [max=100] - Giá trị lớn nhất
 * @returns {Float64Array} Mảng số thực ngẫu nhiên
 */
function generateTestData(count, min = 0, max = 100) {
    const data = new Float64Array(count);
    for (let i = 0; i < count; i++) data[i] = min + Math.random() * (max - min);
    return data;
}

// ==================== SORTER ====================

/**
 * Lớp triển khai thuật toán External Merge Sort
 * @class
 */
class ExternalMergeSort {
    constructor() {
        /** @type {boolean} Trạng thái tạm dừng */
        this.isPaused = false;
        /** @type {boolean} Trạng thái đã hủy */
        this.isCancelled = false;
        /** @type {Object[]} Các bước visualization đã ghi lại */
        this.visualizationSteps = [];
    }

    /**
     * Sắp xếp mảng sử dụng External Merge Sort
     * @param {Float64Array|number[]} data - Mảng cần sắp xếp
     * @param {Object} [options={}] - Tùy chọn cấu hình
     * @param {number} [options.runSize=5] - Kích thước mỗi run (giới hạn RAM)
     * @param {Function} [options.onProgress] - Callback cập nhật tiến trình
     * @param {Function} [options.onVisualization] - Callback hiển thị visualization
     * @param {boolean} [options.recordSteps=false] - Ghi lại các bước để replay
     * @returns {Promise<Float64Array>} Mảng đã sắp xếp
     */
    async sort(data, options = {}) {
        const { runSize = 5, onProgress = () => { }, onVisualization = () => { }, recordSteps = false } = options;
        this.isPaused = false;
        this.isCancelled = false;
        this.visualizationSteps = [];
        const arr = Array.from(data);
        if (arr.length <= 1) return new Float64Array(arr);

        onProgress(0, 'Bắt đầu sắp xếp...');
        onProgress(10, 'Chia dữ liệu thành các runs...');
        let runs = this._createRuns(arr, runSize);

        if (recordSteps) this._recordStep({ type: 'split', runs: runs.map(r => [...r]) });
        await onVisualization({ type: 'split', runs: runs.map(r => [...r]) });

        onProgress(30, 'Sắp xếp từng run...');
        for (let i = 0; i < runs.length; i++) {
            if (this.isCancelled) break;
            runs[i] = this._sortRun(runs[i]);
            onProgress(30 + (i / runs.length) * 20, `Sắp xếp run ${i + 1}/${runs.length}...`);
            if (recordSteps) this._recordStep({ type: 'sort', runs: runs.map(r => [...r]), activeRun: i });
            await onVisualization({ type: 'sort', runs: runs.map(r => [...r]), activeRun: i });
        }

        onProgress(50, 'Trộn các runs...');
        let mergePass = 0;
        while (runs.length > 1 && !this.isCancelled) {
            const newRuns = [];
            mergePass++;
            for (let i = 0; i < runs.length; i += 2) {
                if (this.isCancelled) break;
                if (i + 1 < runs.length) {
                    const merged = await this._mergeWithViz(runs[i], runs[i + 1], onVisualization, recordSteps);
                    newRuns.push(merged);
                } else {
                    newRuns.push(runs[i]);
                }
                onProgress(50 + (mergePass / Math.ceil(Math.log2(runs.length + 1))) * 40, `Lượt trộn ${mergePass}...`);
            }
            runs = newRuns;
        }

        onProgress(100, 'Hoàn tất!');
        await onVisualization({ type: 'complete', runs });
        return new Float64Array(runs[0] || []);
    }

    /**
     * Chia mảng thành các run có kích thước cố định
     * @param {number[]} arr - Mảng cần chia
     * @param {number} size - Kích thước mỗi run
     * @returns {number[][]} Mảng các run
     * @private
     */
    _createRuns(arr, size) {
        const runs = [];
        for (let i = 0; i < arr.length; i += size) runs.push(arr.slice(i, i + size));
        return runs;
    }

    /**
     * Sắp xếp một run trong bộ nhớ
     * @param {number[]} run - Run cần sắp xếp
     * @returns {number[]} Run đã sắp xếp tăng dần
     * @private
     */
    _sortRun(run) { return [...run].sort((a, b) => a - b); }

    /**
     * Merge hai run đã sắp xếp với visualization
     * @param {number[]} left - Run bên trái
     * @param {number[]} right - Run bên phải
     * @param {Function} onViz - Callback hiển thị từng bước merge
     * @param {boolean} recordSteps - Có ghi lại bước không
     * @returns {Promise<number[]>} Mảng đã merge
     * @private
     */
    async _mergeWithViz(left, right, onViz, recordSteps) {
        const result = [];
        let i = 0, j = 0;
        while (i < left.length && j < right.length) {
            if (this.isCancelled) break;
            while (this.isPaused && !this.isCancelled) await this._delay(100);
            if (left[i] <= right[j]) { result.push(left[i]); i++; }
            else { result.push(right[j]); j++; }
            if (recordSteps) this._recordStep({ type: 'merge_step', left: [...left], right: [...right], result: [...result] });
            await onViz({ type: 'merge', left: [...left], right: [...right], result: [...result], leftIndex: i - 1, rightIndex: j - 1 });
        }
        while (i < left.length) result.push(left[i++]);
        while (j < right.length) result.push(right[j++]);
        return result;
    }

    /** @private */
    _delay(ms) { return new Promise(r => setTimeout(r, ms)); }
    /** @private */
    _recordStep(step) { this.visualizationSteps.push({ ...step, timestamp: Date.now() }); }
    /** Tạm dừng quá trình sắp xếp */
    pause() { this.isPaused = true; }
    /** Tiếp tục quá trình sắp xếp */
    resume() { this.isPaused = false; }
    /** Hủy quá trình sắp xếp */
    cancel() { this.isCancelled = true; this.isPaused = false; }
}

// ==================== VISUALIZER ====================

/**
 * Lớp quản lý visualization cho quá trình sắp xếp
 * @class
 */
class SortVisualizer {
    /**
     * @param {HTMLElement} container - Container DOM chứa visualization
     */
    constructor(container) {
        /** @type {HTMLElement} Container chính */
        this.container = container;
        /** @type {HTMLElement[]} Danh sách các thanh (bar) */
        this.bars = [];
        /** @type {number} Tốc độ animation (ms) */
        this.animationSpeed = 150;
        /** @type {number} Giá trị lớn nhất để tính tỉ lệ chiều cao */
        this.maxValue = 0;
    }

    /**
     * Khởi tạo visualization với dữ liệu ban đầu
     * @param {number[]} data - Mảng dữ liệu cần hiển thị
     */
    init(data) {
        this.container.innerHTML = '';
        this.bars = [];
        this.maxValue = Math.max(...data.map(Math.abs));
        const barWidth = Math.max(10, Math.min(40, (this.container.clientWidth - 40) / data.length - 3));

        data.forEach(value => {
            const bar = document.createElement('div');
            bar.className = 'viz-bar';
            bar.style.width = `${barWidth}px`;
            bar.style.height = `${this._getBarHeight(value)}px`;

            const label = document.createElement('span');
            label.className = 'viz-bar-value';
            label.textContent = Number.isInteger(value) ? value : value.toFixed(1);
            bar.appendChild(label);

            this.container.appendChild(bar);
            this.bars.push(bar);
        });
    }

    /**
     * Tính chiều cao thanh dựa trên giá trị
     * @param {number} value - Giá trị cần tính chiều cao
     * @returns {number} Chiều cao tính bằng pixel
     * @private
     */
    _getBarHeight(value) {
        const h = 220, min = 10;
        if (this.maxValue === 0) return min;
        return min + (Math.abs(value) / this.maxValue) * (h - min);
    }

    /**
     * Cập nhật visualization theo bước sắp xếp
     * @param {Object} step - Thông tin bước (type: split|sort|merge|complete)
     */
    async update(step) {
        switch (step.type) {
            case 'split': await this._showSplit(step.runs); break;
            case 'sort': await this._showSort(step.runs, step.activeRun); break;
            case 'merge': await this._showMerge(step); break;
            case 'complete': await this._showComplete(step.runs[0]); break;
        }
    }

    /**
     * Hiển thị bước chia dữ liệu thành các run
     * @param {number[][]} runs - Các run đã chia
     * @private
     */
    async _showSplit(runs) {
        this.container.innerHTML = ''; this.bars = [];
        this.init(runs.flat());
        let idx = 0;
        const colors = ['#8fbcad', '#e8a87c', '#7ec8c8', '#c5a3d9', '#a0c4a0', '#e8c170'];
        runs.forEach((run, ri) => {
            run.forEach(() => { if (this.bars[idx]) this.bars[idx].style.background = colors[ri % colors.length]; idx++; });
        });
        await this._delay(this.animationSpeed);
    }

    /**
     * Hiển thị bước sắp xếp từng run
     * @param {number[][]} runs - Tất cả các run
     * @param {number} activeRun - Index của run đang được sắp xếp
     * @private
     */
    async _showSort(runs, activeRun) {
        this.container.innerHTML = ''; this.bars = [];
        this.init(runs.flat());
        let idx = 0;
        runs.forEach((run, ri) => {
            run.forEach(() => { if (this.bars[idx] && ri === activeRun) this.bars[idx].classList.add('sorted'); idx++; });
        });
        await this._delay(this.animationSpeed);
    }

    /**
     * Hiển thị bước merge hai run
     * @param {Object} step - Thông tin merge (left, right, leftIndex, rightIndex)
     * @private
     */
    async _showMerge(step) {
        this.container.innerHTML = ''; this.bars = [];
        this.init([...step.left, ...step.right]);
        if (step.leftIndex !== undefined && step.leftIndex < step.left.length && this.bars[step.leftIndex])
            this.bars[step.leftIndex].classList.add('comparing');
        if (step.rightIndex !== undefined) {
            const ri = step.left.length + step.rightIndex;
            if (this.bars[ri]) this.bars[ri].classList.add('merging');
        }
        await this._delay(this.animationSpeed / 2);
    }

    /**
     * Hiển thị kết quả sắp xếp hoàn tất với animation
     * @param {number[]} data - Mảng đã sắp xếp
     * @private
     */
    async _showComplete(data) {
        this.container.innerHTML = ''; this.bars = [];
        this.init(data);
        for (let i = 0; i < this.bars.length; i++) { this.bars[i].classList.add('sorted'); await this._delay(15); }
    }

    /**
     * Đặt tốc độ animation
     * @param {number} ms - Thời gian delay giữa các bước (milliseconds)
     */
    setSpeed(ms) { this.animationSpeed = ms; }
    /** @private */
    _delay(ms) { return new Promise(r => setTimeout(r, ms)); }
    /** Xóa toàn bộ visualization */
    clear() { this.container.innerHTML = ''; this.bars = []; }
}

// ==================== MAIN APP ====================

/**
 * Lớp quản lý ứng dụng chính External Sort Visualizer
 * Điều phối toàn bộ luồng: nhập liệu → cấu hình → sắp xếp → visualization → xuất kết quả
 * @class
 */
class App {
    constructor() {
        /** @type {Float64Array|null} Dữ liệu gốc chưa sắp xếp */
        this.originalData = null;
        /** @type {Float64Array|null} Dữ liệu đã sắp xếp */
        this.sortedData = null;
        /** @type {string} Tên file gốc (dùng cho tên file xuất) */
        this.originalFileName = 'data';
        /** @type {ExternalMergeSort} Instance thuật toán sắp xếp */
        this.sorter = new ExternalMergeSort();
        /** @type {SortVisualizer|null} Instance visualization */
        this.visualizer = null;
        /** @type {boolean} Đang chạy quá trình sắp xếp */
        this.isRunning = false;
        /** @type {boolean} Đang phát lại animation */
        this.isPlaying = false;
        /** @type {number} Index bước hiện tại trong visualization */
        this.currentStep = 0;
        /** @type {Object[]} Danh sách các bước visualization */
        this.steps = [];
        /** @type {number} Số phép so sánh đã thực hiện */
        this.comparisonCount = 0;
        /** @type {number} Số run đã tạo */
        this.numRuns = 0;
        /** @type {number} Giới hạn RAM (số phần tử mỗi run) */
        this.ramLimit = 5;
        /** @type {number} Số luồng merge (K-way) */
        this.kWay = 2;
        /** @type {number} Thời điểm bắt đầu sắp xếp (ms) */
        this.startTime = 0;

        this._initDOM();
        this._bindEvents();
        this._loadTheme();
        this._loadHistory();
        this._restoreSession();
        console.log('✅ External Sort Visualizer initialized');
    }

    /**
     * Khởi tạo tham chiếu đến các DOM elements
     * @private
     */
    _initDOM() {
        // Step nav
        this.stepNavBtns = document.querySelectorAll('.step-nav-btn');
        this.panels = {
            config: document.getElementById('panelConfig'),
            simulation: document.getElementById('panelSimulation'),
            result: document.getElementById('panelResult')
        };

        // Input tabs
        this.inputTabBtns = document.querySelectorAll('.input-tab-btn');
        this.inputTabs = {
            random: document.getElementById('inputRandom'),
            manual: document.getElementById('inputManual'),
            file: document.getElementById('inputFile')
        };

        // File info
        this.fileName = document.getElementById('fileName');
        this.fileSize = document.getElementById('fileSize');
        this.fileElements = document.getElementById('fileElements');
        this.fileMeta = document.getElementById('fileMeta');
        this.bufferBadge = document.getElementById('bufferBadge');

        // Input controls
        this.randomCount = document.getElementById('randomCount');
        this.randomMin = document.getElementById('randomMin');
        this.randomMax = document.getElementById('randomMax');
        this.generateBtn = document.getElementById('generateBtn');
        this.manualInput = document.getElementById('manualInput');
        this.parseBtn = document.getElementById('parseBtn');
        this.uploadZone = document.getElementById('uploadZone');
        this.fileInput = document.getElementById('fileInput');

        // Config
        this.dataPreview = document.getElementById('dataPreview');
        this.elementCount = document.getElementById('elementCount');
        this.dataDisplay = document.getElementById('dataDisplay');
        this.ramSlider = document.getElementById('ramSlider');
        this.ramValue = document.getElementById('ramValue');
        this.kWaySlider = document.getElementById('kWaySlider');
        this.kWayValue = document.getElementById('kWayValue');
        this.estRuns = document.getElementById('estRuns');
        this.estPass = document.getElementById('estPass');
        this.sortBtn = document.getElementById('sortBtn');

        // Step navigation
        this.stepNavBtns = document.querySelectorAll('.step-nav-btn');
        this.panels = {
            config: document.getElementById('panelConfig'),
            simulation: document.getElementById('panelSimulation'),
            result: document.getElementById('panelResult')
        };
        this.inputTabs = {
            random: document.getElementById('inputRandom'),
            manual: document.getElementById('inputManual'),
            file: document.getElementById('inputFile')
        };

        // Stats
        this.statSteps = document.getElementById('statSteps');
        this.statComparisons = document.getElementById('statComparisons');
        this.statDiskIO = document.getElementById('statDiskIO');
        this.statMemory = document.getElementById('statMemory');
        this.statMin = document.getElementById('statMin');
        this.statMax = document.getElementById('statMax');

        // Visualization
        this.vizContainer = document.getElementById('vizContainer');
        this.vizSubtitle = document.getElementById('vizSubtitle');
        this.stepBadge = document.getElementById('stepBadge');
        this.stepPhase = document.getElementById('stepPhase');
        this.stepDetail = document.getElementById('stepDetail');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.nextStepBtn = document.getElementById('nextStepBtn');
        this.resetVizBtn = document.getElementById('resetVizBtn');
        this.speedSlider = document.getElementById('speedSlider');
        this.speedDisplay = document.getElementById('speedDisplay');
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');

        // Download buttons
        this.downloadBtn = document.getElementById('downloadBtn');
        this.downloadTxtBtn = document.getElementById('downloadTxtBtn');

        // Result panel (center)
        this.rStatTotal = document.getElementById('rStatTotal');
        this.rStatRuns = document.getElementById('rStatRuns');
        this.rStatSteps = document.getElementById('rStatSteps');
        this.rStatCompare = document.getElementById('rStatCompare');
        this.resultData = document.getElementById('resultData');
        this.rMin = document.getElementById('rMin');
        this.rMax = document.getElementById('rMax');
        this.rDownloadBtn = document.getElementById('rDownloadBtn');
        this.rDownloadTxtBtn = document.getElementById('rDownloadTxtBtn');
        this.rNewSortBtn = document.getElementById('rNewSortBtn');

        // Theme & New session
        this.themeToggle = document.getElementById('themeToggle');
        this.newSessionBtn = document.getElementById('newSessionBtn');

        // History
        this.historyList = document.getElementById('historyList');
        this.viewAllHistoryBtn = document.getElementById('viewAllHistoryBtn');
    }

    /**
     * Đăng ký tất cả event handlers cho các DOM elements
     * @private
     */
    _bindEvents() {
        // Step nav
        this.stepNavBtns.forEach(btn => btn.addEventListener('click', () => this._switchStep(btn.dataset.step)));

        // Input tabs
        this.inputTabBtns.forEach(btn => btn.addEventListener('click', () => this._switchInputTab(btn.dataset.inputTab)));

        // Data input
        this.generateBtn.addEventListener('click', () => this._generateRandom());
        this.parseBtn.addEventListener('click', () => this._parseManual());
        this.fileInput.addEventListener('change', (e) => { if (e.target.files.length) this._processFile(e.target.files[0]); });
        this.uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); this.uploadZone.classList.add('dragover'); });
        this.uploadZone.addEventListener('dragleave', () => this.uploadZone.classList.remove('dragover'));
        this.uploadZone.addEventListener('drop', (e) => {
            e.preventDefault(); this.uploadZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) this._processFile(e.dataTransfer.files[0]);
        });

        // Config sliders
        this.ramSlider.addEventListener('input', (e) => { this.ramLimit = parseInt(e.target.value); this.ramValue.textContent = this.ramLimit; this._updateEstimation(); });
        this.kWaySlider.addEventListener('input', (e) => { this.kWay = parseInt(e.target.value); this.kWayValue.textContent = this.kWay; this._updateEstimation(); });

        // Sort
        this.sortBtn.addEventListener('click', () => this._startSort());

        // Playback
        this.playPauseBtn.addEventListener('click', () => this._togglePlayPause());
        this.nextStepBtn.addEventListener('click', () => this._nextStep());
        this.resetVizBtn.addEventListener('click', () => this._resetViz());

        // Speed
        this.speedSlider.addEventListener('input', (e) => {
            const ms = parseInt(e.target.value);
            this.speedDisplay.textContent = `${ms} ms`;
            if (this.visualizer) this.visualizer.setSpeed(ms);
        });

        // Downloads
        if (this.downloadBtn) this.downloadBtn.addEventListener('click', () => this._downloadBin());
        if (this.downloadTxtBtn) this.downloadTxtBtn.addEventListener('click', () => this._downloadTxt());
        this.rDownloadBtn.addEventListener('click', () => this._downloadBin());
        this.rDownloadTxtBtn.addEventListener('click', () => this._downloadTxt());
        if (this.rNewSortBtn) this.rNewSortBtn.addEventListener('click', () => this._reset());

        // Theme
        this.themeToggle.addEventListener('change', () => this._toggleTheme());

        // New session
        this.newSessionBtn.addEventListener('click', () => this._reset());
    }

    // ===== NAVIGATION =====
    /**
     * Chuyển đổi giữa các tab (Cấu hình / Mô phỏng / Kết quả)
     * @param {string} step - Tên tab: 'config' | 'simulation' | 'result'
     * @private
     */
    _switchStep(step) {
        this.stepNavBtns.forEach(b => b.classList.toggle('active', b.dataset.step === step));
        Object.keys(this.panels).forEach(k => this.panels[k].classList.toggle('active', k === step));
    }

    /**
     * Chuyển đổi tab nhập liệu (Random / Nhập tay / Tải tệp)
     * @param {string} tab - Tên tab: 'random' | 'manual' | 'file'
     * @private
     */
    _switchInputTab(tab) {
        this.inputTabBtns.forEach(b => b.classList.toggle('active', b.dataset.inputTab === tab));
        Object.keys(this.inputTabs).forEach(k => this.inputTabs[k].classList.toggle('active', k === tab));
    }

    // ===== DATA INPUT =====
    /**
     * Tạo dữ liệu ngẫu nhiên từ các tham số trên giao diện
     * @private
     */
    _generateRandom() {
        const count = parseInt(this.randomCount.value) || 20;
        const min = parseFloat(this.randomMin.value) || 0;
        const max = parseFloat(this.randomMax.value) || 100;
        if (count < 2 || count > 100) { alert('Số lượng phần tử phải từ 2 đến 100'); return; }
        if (min >= max) { alert('Min phải nhỏ hơn Max'); return; }
        this.originalData = generateTestData(count, min, max);
        this.originalFileName = 'random_data';
        this._onDataLoaded();
    }

    /**
     * Parse dữ liệu nhập tay từ textarea
     * @private
     */
    _parseManual() {
        const text = this.manualInput.value.trim();
        if (!text) { alert('Vui lòng nhập dữ liệu'); return; }
        const nums = text.split(/[\s,]+/).map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        if (nums.length < 2) { alert('Cần ít nhất 2 số hợp lệ'); return; }
        this.originalData = new Float64Array(nums);
        this.originalFileName = 'manual_data';
        this._onDataLoaded();
    }

    /**
     * Xử lý file nhị phân được upload
     * @param {File} file - Đối tượng File từ input hoặc drag-drop
     * @private
     */
    async _processFile(file) {
        try {
            this.originalFileName = file.name.replace(/\.[^.]+$/, '');
            this.originalData = await readBinaryFile(file);
            this._onDataLoaded(file.size);
        } catch (err) { alert('Lỗi: ' + err.message); }
    }

    /**
     * Xử lý sau khi dữ liệu được tải thành công
     * Cập nhật UI, hiển thị preview, enable nút sắp xếp, khởi tạo visualizer
     * @param {number} [fileBytes] - Kích thước file gốc (bytes), mặc định tính từ data
     * @private
     */
    _onDataLoaded(fileBytes) {
        const n = this.originalData.length;
        const bytes = fileBytes || n * 8;

        // Update file info
        this.fileName.textContent = this.originalFileName;
        this.fileSize.textContent = formatFileSize(bytes);
        this.fileElements.textContent = `${n} doubles`;
        this.fileMeta.style.display = 'flex';
        this.bufferBadge.style.display = 'inline';

        // Data preview
        this.elementCount.textContent = n;
        this.dataDisplay.innerHTML = '';
        Array.from(this.originalData).forEach(v => {
            const s = document.createElement('span');
            s.className = 'data-item';
            s.textContent = Number.isInteger(v) ? v : v.toFixed(2);
            this.dataDisplay.appendChild(s);
        });
        this.dataPreview.classList.remove('hidden');

        // Stats
        const data = Array.from(this.originalData);
        this.statMin.textContent = Math.min(...data).toFixed(2);
        this.statMax.textContent = Math.max(...data).toFixed(2);
        if (this.statMemory) this.statMemory.textContent = formatFileSize(bytes);

        // Enable sort
        this.sortBtn.disabled = false;
        this._updateEstimation();

        // Init visualizer
        this.visualizer = new SortVisualizer(this.vizContainer);
        this.visualizer.setSpeed(parseInt(this.speedSlider.value));

        // Save session
        this._saveSession();
    }

    /**
     * Cập nhật ước tính hiệu suất (số run, số pass) dựa trên cấu hình hiện tại
     * @private
     */
    _updateEstimation() {
        if (!this.originalData) return;
        const n = this.originalData.length, m = this.ramLimit, k = this.kWay;
        const numRuns = Math.ceil(n / m);
        const numPass = numRuns <= 1 ? 0 : Math.ceil(Math.log(numRuns) / Math.log(k));
        this.estRuns.textContent = numRuns;
        this.estPass.textContent = numPass;
    }

    // ===== SORTING =====
    /**
     * Bắt đầu quá trình sắp xếp External Merge Sort
     * Chuyển sang tab mô phỏng, chạy thuật toán với visualization realtime
     * @private
     */
    async _startSort() {
        if (this.isRunning || !this.originalData) return;
        this.isRunning = true;
        this.sortBtn.disabled = true;
        this.steps = [];
        this.currentStep = 0;
        this.comparisonCount = 0;
        this.numRuns = 0;
        this.startTime = performance.now();

        // Switch to simulation tab
        this._switchStep('simulation');
        this.visualizer.init(Array.from(this.originalData));
        this._setStatus('ĐANG XỬ LÝ', true);

        try {
            this.sortedData = await this.sorter.sort(this.originalData, {
                runSize: this.ramLimit,
                recordSteps: true,
                onProgress: (p, msg) => { this.vizSubtitle.textContent = msg; },
                onVisualization: async (step) => {
                    this.steps.push({ ...step });
                    this.currentStep = this.steps.length - 1;
                    if (step.type === 'split') this.numRuns = step.runs.length;
                    if (step.type === 'merge') this.comparisonCount++;
                    this._updateLiveStats();
                    this._updateStepInfo();
                    await this.visualizer.update(step);
                    await this._delay(this.visualizer.animationSpeed);
                }
            });

            const duration = Math.round(performance.now() - this.startTime);
            this._setStatus('HOÀN TẤT', false);
            this._showResults();
            this._addHistory(this.originalFileName, duration);
            this._saveSession();
            this.currentStep = this.steps.length - 1;
            this._updateStepInfo();

        } catch (err) {
            alert('Lỗi: ' + err.message);
            this._setStatus('LỖI', false);
        } finally {
            this.isRunning = false;
            this.sortBtn.disabled = false;
        }
    }

    /**
     * Cập nhật thống kê realtime trên sidebar (số bước, so sánh, I/O)
     * @private
     */
    _updateLiveStats() {
        this.statSteps.textContent = this.steps.length.toLocaleString();
        this.statComparisons.textContent = this.comparisonCount.toLocaleString();
        const ioMb = ((this.steps.length * 8 * (this.originalData?.length || 0)) / (1024 * 1024)).toFixed(1);
        if (this.statDiskIO) this.statDiskIO.textContent = `${ioMb} MB/s`;
    }

    /**
     * Cập nhật trạng thái hiển thị (SẴN SÀNG / ĐANG XỬ LÝ / HOÀN TẤT / LỖI)
     * @param {string} text - Nội dung trạng thái
     * @param {boolean} processing - true nếu đang xử lý (hiệu ứng dot nhấp nháy)
     * @private
     */
    _setStatus(text, processing) {
        this.statusText.textContent = text;
        this.statusDot.classList.toggle('processing', processing);
    }

    // ===== PLAYBACK =====
    /**
     * Chuyển đổi trạng thái Play/Pause khi phát lại visualization
     * @private
     */
    async _togglePlayPause() {
        if (this.isPlaying) {
            this.isPlaying = false;
            this.playPauseBtn.textContent = '▶';
        } else {
            this.isPlaying = true;
            this.playPauseBtn.textContent = '⏸';
            if (this.currentStep >= this.steps.length - 1) this.currentStep = 0;
            while (this.isPlaying && this.currentStep < this.steps.length - 1) {
                this.currentStep++;
                await this.visualizer.update(this.steps[this.currentStep]);
                this._updateStepInfo();
                await this._delay(this.visualizer.animationSpeed);
            }
            this.isPlaying = false;
            this.playPauseBtn.textContent = '▶';
        }
    }

    /**
     * Chuyển đến bước visualization tiếp theo
     * @private
     */
    async _nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            await this.visualizer.update(this.steps[this.currentStep]);
            this._updateStepInfo();
        }
    }

    /**
     * Đặt lại visualization về bước đầu tiên
     * @private
     */
    _resetViz() {
        this.isPlaying = false;
        this.currentStep = 0;
        this.playPauseBtn.textContent = '▶';
        if (this.steps.length > 0) {
            this.visualizer.update(this.steps[0]);
            this._updateStepInfo();
        }
    }

    /**
     * Cập nhật thông tin bước hiện tại (số bước, giai đoạn, chi tiết)
     * @private
     */
    _updateStepInfo() {
        if (this.steps.length === 0) return;
        const step = this.steps[this.currentStep];
        if (this.isRunning) {
            this.stepBadge.textContent = `Bước ${this.currentStep + 1}`;
        } else {
            this.stepBadge.textContent = `Bước ${this.currentStep + 1}/${this.steps.length}`;
        }

        switch (step.type) {
            case 'split':
                this.stepPhase.textContent = '📦 Giai đoạn 1: Tạo Run';
                this.stepDetail.textContent = `Chia thành ${step.runs.length} run. Kích thước: [${step.runs.map(r => r.length).join(', ')}]`;
                break;
            case 'sort':
                this.stepPhase.textContent = '🔄 Sắp xếp Run';
                this.stepDetail.textContent = `Sắp xếp Run ${step.activeRun + 1}/${step.runs.length} trong bộ nhớ.`;
                break;
            case 'merge':
                this.stepPhase.textContent = '🔀 Trộn K-Way Merge';
                this.stepDetail.textContent = `Trộn 2 run: [${step.left.slice(0, 3).map(n => n.toFixed(1)).join(',')}...] và [${step.right.slice(0, 3).map(n => n.toFixed(1)).join(',')}...]`;
                break;
            case 'complete':
                this.stepPhase.textContent = '✅ Hoàn tất!';
                this.stepDetail.textContent = `${step.runs[0].length} phần tử đã sắp xếp tăng dần.`;
                break;
            default:
                this.stepPhase.textContent = '⏳ Đang xử lý';
                this.stepDetail.textContent = 'Đang thực hiện bước tiếp theo...';
        }
    }

    // ===== RESULTS =====
    /**
     * Hiển thị kết quả sắp xếp trên tab Kết quả
     * Bao gồm thống kê, preview dữ liệu, và giá trị MIN/MAX
     * @private
     */
    _showResults() {
        if (!this.sortedData) return;
        const data = Array.from(this.sortedData);
        const minVal = Math.min(...data);
        const maxVal = Math.max(...data);

        // Left sidebar result card
        if (this.resultCard) this.resultCard.style.display = 'block';

        // Center result panel stats
        this.rStatTotal.textContent = data.length;
        this.rStatRuns.textContent = this.numRuns;
        this.rStatSteps.textContent = this.steps.length;
        this.rStatCompare.textContent = this.comparisonCount;

        // Result data preview
        this.resultData.innerHTML = '';
        const preview = Math.min(data.length, 30);
        for (let i = 0; i < preview; i++) {
            const s = document.createElement('span');
            s.className = 'data-item';
            s.textContent = data[i].toFixed(2);
            this.resultData.appendChild(s);
        }
        if (data.length > preview) {
            const s = document.createElement('span');
            s.className = 'data-item';
            s.style.opacity = '0.6';
            s.textContent = `+${data.length - preview} more`;
            this.resultData.appendChild(s);
        }

        // MinMax
        this.rMin.textContent = minVal.toFixed(2);
        this.rMax.textContent = maxVal.toFixed(2);
        this.statMin.textContent = minVal.toFixed(2);
        this.statMax.textContent = maxVal.toFixed(2);
    }

    // ===== DOWNLOADS =====
    /**
     * Tải xuống file kết quả dạng nhị phân (.bin)
     * @private
     */
    _downloadBin() {
        if (!this.sortedData) return;
        downloadFile(createBinaryFile(this.sortedData), `${this.originalFileName}_sorted.bin`);
    }

    /**
     * Tải xuống file kết quả dạng văn bản (.txt)
     * @private
     */
    _downloadTxt() {
        if (!this.sortedData) return;
        const text = Array.from(this.sortedData).map(n => n.toFixed(6)).join('\n');
        downloadFile(new Blob([text], { type: 'text/plain' }), `${this.originalFileName}_sorted.txt`);
    }

    // ===== THEME =====
    /**
     * Chuyển đổi giữa Dark mode và Light mode
     * @private
     */
    _toggleTheme() {
        const html = document.documentElement;
        const isDark = this.themeToggle.checked;
        html.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('esv-theme', isDark ? 'dark' : 'light');
    }

    /**
     * Tải theme đã lưu từ localStorage
     * @private
     */
    _loadTheme() {
        const saved = localStorage.getItem('esv-theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
            this.themeToggle.checked = saved === 'dark';
        }
    }

    // ===== HISTORY =====
    /**
     * Thêm một mục vào lịch sử sắp xếp (lưu localStorage, tối đa 10 mục)
     * @param {string} name - Tên file/dữ liệu
     * @param {number} durationMs - Thời gian sắp xếp (ms)
     * @private
     */
    _addHistory(name, durationMs) {
        const history = JSON.parse(localStorage.getItem('esv-history') || '[]');
        history.unshift({
            name: name,
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            duration: `${durationMs}ms`,
            status: 'Hoàn tất',
            elements: this.originalData?.length || 0
        });
        if (history.length > 10) history.pop();
        localStorage.setItem('esv-history', JSON.stringify(history));
        this._renderHistory(history);
    }

    /**
     * Tải và hiển thị lịch sử sắp xếp từ localStorage
     * @private
     */
    _loadHistory() {
        const history = JSON.parse(localStorage.getItem('esv-history') || '[]');
        this._renderHistory(history);
    }

    /**
     * Render danh sách lịch sử lên giao diện
     * @param {Object[]} history - Mảng các mục lịch sử
     * @private
     */
    _renderHistory(history) {
        if (!this.historyList) return;
        if (history.length === 0) {
            this.historyList.innerHTML = '<p class="history-empty">Chưa có lịch sử sắp xếp</p>';
            if (this.viewAllHistoryBtn) this.viewAllHistoryBtn.style.display = 'none';
            return;
        }
        this.historyList.innerHTML = '';
        const show = history.slice(0, 3);
        show.forEach(h => {
            const el = document.createElement('div');
            el.className = 'history-item';
            el.innerHTML = `
                <div class="history-item-title">${h.name}</div>
                <div class="history-item-meta">${h.time} • ${h.duration} • ${h.elements} phần tử</div>
                <div class="history-item-status">✅ ${h.status}</div>
            `;
            this.historyList.appendChild(el);
        });
        if (this.viewAllHistoryBtn) this.viewAllHistoryBtn.style.display = history.length > 3 ? 'block' : 'none';
    }

    // ===== SESSION STORAGE =====
    /**
     * Lưu phiên làm việc hiện tại vào sessionStorage
     * Bao gồm dữ liệu gốc, dữ liệu đã sắp xếp, và thống kê
     * @private
     */
    _saveSession() {
        try {
            const session = {
                hasData: !!this.originalData,
                fileName: this.originalFileName,
                hasSorted: !!this.sortedData,
                stats: {
                    steps: this.steps.length,
                    comparisons: this.comparisonCount,
                    runs: this.numRuns
                }
            };
            if (this.originalData && this.originalData.length <= 200) {
                session.originalData = Array.from(this.originalData);
            }
            if (this.sortedData && this.sortedData.length <= 200) {
                session.sortedData = Array.from(this.sortedData);
            }
            sessionStorage.setItem('esv-session', JSON.stringify(session));

        } catch (e) { console.warn('Không thể lưu phiên:', e); }
    }

    /**
     * Khôi phục phiên làm việc từ sessionStorage (nếu có)
     * @private
     */
    _restoreSession() {
        try {
            const raw = sessionStorage.getItem('esv-session');
            if (!raw) return;
            const session = JSON.parse(raw);
            if (session.originalData) {
                this.originalData = new Float64Array(session.originalData);
                this.originalFileName = session.fileName || 'data';
                this._onDataLoaded();
            }
            if (session.sortedData) {
                this.sortedData = new Float64Array(session.sortedData);
                this.comparisonCount = session.stats?.comparisons || 0;
                this.numRuns = session.stats?.runs || 0;
                this._showResults();
            }
        } catch (e) { console.warn('Không thể khôi phục phiên:', e); }
    }

    // ===== RESET =====
    /**
     * Reset toàn bộ ứng dụng về trạng thái ban đầu
     * Hủy sắp xếp, xóa dữ liệu, xóa visualization, xóa session
     * @private
     */
    _reset() {
        this.sorter.cancel();
        this.isRunning = false;
        this.isPlaying = false;
        this.originalData = null;
        this.sortedData = null;
        this.steps = [];
        this.currentStep = 0;
        this.comparisonCount = 0;
        this.numRuns = 0;

        this.fileInput.value = '';
        this.manualInput.value = '';
        this.fileName.textContent = 'Chưa có tệp';
        this.fileMeta.style.display = 'none';
        this.bufferBadge.style.display = 'none';
        this.dataPreview.classList.add('hidden');
        if (this.resultCard) this.resultCard.style.display = 'none';
        this.sortBtn.disabled = true;
        this.playPauseBtn.textContent = '▶';

        // Reset stats
        this.statSteps.textContent = '0';
        this.statComparisons.textContent = '0';
        if (this.statDiskIO) this.statDiskIO.textContent = '0 MB/s';
        if (this.statMemory) this.statMemory.textContent = '0 MB';
        this.statMin.textContent = '—';
        this.statMax.textContent = '—';
        this.estRuns.textContent = '—';
        this.estPass.textContent = '—';

        if (this.visualizer) this.visualizer.clear();
        this._setStatus('SẴN SÀNG', false);
        this._switchStep('config');

        sessionStorage.removeItem('esv-session');
    }

    /** @private */
    _delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
