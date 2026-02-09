/**
 * @fileoverview Module visualization cho quá trình sắp xếp
 * @author DSA++ Team
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
        this.container = container;
        this.bars = [];
        this.animationSpeed = 300;
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
     * @param {number} speed - Giá trị 1-10
     */
    setSpeed(speed) {
        this.animationSpeed = 600 - (speed * 50);
    }

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
