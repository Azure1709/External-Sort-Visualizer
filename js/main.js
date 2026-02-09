/**
 * @fileoverview Module chính điều khiển ứng dụng Binary File Sorter
 * @author DSA++ Team
 * @version 2.0.0
 */

import { readBinaryFile, createBinaryFile, downloadFile, formatFileSize, generateTestData } from './fileHandler.js';
import { ExternalMergeSort } from './sorter.js';
import { SortVisualizer } from './visualizer.js';

/** Kích thước mỗi run trong External Merge Sort */
const DEFAULT_RUN_SIZE = 5;

/**
 * Lớp quản lý ứng dụng chính
 * @class
 */
class BinaryFileSorterApp {
    constructor() {
        /** @type {Float64Array|null} Dữ liệu gốc */
        this.originalData = null;

        /** @type {Float64Array|null} Dữ liệu đã sắp xếp */
        this.sortedData = null;

        /** @type {string} Tên file gốc */
        this.originalFileName = 'data';

        /** @type {ExternalMergeSort} Instance sorter */
        this.sorter = new ExternalMergeSort();

        /** @type {SortVisualizer|null} Instance visualizer */
        this.visualizer = null;

        /** @type {boolean} Trạng thái đang chạy */
        this.isRunning = false;

        /** @type {boolean} Đang play animation */
        this.isPlaying = false;

        /** @type {number} Bước hiện tại */
        this.currentStep = 0;

        /** @type {Object[]} Các bước visualization */
        this.steps = [];

        this._initElements();
        this._bindEvents();
    }

    /** Khởi tạo tham chiếu DOM elements */
    _initElements() {
        // Sections
        this.inputSection = document.getElementById('inputSection');
        this.dataPreview = document.getElementById('dataPreview');
        this.controlSection = document.getElementById('controlSection');
        this.progressSection = document.getElementById('progressSection');
        this.visualizationSection = document.getElementById('visualizationSection');
        this.resultSection = document.getElementById('resultSection');

        // Tabs
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');

        // Random controls
        this.randomCount = document.getElementById('randomCount');
        this.randomMin = document.getElementById('randomMin');
        this.randomMax = document.getElementById('randomMax');
        this.generateBtn = document.getElementById('generateBtn');

        // Manual input
        this.manualInput = document.getElementById('manualInput');
        this.parseBtn = document.getElementById('parseBtn');

        // File upload
        this.uploadZone = document.getElementById('uploadZone');
        this.fileInput = document.getElementById('fileInput');

        // Data preview
        this.elementCount = document.getElementById('elementCount');
        this.dataDisplay = document.getElementById('dataDisplay');

        // Controls
        this.sortBtn = document.getElementById('sortBtn');
        this.resetBtn = document.getElementById('resetBtn');

        // Progress
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');

        // Visualization
        this.vizContainer = document.getElementById('vizContainer');
        this.prevStepBtn = document.getElementById('prevStepBtn');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.nextStepBtn = document.getElementById('nextStepBtn');
        this.speedSlider = document.getElementById('speedSlider');

        // Result
        this.resultStats = document.getElementById('resultStats');
        this.downloadBtn = document.getElementById('downloadBtn');
    }

