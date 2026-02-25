/**
 * @fileoverview Module visualization cho quá trình sắp xếp
 * @description Quản lý hiển thị animation các bước split, sort, merge, complete
 * @author Bùi Ngọc Thiên Thanh
 * @version 1.0.0
 */

/**
 * Lớp quản lý visualization
 * @class
 */
export class SortVisualizer {
    /**
     * @param {HTMLElement} container - Container chứa visualization
     */
    constructor(container) {
        /** @type {HTMLElement} Container chính */
        this.container = container;
        /** @type {HTMLElement[]} Danh sách các thanh (bar) */
        this.bars = [];
        /** @type {number} Tốc độ animation (ms) */
        this.animationSpeed = 300;
        /** @type {number} Giá trị lớn nhất để tính tỉ lệ chiều cao */
        this.maxValue = 0;
    }

    /**
     * Khởi tạo visualization với dữ liệu
     * @param {number[]} data - Dữ liệu cần hiển thị
     */
    init(data) {
        this.container.innerHTML = '';
        this.bars = [];
        this.maxValue = Math.max(...data.map(Math.abs));

        const barWidth = Math.max(10, Math.min(40, (this.container.clientWidth - 20) / data.length - 2));

        data.forEach((value, index) => {
            const bar = document.createElement('div');
            bar.className = 'viz-bar';
            bar.style.width = `${barWidth}px`;
            bar.style.height = `${this._getBarHeight(value)}px`;

            const valueLabel = document.createElement('span');
            valueLabel.className = 'viz-bar-value';
            valueLabel.textContent = value.toFixed(2);
            bar.appendChild(valueLabel);

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
        const containerHeight = 180;
        const minHeight = 10;
        if (this.maxValue === 0) return minHeight;
        return minHeight + (Math.abs(value) / this.maxValue) * (containerHeight - minHeight);
    }

    /**
     * Cập nhật visualization theo bước
     * @param {Object} step - Thông tin bước
     */
    async update(step) {
        switch (step.type) {
            case 'split':
                await this._showSplit(step.runs);
                break;
            case 'sort':
                await this._showSort(step.runs, step.activeRun);
                break;
            case 'merge':
                await this._showMerge(step);
                break;
            case 'complete':
                await this._showComplete(step.runs[0]);
                break;
        }
    }

    /**
     * Hiển thị bước chia dữ liệu thành các run
     * @param {number[][]} runs - Các run đã chia
     * @private
     */
    async _showSplit(runs) {
        // Rebuild bars từ runs
        this.container.innerHTML = '';
        this.bars = [];

        const allData = runs.flat();
        this.init(allData);

        // Colorize theo runs
        let idx = 0;
        const colors = ['#a78bfa', '#818cf8', '#c4b5fd', '#8b5cf6'];
        runs.forEach((run, runIdx) => {
            run.forEach(() => {
                if (this.bars[idx]) {
                    this.bars[idx].style.background = colors[runIdx % colors.length];
                }
                idx++;
            });
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
        // Rebuild và highlight active run
        this.container.innerHTML = '';
        this.bars = [];

        const allData = runs.flat();
        this.init(allData);

        let idx = 0;
        runs.forEach((run, runIdx) => {
            run.forEach(() => {
                if (this.bars[idx]) {
                    if (runIdx === activeRun) {
                        this.bars[idx].classList.add('sorted');
                    }
                }
                idx++;
            });
        });

        await this._delay(this.animationSpeed);
    }

    /**
     * Hiển thị bước merge hai run
     * @param {Object} step - Thông tin merge (left, right, leftIndex, rightIndex)
     * @private
     */
    async _showMerge(step) {
        // Highlight đang merge
        this.container.innerHTML = '';
        this.bars = [];

        const combined = [...step.left, ...step.right];
        this.init(combined);

        // Highlight comparing positions
        if (step.leftIndex !== undefined && step.leftIndex < step.left.length) {
            if (this.bars[step.leftIndex]) {
                this.bars[step.leftIndex].classList.add('comparing');
            }
        }
        if (step.rightIndex !== undefined) {
            const rightBarIdx = step.left.length + step.rightIndex;
            if (this.bars[rightBarIdx]) {
                this.bars[rightBarIdx].classList.add('merging');
            }
        }

        await this._delay(this.animationSpeed / 2);
    }

    /**
     * Hiển thị kết quả sắp xếp hoàn tất với animation
     * @param {number[]} sortedData - Mảng đã sắp xếp
     * @private
     */
    async _showComplete(sortedData) {
        this.container.innerHTML = '';
        this.bars = [];
        this.init(sortedData);

        // Animate sorted
        for (let i = 0; i < this.bars.length; i++) {
            this.bars[i].classList.add('sorted');
            await this._delay(20);
        }
    }

    /**
     * Đặt tốc độ animation
     * @param {number} speed - Giá trị 1-10 (cao = nhanh hơn)
     */
    setSpeed(speed) {
        this.animationSpeed = 600 - (speed * 50);
    }

    /** @private */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Xóa visualization
     */
    clear() {
        this.container.innerHTML = '';
        this.bars = [];
    }
}
