/**
 * @fileoverview External Sort Visualizer - Dashboard App
 * @description Ứng dụng sắp xếp ngoại với giao diện dashboard 3 cột
 * @version 3.0.0
 */

// ==================== FILE HANDLER ====================

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

function createBinaryFile(data) {
    const f = data instanceof Float64Array ? data : new Float64Array(data);
    return new Blob([f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength)], { type: 'application/octet-stream' });
}

function downloadFile(blob, filename = 'sorted_output.bin') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const u = ['Bytes', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + u[i];
}

function generateTestData(count, min = 0, max = 100) {
    const data = new Float64Array(count);
    for (let i = 0; i < count; i++) data[i] = min + Math.random() * (max - min);
    return data;
}

// ==================== SORTER ====================

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

    _createRuns(arr, size) {
        const runs = [];
        for (let i = 0; i < arr.length; i += size) runs.push(arr.slice(i, i + size));
        return runs;
    }

    _sortRun(run) { return [...run].sort((a, b) => a - b); }

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

    _delay(ms) { return new Promise(r => setTimeout(r, ms)); }
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
        this.animationSpeed = 150;
        this.maxValue = 0;
    }

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

    _getBarHeight(value) {
        const h = 220, min = 10;
        if (this.maxValue === 0) return min;
        return min + (Math.abs(value) / this.maxValue) * (h - min);
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
        this.container.innerHTML = ''; this.bars = [];
        this.init(runs.flat());
        let idx = 0;
        const colors = ['#8fbcad', '#e8a87c', '#7ec8c8', '#c5a3d9', '#a0c4a0', '#e8c170'];
        runs.forEach((run, ri) => {
            run.forEach(() => { if (this.bars[idx]) this.bars[idx].style.background = colors[ri % colors.length]; idx++; });
        });
        await this._delay(this.animationSpeed);
    }

    async _showSort(runs, activeRun) {
        this.container.innerHTML = ''; this.bars = [];
        this.init(runs.flat());
        let idx = 0;
        runs.forEach((run, ri) => {
            run.forEach(() => { if (this.bars[idx] && ri === activeRun) this.bars[idx].classList.add('sorted'); idx++; });
        });
        await this._delay(this.animationSpeed);
    }

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

    async _showComplete(data) {
        this.container.innerHTML = ''; this.bars = [];
        this.init(data);
        for (let i = 0; i < this.bars.length; i++) { this.bars[i].classList.add('sorted'); await this._delay(15); }
    }

    setSpeed(ms) { this.animationSpeed = ms; }
    _delay(ms) { return new Promise(r => setTimeout(r, ms)); }
    clear() { this.container.innerHTML = ''; this.bars = []; }
}

// ==================== MAIN APP ====================

class App {
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
        this.comparisonCount = 0;
        this.numRuns = 0;
        this.ramLimit = 5;
        this.kWay = 2;
        this.startTime = 0;

