/**
 * @fileoverview Binary File Sorter - All-in-one JavaScript
 * @description Sắp xếp tệp nhị phân với External Merge Sort và Visualization
 * @author DSA++ Team
 * @version 2.0.0
 */

// ==================== FILE HANDLER ====================

/**
 * Đọc tệp nhị phân và chuyển đổi thành mảng số thực
 * @param {File} file - Đối tượng File từ input
 * @returns {Promise<Float64Array>} Mảng số thực Double precision
 */
async function readBinaryFile(file) {
    if (!file) throw new Error('Không có tệp được chọn');
    if (file.size === 0) throw new Error('Tệp trống');
    if (file.size % 8 !== 0) throw new Error('Tệp không hợp lệ: kích thước không chia hết cho 8 bytes');

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                resolve(new Float64Array(event.target.result));
            } catch (error) {
                reject(new Error('Lỗi khi phân tích dữ liệu: ' + error.message));
            }
        };
        reader.onerror = () => reject(new Error('Lỗi khi đọc tệp'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Tạo tệp nhị phân từ mảng số thực
 */
function createBinaryFile(data) {
    const float64Array = data instanceof Float64Array ? data : new Float64Array(data);
    const buffer = float64Array.buffer.slice(float64Array.byteOffset, float64Array.byteOffset + float64Array.byteLength);
    return new Blob([buffer], { type: 'application/octet-stream' });
}

/**
 * Tải xuống tệp nhị phân
 */
function downloadFile(blob, filename = 'sorted_output.bin') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Định dạng kích thước tệp
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
}

/**
 * Tạo dữ liệu test ngẫu nhiên (số nguyên)
 */
function generateTestData(count, min = 0, max = 100) {
    const data = new Float64Array(count);
    for (let i = 0; i < count; i++) {
        data[i] = Math.floor(min + Math.random() * (max - min + 1));
    }
    return data;
}

// ==================== SORTER ====================

/**
 * Lớp External Merge Sort
 */
class ExternalMergeSort {
    constructor() {
        this.isPaused = false;
        this.isCancelled = false;
        this.visualizationSteps = [];
    }

    async sort(data, options = {}) {
        const { runSize = 5, onProgress = () => { }, onVisualization = () => { }, recordSteps = false } = options;
        this.isPaused = false;
        this.isCancelled = false;
        this.visualizationSteps = [];

        const arr = Array.from(data);
        if (arr.length <= 1) return new Float64Array(arr);

        onProgress(0, 'Bắt đầu sắp xếp...');

        // Phase 1: Tạo runs
        onProgress(10, 'Chia dữ liệu thành các runs...');
        let runs = this._createRuns(arr, runSize);

        if (recordSteps) this._recordStep({ type: 'split', runs: runs.map(r => [...r]) });
        await onVisualization({ type: 'split', runs: runs.map(r => [...r]) });

        // Phase 2: Sắp xếp từng run
        onProgress(30, 'Sắp xếp từng run...');
        for (let i = 0; i < runs.length; i++) {
            if (this.isCancelled) break;
            runs[i] = this._sortRun(runs[i]);
            onProgress(30 + (i / runs.length) * 20, `Sắp xếp run ${i + 1}/${runs.length}...`);
            if (recordSteps) this._recordStep({ type: 'sort', runs: runs.map(r => [...r]), activeRun: i });
            await onVisualization({ type: 'sort', runs: runs.map(r => [...r]), activeRun: i });
        }

        // Phase 3: Merge
        onProgress(50, 'Trộn các runs...');
        let mergePass = 0;

        while (runs.length > 1 && !this.isCancelled) {
            const newRuns = [];
            mergePass++;

            for (let i = 0; i < runs.length; i += 2) {
                if (this.isCancelled) break;
                if (i + 1 < runs.length) {
                    const merged = await this._mergeWithVisualization(runs[i], runs[i + 1], onVisualization, recordSteps);
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

    _createRuns(arr, runSize) {
        const runs = [];
        for (let i = 0; i < arr.length; i += runSize) runs.push(arr.slice(i, i + runSize));
        return runs;
    }

    _sortRun(run) { return [...run].sort((a, b) => a - b); }

    async _mergeWithVisualization(left, right, onVisualization, recordSteps) {
        const result = [];
        let i = 0, j = 0;

        while (i < left.length && j < right.length) {
            if (this.isCancelled) break;
            while (this.isPaused && !this.isCancelled) await this._delay(100);

            if (left[i] <= right[j]) { result.push(left[i]); i++; }
            else { result.push(right[j]); j++; }

            if (recordSteps) this._recordStep({ type: 'merge_step', left: [...left], right: [...right], result: [...result] });
            await onVisualization({ type: 'merge', left: [...left], right: [...right], result: [...result], leftIndex: i - 1, rightIndex: j - 1 });
        }

        while (i < left.length) result.push(left[i++]);
        while (j < right.length) result.push(right[j++]);
        return result;
    }

    _delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    _recordStep(step) { this.visualizationSteps.push({ ...step, timestamp: Date.now() }); }
    pause() { this.isPaused = true; }
    resume() { this.isPaused = false; }
    cancel() { this.isCancelled = true; this.isPaused = false; }
}

// ==================== VISUALIZER ====================

class SortVisualizer {
    constructor(container) {
        this.container = container;
        this.bars = [];
        this.animationSpeed = 800; // Chậm hơn
        this.maxValue = 0;
    }

    init(data) {
        this.container.innerHTML = '';
        this.bars = [];
        this.maxValue = Math.max(...data.map(Math.abs));
        const barWidth = Math.max(30, Math.min(50, (this.container.clientWidth - 20) / data.length - 4));

        data.forEach((value) => {
            const bar = document.createElement('div');
            bar.className = 'viz-bar';
            bar.style.width = `${barWidth}px`;
            bar.style.height = `${this._getBarHeight(value)}px`;

            // Số hiển thị trên cột (số nguyên)
            const valueLabel = document.createElement('span');
            valueLabel.className = 'viz-bar-value';
            valueLabel.textContent = Math.round(value);
            bar.appendChild(valueLabel);

            this.container.appendChild(bar);
            this.bars.push(bar);
        });
    }

    _getBarHeight(value) {
        const containerHeight = 180;
        const minHeight = 10;
        if (this.maxValue === 0) return minHeight;
        return minHeight + (Math.abs(value) / this.maxValue) * (containerHeight - minHeight);
    }

    async update(step) {
        switch (step.type) {
            case 'split': await this._showSplit(step.runs); break;
            case 'sort': await this._showSort(step.runs, step.activeRun); break;
            case 'merge': await this._showMerge(step); break;
            case 'complete': await this._showComplete(step.runs[0]); break;
        }
    }

    async _showSplit(runs) {
        this.container.innerHTML = '';
        this.bars = [];
        this.init(runs.flat());

        let idx = 0;
        const colors = ['#FFB7B2', '#FFDAC1', '#B5EAD7', '#C7CEEA', '#FF9AA2', '#E2F0CB'];
        runs.forEach((run, runIdx) => {
            run.forEach(() => {
                if (this.bars[idx]) this.bars[idx].style.background = colors[runIdx % colors.length];
                idx++;
            });
        });
        await this._delay(this.animationSpeed);
    }

    async _showSort(runs, activeRun) {
        this.container.innerHTML = '';
        this.bars = [];
        this.init(runs.flat());

        let idx = 0;
        runs.forEach((run, runIdx) => {
            run.forEach(() => {
                if (this.bars[idx] && runIdx === activeRun) this.bars[idx].classList.add('sorted');
                idx++;
            });
        });
        await this._delay(this.animationSpeed);
    }

    async _showMerge(step) {
        this.container.innerHTML = '';
        this.bars = [];
        this.init([...step.left, ...step.right]);

        if (step.leftIndex !== undefined && step.leftIndex < step.left.length && this.bars[step.leftIndex]) {
            this.bars[step.leftIndex].classList.add('comparing');
        }
        if (step.rightIndex !== undefined) {
            const rightBarIdx = step.left.length + step.rightIndex;
            if (this.bars[rightBarIdx]) this.bars[rightBarIdx].classList.add('merging');
        }
        await this._delay(this.animationSpeed / 2);
    }

    async _showComplete(sortedData) {
        this.container.innerHTML = '';
        this.bars = [];
        this.init(sortedData);
        for (let i = 0; i < this.bars.length; i++) {
            this.bars[i].classList.add('sorted');
            await this._delay(20);
        }
    }

    setSpeed(speed) { this.animationSpeed = 1200 - (speed * 100); } // speed 1 = 1100ms, speed 10 = 200ms
    _delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    clear() { this.container.innerHTML = ''; this.bars = []; }
}

// ==================== MAIN APP ====================

const DEFAULT_RUN_SIZE = 5;

class BinaryFileSorterApp {
    constructor() {
        this.originalData = null;
        this.sortedData = null;
        this.originalFileName = 'data';
        this.sorter = new ExternalMergeSort();
        this.visualizer = null;
        this.isRunning = false;
        this.isPlaying = false;
        this.currentStep = 0;
        this.steps = [];

        this._initElements();
        this._bindEvents();
        console.log('✅ Binary File Sorter initialized!');
    }

    _initElements() {
        this.inputSection = document.getElementById('inputSection');
        this.dataPreview = document.getElementById('dataPreview');
        this.controlSection = document.getElementById('controlSection');
        this.progressSection = document.getElementById('progressSection');
        this.visualizationSection = document.getElementById('visualizationSection');
        this.resultSection = document.getElementById('resultSection');

        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');

        this.randomCount = document.getElementById('randomCount');
        this.randomMin = document.getElementById('randomMin');
        this.randomMax = document.getElementById('randomMax');
        this.generateBtn = document.getElementById('generateBtn');

        this.manualInput = document.getElementById('manualInput');
        this.parseBtn = document.getElementById('parseBtn');

        this.uploadZone = document.getElementById('uploadZone');
        this.fileInput = document.getElementById('fileInput');

        this.elementCount = document.getElementById('elementCount');
        this.dataDisplay = document.getElementById('dataDisplay');

        this.sortBtn = document.getElementById('sortBtn');
        this.resetBtn = document.getElementById('resetBtn');

        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');

        this.vizContainer = document.getElementById('vizContainer');
        this.prevStepBtn = document.getElementById('prevStepBtn');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.nextStepBtn = document.getElementById('nextStepBtn');
        this.speedSlider = document.getElementById('speedSlider');

        this.resultStats = document.getElementById('resultStats');
        this.downloadBtn = document.getElementById('downloadBtn');
    }

    _bindEvents() {
        // Tabs
        this.tabBtns.forEach(btn => btn.addEventListener('click', () => this._switchTab(btn.dataset.tab)));

        // Random
        this.generateBtn.addEventListener('click', () => this._generateRandom());

        // Manual
        this.parseBtn.addEventListener('click', () => this._parseManual());

        // File
        this.fileInput.addEventListener('change', (e) => this._handleFileSelect(e));
        this.uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); this.uploadZone.classList.add('dragover'); });
        this.uploadZone.addEventListener('dragleave', () => this.uploadZone.classList.remove('dragover'));
        this.uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) this._processFile(e.dataTransfer.files[0]);
        });
        this.uploadZone.addEventListener('click', () => this.fileInput.click());

        // Controls
        this.sortBtn.addEventListener('click', () => this._startSort());
        this.resetBtn.addEventListener('click', () => this._reset());
        this.downloadBtn.addEventListener('click', () => this._downloadResult());

        // Step controls
        this.prevStepBtn.addEventListener('click', () => this._prevStep());
        this.nextStepBtn.addEventListener('click', () => this._nextStep());
        this.playPauseBtn.addEventListener('click', () => this._togglePlayPause());
        this.speedSlider.addEventListener('input', (e) => { if (this.visualizer) this.visualizer.setSpeed(parseInt(e.target.value)); });
    }

    _switchTab(tabName) {
        this.tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
        const tabIds = { random: 'randomTab', manual: 'manualTab', file: 'fileTab' };
        this.tabContents.forEach(content => content.classList.toggle('active', content.id === tabIds[tabName]));
    }

    _generateRandom() {
        const count = parseInt(this.randomCount.value) || 20;
        const min = parseFloat(this.randomMin.value) || 0;
        const max = parseFloat(this.randomMax.value) || 100;

        if (count < 2 || count > 100) { alert('Số lượng phần tử phải từ 2 đến 100'); return; }
        if (min >= max) { alert('Giá trị nhỏ nhất phải nhỏ hơn giá trị lớn nhất'); return; }

        this.originalData = generateTestData(count, min, max);
        this.originalFileName = 'random_data';
        this._showDataPreview();
        console.log('✅ Generated', count, 'random numbers');
    }

    _parseManual() {
        const text = this.manualInput.value.trim();
        if (!text) { alert('Vui lòng nhập dữ liệu'); return; }

        const numbers = text.split(/[\s,]+/).map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        if (numbers.length < 2) { alert('Cần ít nhất 2 số hợp lệ'); return; }

        this.originalData = new Float64Array(numbers);
        this.originalFileName = 'manual_data';
        this._showDataPreview();
    }

    async _handleFileSelect(e) {
        if (e.target.files.length) await this._processFile(e.target.files[0]);
    }

    async _processFile(file) {
        try {
            this.originalFileName = file.name.replace(/\.[^.]+$/, '');
            this.originalData = await readBinaryFile(file);
            this._showDataPreview();
        } catch (error) {
            alert('Lỗi: ' + error.message);
        }
    }

    _showDataPreview() {
        this.elementCount.textContent = this.originalData.length;
        this.dataDisplay.innerHTML = '';
        Array.from(this.originalData).forEach(num => {
            const item = document.createElement('span');
            item.className = 'data-item';
            item.textContent = Number.isInteger(num) ? num : num.toFixed(2);
            this.dataDisplay.appendChild(item);
        });

        this._showElement(this.dataPreview);
        this._showElement(this.controlSection);
        this._hideElement(this.progressSection);
        this._hideElement(this.visualizationSection);
        this._hideElement(this.resultSection);

        this.visualizer = new SortVisualizer(this.vizContainer);
        this.visualizer.setSpeed(parseInt(this.speedSlider.value));
    }

    async _startSort() {
        if (this.isRunning || !this.originalData) return;

        this.isRunning = true;
        this.sortBtn.disabled = true;
        this.steps = [];
        this.currentStep = 0;
        const startTime = performance.now();

        this._showElement(this.progressSection);
        this._showElement(this.visualizationSection);
        this.visualizer.init(Array.from(this.originalData));

        try {
            this.sortedData = await this.sorter.sort(this.originalData, {
                runSize: DEFAULT_RUN_SIZE,
                recordSteps: true,
                onProgress: (progress, msg) => this._updateProgress(progress, msg),
                onVisualization: async (step) => {
                    this.steps.push({ ...step });
                    await this.visualizer.update(step);
                    await this._delay(this.visualizer.animationSpeed);
                }
            });

            const duration = ((performance.now() - startTime) / 1000).toFixed(2);
            this._hideElement(this.progressSection);
            this._showElement(this.resultSection);
            this.resultStats.textContent = `Đã sắp xếp ${this.sortedData.length} phần tử trong ${duration} giây`;
            this.currentStep = this.steps.length - 1;
            this._updateStepControls();
        } catch (error) {
            alert('Lỗi: ' + error.message);
        } finally {
            this.isRunning = false;
            this.sortBtn.disabled = false;
        }
    }

    _updateProgress(progress, message) {
        this.progressFill.style.width = `${progress}%`;
        this.progressText.textContent = message;
    }

    async _prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            await this.visualizer.update(this.steps[this.currentStep]);
            this._updateStepControls();
        }
    }

    async _nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            await this.visualizer.update(this.steps[this.currentStep]);
            this._updateStepControls();
        }
    }

    async _togglePlayPause() {
        if (this.isPlaying) {
            this.isPlaying = false;
            this.playPauseBtn.innerHTML = '▶ Chạy';
        } else {
            this.isPlaying = true;
            this.playPauseBtn.innerHTML = '⏸ Dừng';
            if (this.currentStep >= this.steps.length - 1) this.currentStep = 0;

            while (this.isPlaying && this.currentStep < this.steps.length - 1) {
                this.currentStep++;
                await this.visualizer.update(this.steps[this.currentStep]);
                this._updateStepControls();
                await this._delay(this.visualizer.animationSpeed);
            }
            this.isPlaying = false;
            this.playPauseBtn.innerHTML = '▶ Chạy';
        }
    }

    _updateStepControls() {
        this.prevStepBtn.disabled = this.currentStep <= 0;
        this.nextStepBtn.disabled = this.currentStep >= this.steps.length - 1;
    }

    _downloadResult() {
        if (!this.sortedData) return;
        downloadFile(createBinaryFile(this.sortedData), `${this.originalFileName}_sorted.bin`);
    }

    _reset() {
        this.sorter.cancel();
        this.isRunning = false;
        this.isPlaying = false;
        this.originalData = null;
        this.sortedData = null;
        this.steps = [];
        this.currentStep = 0;

        this.fileInput.value = '';
        this.manualInput.value = '';

        this._hideElement(this.dataPreview);
        this._hideElement(this.controlSection);
        this._hideElement(this.progressSection);
        this._hideElement(this.visualizationSection);
        this._hideElement(this.resultSection);

        if (this.visualizer) this.visualizer.clear();
        this.progressFill.style.width = '0%';
        this.sortBtn.disabled = false;
        this.playPauseBtn.innerHTML = '▶ Chạy';
    }

    _showElement(el) { el.classList.remove('hidden'); el.classList.add('fade-in'); }
    _hideElement(el) { el.classList.add('hidden'); }
    _delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BinaryFileSorterApp();
});
