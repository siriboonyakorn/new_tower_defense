export const MathUtils = {
    getDistance: (x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    lerp: (start, end, t) => {
        return start * (1 - t) + end * t;
    }
};