        this._initDOM();
        this._bindEvents();
        this._loadTheme();
        this._loadHistory();
        this._restoreSession();
        console.log('✅ External Sort Visualizer initialized');
    }

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

        // Result card (left sidebar)
        this.resultCard = document.getElementById('resultCard');
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

        // Footer
        this.sessionDot = document.getElementById('sessionDot');
        this.sessionStatus = document.getElementById('sessionStatus');
    }

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
        this.downloadBtn.addEventListener('click', () => this._downloadBin());
        this.downloadTxtBtn.addEventListener('click', () => this._downloadTxt());
        this.rDownloadBtn.addEventListener('click', () => this._downloadBin());
        this.rDownloadTxtBtn.addEventListener('click', () => this._downloadTxt());
        this.rNewSortBtn.addEventListener('click', () => this._reset());

        // Theme
        this.themeToggle.addEventListener('click', () => this._toggleTheme());

        // New session
        this.newSessionBtn.addEventListener('click', () => this._reset());
    }

    // ===== NAVIGATION =====
    _switchStep(step) {
        this.stepNavBtns.forEach(b => b.classList.toggle('active', b.dataset.step === step));
        Object.keys(this.panels).forEach(k => this.panels[k].classList.toggle('active', k === step));
    }

    _switchInputTab(tab) {
        this.inputTabBtns.forEach(b => b.classList.toggle('active', b.dataset.inputTab === tab));
        Object.keys(this.inputTabs).forEach(k => this.inputTabs[k].classList.toggle('active', k === tab));
    }

    // ===== DATA INPUT =====
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

    _parseManual() {
        const text = this.manualInput.value.trim();
        if (!text) { alert('Vui lòng nhập dữ liệu'); return; }
        const nums = text.split(/[\s,]+/).map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        if (nums.length < 2) { alert('Cần ít nhất 2 số hợp lệ'); return; }
        this.originalData = new Float64Array(nums);
        this.originalFileName = 'manual_data';
        this._onDataLoaded();
    }

    async _processFile(file) {
        try {
            this.originalFileName = file.name.replace(/\.[^.]+$/, '');
            this.originalData = await readBinaryFile(file);
            this._onDataLoaded(file.size);
        } catch (err) { alert('Lỗi: ' + err.message); }
    }

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
        this.statMemory.textContent = formatFileSize(bytes);

        // Enable sort
        this.sortBtn.disabled = false;
        this._updateEstimation();

        // Init visualizer
        this.visualizer = new SortVisualizer(this.vizContainer);
        this.visualizer.setSpeed(parseInt(this.speedSlider.value));

        // Save session
        this._saveSession();
    }

    _updateEstimation() {
        if (!this.originalData) return;
        const n = this.originalData.length, m = this.ramLimit, k = this.kWay;
        const numRuns = Math.ceil(n / m);
        const numPass = numRuns <= 1 ? 0 : Math.ceil(Math.log(numRuns) / Math.log(k));
        this.estRuns.textContent = numRuns;
        this.estPass.textContent = numPass;
    }

    // ===== SORTING =====
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
                    if (step.type === 'split') this.numRuns = step.runs.length;
                    if (step.type === 'merge') this.comparisonCount++;
                    this._updateLiveStats();
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

    _updateLiveStats() {
        this.statSteps.textContent = this.steps.length.toLocaleString();
        this.statComparisons.textContent = this.comparisonCount.toLocaleString();
        const ioMb = ((this.steps.length * 8 * (this.originalData?.length || 0)) / (1024 * 1024)).toFixed(1);
        this.statDiskIO.textContent = `${ioMb} MB/s`;
    }

    _setStatus(text, processing) {
        this.statusText.textContent = text;
        this.statusDot.classList.toggle('processing', processing);
    }

    // ===== PLAYBACK =====
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

    async _nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            await this.visualizer.update(this.steps[this.currentStep]);
            this._updateStepInfo();
        }
    }

    _resetViz() {
        this.isPlaying = false;
        this.currentStep = 0;
        this.playPauseBtn.textContent = '▶';
        if (this.steps.length > 0) {
            this.visualizer.update(this.steps[0]);
            this._updateStepInfo();
        }
    }

    _updateStepInfo() {
        if (this.steps.length === 0) return;
        const step = this.steps[this.currentStep];
        this.stepBadge.textContent = `Bước ${this.currentStep + 1}/${this.steps.length}`;

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
    _showResults() {
        if (!this.sortedData) return;
        const data = Array.from(this.sortedData);
        const minVal = Math.min(...data);
        const maxVal = Math.max(...data);

        // Left sidebar result card
        this.resultCard.style.display = 'block';

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
    _downloadBin() {
        if (!this.sortedData) return;
        downloadFile(createBinaryFile(this.sortedData), `${this.originalFileName}_sorted.bin`);
    }

    _downloadTxt() {
        if (!this.sortedData) return;
        const text = Array.from(this.sortedData).map(n => n.toFixed(6)).join('\n');
        downloadFile(new Blob([text], { type: 'text/plain' }), `${this.originalFileName}_sorted.txt`);
    }

    // ===== THEME =====
    _toggleTheme() {
        const html = document.documentElement;
        const current = html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        this.themeToggle.querySelector('.theme-icon').textContent = next === 'dark' ? '☀️' : '🌙';
        localStorage.setItem('esv-theme', next);
    }

    _loadTheme() {
        const saved = localStorage.getItem('esv-theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
            this.themeToggle.querySelector('.theme-icon').textContent = saved === 'dark' ? '☀️' : '🌙';
        }
    }

    // ===== HISTORY =====
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

    _loadHistory() {
        const history = JSON.parse(localStorage.getItem('esv-history') || '[]');
        this._renderHistory(history);
    }

    _renderHistory(history) {
        if (history.length === 0) {
            this.historyList.innerHTML = '<p class="history-empty">Chưa có lịch sử sắp xếp</p>';
            this.viewAllHistoryBtn.style.display = 'none';
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
        this.viewAllHistoryBtn.style.display = history.length > 3 ? 'block' : 'none';
    }

    // ===== SESSION STORAGE =====
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
            if (this.sessionDot) this.sessionDot.classList.add('green');
            if (this.sessionStatus) this.sessionStatus.textContent = 'ĐÃ LƯU PHIÊN';
        } catch (e) { console.warn('Không thể lưu phiên:', e); }
    }

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
        this.resultCard.style.display = 'none';
        this.sortBtn.disabled = true;
        this.playPauseBtn.textContent = '▶';

        // Reset stats
        this.statSteps.textContent = '0';
        this.statComparisons.textContent = '0';
        this.statDiskIO.textContent = '0 MB/s';
        this.statMemory.textContent = '0 MB';
        this.statMin.textContent = '—';
        this.statMax.textContent = '—';
        this.estRuns.textContent = '—';
        this.estPass.textContent = '—';

        if (this.visualizer) this.visualizer.clear();
        this._setStatus('SẴN SÀNG', false);
        this._switchStep('config');

        sessionStorage.removeItem('esv-session');
    }

    _delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