    /** Đăng ký event handlers */
    _bindEvents() {
        // Tabs
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this._switchTab(btn.dataset.tab));
        });

        // Random generate
        this.generateBtn.addEventListener('click', () => this._generateRandom());

        // Manual parse
        this.parseBtn.addEventListener('click', () => this._parseManual());

        // File input
        this.fileInput.addEventListener('change', (e) => this._handleFileSelect(e));

        // Drag & drop
        this.uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadZone.classList.add('dragover');
        });
        this.uploadZone.addEventListener('dragleave', () => {
            this.uploadZone.classList.remove('dragover');
        });
        this.uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                this._processFile(e.dataTransfer.files[0]);
            }
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
        this.speedSlider.addEventListener('input', (e) => {
            if (this.visualizer) {
                this.visualizer.setSpeed(parseInt(e.target.value));
            }
        });
    }

    /** Chuyển tab */
    _switchTab(tabName) {
        // Update buttons
        this.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update content
        const tabIds = { random: 'randomTab', manual: 'manualTab', file: 'fileTab' };
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === tabIds[tabName]);
        });
    }

    /** Tạo dữ liệu ngẫu nhiên */
    _generateRandom() {
        const count = parseInt(this.randomCount.value) || 20;
        const min = parseFloat(this.randomMin.value) || 0;
        const max = parseFloat(this.randomMax.value) || 100;

        if (count < 2 || count > 100) {
            alert('Số lượng phần tử phải từ 2 đến 100');
            return;
        }

        if (min >= max) {
            alert('Giá trị nhỏ nhất phải nhỏ hơn giá trị lớn nhất');
            return;
        }

        this.originalData = generateTestData(count, min, max);
        this.originalFileName = 'random_data';
        this._showDataPreview();
    }

    /** Parse dữ liệu nhập tay */
    _parseManual() {
        const text = this.manualInput.value.trim();
        if (!text) {
            alert('Vui lòng nhập dữ liệu');
            return;
        }

        // Parse numbers from text (support comma, space, newline)
        const numbers = text.split(/[\s,]+/)
            .map(s => parseFloat(s.trim()))
            .filter(n => !isNaN(n));

        if (numbers.length < 2) {
            alert('Cần ít nhất 2 số hợp lệ');
            return;
        }

        this.originalData = new Float64Array(numbers);
        this.originalFileName = 'manual_data';
        this._showDataPreview();
    }

    /** Xử lý chọn file */
    async _handleFileSelect(e) {
        if (e.target.files.length) {
            await this._processFile(e.target.files[0]);
        }
    }

    /** Xử lý file đã chọn */
    async _processFile(file) {
        try {
            this.originalFileName = file.name.replace(/\.[^.]+$/, '');
            this.originalData = await readBinaryFile(file);
            this._showDataPreview();
        } catch (error) {
            alert('Lỗi: ' + error.message);
            console.error(error);
        }
    }

    /** Hiển thị preview dữ liệu */
    _showDataPreview() {
        this.elementCount.textContent = this.originalData.length;

        // Hiển thị các số
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

        // Khởi tạo visualizer
        this.visualizer = new SortVisualizer(this.vizContainer);
        this.visualizer.setSpeed(parseInt(this.speedSlider.value));
    }

    /** Bắt đầu sắp xếp */
    async _startSort() {
        if (this.isRunning || !this.originalData) return;

        this.isRunning = true;
        this.sortBtn.disabled = true;
        this.steps = [];
        this.currentStep = 0;
        const startTime = performance.now();

        this._showElement(this.progressSection);
        this._showElement(this.visualizationSection);

        // Khởi tạo visualization ban đầu
        this.visualizer.init(Array.from(this.originalData));

        try {
            // Chạy sort và ghi lại các bước
            this.sortedData = await this.sorter.sort(this.originalData, {
                runSize: DEFAULT_RUN_SIZE,
                recordSteps: true,
                onProgress: (progress, msg) => this._updateProgress(progress, msg),
                onVisualization: async (step) => {
                    this.steps.push({ ...step });
                    await this.visualizer.update(step);
                    // Delay để animation mượt
                    await this._delay(this.visualizer.animationSpeed);
                }
            });

            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            // Hiển thị kết quả
            this._hideElement(this.progressSection);
            this._showElement(this.resultSection);
            this.resultStats.textContent = `Đã sắp xếp ${this.sortedData.length} phần tử trong ${duration} giây`;

            // Cho phép replay
            this.currentStep = this.steps.length - 1;
            this._updateStepControls();

        } catch (error) {
            alert('Lỗi khi sắp xếp: ' + error.message);
            console.error(error);
        } finally {
            this.isRunning = false;
            this.sortBtn.disabled = false;
        }
    }

    /** Cập nhật progress bar */
    _updateProgress(progress, message) {
        this.progressFill.style.width = `${progress}%`;
        this.progressText.textContent = message;
    }

    /** Bước trước */
    async _prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            await this.visualizer.update(this.steps[this.currentStep]);
            this._updateStepControls();
        }
    }

    /** Bước sau */
    async _nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            await this.visualizer.update(this.steps[this.currentStep]);
            this._updateStepControls();
        }
    }

    /** Toggle play/pause */
    async _togglePlayPause() {
        if (this.isPlaying) {
            this.isPlaying = false;
            this.playPauseBtn.innerHTML = '▶ Chạy';
        } else {
            this.isPlaying = true;
            this.playPauseBtn.innerHTML = '⏸ Dừng';

            // Auto play từ đầu nếu đang ở cuối
            if (this.currentStep >= this.steps.length - 1) {
                this.currentStep = 0;
            }

            // Play animation
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

    /** Cập nhật trạng thái các nút bước */
    _updateStepControls() {
        this.prevStepBtn.disabled = this.currentStep <= 0;
        this.nextStepBtn.disabled = this.currentStep >= this.steps.length - 1;
    }

    /** Tải file kết quả */
    _downloadResult() {
        if (!this.sortedData) return;

        const outputName = `${this.originalFileName}_sorted.bin`;
        const blob = createBinaryFile(this.sortedData);
        downloadFile(blob, outputName);
    }

    /** Reset ứng dụng */
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

        if (this.visualizer) {
            this.visualizer.clear();
        }

        this.progressFill.style.width = '0%';
        this.sortBtn.disabled = false;
        this.playPauseBtn.innerHTML = '▶ Chạy';
    }

    _showElement(el) { el.classList.remove('hidden'); el.classList.add('fade-in'); }
    _hideElement(el) { el.classList.add('hidden'); }
    _delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}

// Khởi tạo ứng dụng khi DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BinaryFileSorterApp();
});
