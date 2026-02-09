/**
 * @fileoverview Module thuật toán External Merge Sort
 * @author DSA++ Team
 * @version 1.0.0
 */

/**
 * Lớp triển khai thuật toán External Merge Sort
 * @class
 */
export class ExternalMergeSort {
    constructor() {
        this.isPaused = false;
        this.isCancelled = false;
        this.visualizationSteps = [];
    }

    /**
     * Sắp xếp mảng sử dụng External Merge Sort
     * @param {Float64Array|number[]} data - Mảng cần sắp xếp
     * @param {Object} [options={}] - Tùy chọn
     * @returns {Promise<Float64Array>} Mảng đã sắp xếp
     */
    async sort(data, options = {}) {
        const {
            runSize = 10,
            onProgress = () => { },
            onVisualization = () => { },
            recordSteps = false
        } = options;

        this.isPaused = false;
        this.isCancelled = false;
        this.visualizationSteps = [];

        const arr = Array.from(data);
        const n = arr.length;

        if (n <= 1) return new Float64Array(arr);

        onProgress(0, 'Bắt đầu sắp xếp...');

        // Phase 1: Tạo các runs
        onProgress(10, 'Chia dữ liệu thành các runs...');
        let runs = this._createRuns(arr, runSize);

        if (recordSteps) {
            this._recordStep({ type: 'split', runs: runs.map(r => [...r]) });
        }
        await onVisualization({ type: 'split', runs: runs.map(r => [...r]) });

        // Phase 2: Sắp xếp từng run
        onProgress(30, 'Sắp xếp từng run...');
        for (let i = 0; i < runs.length; i++) {
            if (this.isCancelled) break;
            runs[i] = this._sortRun(runs[i]);
            onProgress(30 + (i / runs.length) * 20, `Sắp xếp run ${i + 1}/${runs.length}...`);
            if (recordSteps) {
                this._recordStep({ type: 'sort', runs: runs.map(r => [...r]), activeRun: i });
            }
            await onVisualization({ type: 'sort', runs: runs.map(r => [...r]), activeRun: i });
        }

        // Phase 3: Merge các runs
        onProgress(50, 'Trộn các runs...');
        let mergePass = 0;

        while (runs.length > 1 && !this.isCancelled) {
            const newRuns = [];
            mergePass++;

            for (let i = 0; i < runs.length; i += 2) {
                if (this.isCancelled) break;

                if (i + 1 < runs.length) {
                    const merged = await this._mergeWithVisualization(
                        runs[i], runs[i + 1], onVisualization, recordSteps
                    );
                    newRuns.push(merged);
                } else {
                    newRuns.push(runs[i]);
                }
                onProgress(50 + (mergePass / Math.ceil(Math.log2(runs.length + 1))) * 40,
                    `Lượt trộn ${mergePass}...`);
            }
            runs = newRuns;
        }

        onProgress(100, 'Hoàn tất!');
        await onVisualization({ type: 'complete', runs });
        return new Float64Array(runs[0] || []);
    }

    _createRuns(arr, runSize) {
        const runs = [];
        for (let i = 0; i < arr.length; i += runSize) {
            runs.push(arr.slice(i, i + runSize));
        }
        return runs;
    }

    _sortRun(run) {
        return [...run].sort((a, b) => a - b);
    }

    async _mergeWithVisualization(left, right, onVisualization, recordSteps) {
        const result = [];
        let i = 0, j = 0;

        while (i < left.length && j < right.length) {
            if (this.isCancelled) break;
            while (this.isPaused && !this.isCancelled) {
                await this._delay(100);
            }
            if (left[i] <= right[j]) { result.push(left[i]); i++; }
            else { result.push(right[j]); j++; }

            if (recordSteps) {
                this._recordStep({ type: 'merge_step', left: [...left], right: [...right], result: [...result] });
            }
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
    getVisualizationSteps() { return [...this.visualizationSteps]; }
}

/**
 * Sắp xếp nhanh không visualization
 * @param {Float64Array|number[]} data - Dữ liệu cần sắp xếp
 * @returns {Promise<Float64Array>} Mảng đã sắp xếp
 */
export async function quickSort(data, onProgress = () => { }) {
    onProgress(0, 'Bắt đầu...');
    const arr = Array.from(data);
    arr.sort((a, b) => a - b);
    onProgress(100, 'Hoàn tất!');
    return new Float64Array(arr);
}
