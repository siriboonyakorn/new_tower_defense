// js/managers/NotificationManager.js

export class NotificationManager {
    constructor() {
        this.container = document.getElementById('notification-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            document.body.appendChild(this.container);
        }
    }

    /**
     * Show a global notification
     * @param {string} message - Message to display
     * @param {string} type - 'info', 'warning', 'danger', 'success'
     * @param {number} duration - Duration in ms (default 3000)
     */
    notify(message, type = 'info', duration = 3000) {
        const notif = document.createElement('div');
        notif.className = `notif-item notif-${type}`;
        notif.textContent = message;

        this.container.appendChild(notif);

        // Auto-remove after duration
        setTimeout(() => {
            notif.classList.add('hide');
            setTimeout(() => {
                notif.remove();
            }, 500); // Wait for transition
        }, duration);

        console.log(`[Notification] ${type.toUpperCase()}: ${message}`);
    }
}

// Singleton instance
export const notifier = new NotificationManager();
