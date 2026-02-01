// js/ui/TaskUI.js
import { TaskManager } from '../managers/TaskManager.js';

export const TaskUI = {
    overlay: null,

    init() {
        this.createOverlay();
    },

    createOverlay() {
        if (document.getElementById('task-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'task-overlay';
        overlay.className = 'sub-menu hidden';
        overlay.innerHTML = `
            <div class="task-window cyberpunk-panel">
                <div class="window-header">
                    <span class="header-glitch" data-text="DAILY_OBJECTIVES">DAILY_OBJECTIVES</span>
                    <button id="close-tasks" class="close-btn">×</button>
                </div>
                <div class="task-subheader">
                    <span class="sub-label">PRIORITY_UPLINK</span>
                    <span class="sub-tag">UPLINK_DATA_STREAM_//_SECURED</span>
                </div>
                <div class="task-content">
                    <div id="task-list" class="task-list">
                        <!-- Tasks go here -->
                    </div>
                </div>
                <div class="task-footer">
                    * ALL REWARDS ARE AUTO-CREDITED UPON MISSION COMPLETION
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        this.overlay = overlay;

        document.getElementById('close-tasks').onclick = () => this.hide();

        // Close on ESC
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.overlay.classList.contains('hidden')) {
                this.hide();
            }
        });
    },

    show() {
        this.renderTasks();
        this.overlay.classList.remove('hidden');
    },

    hide() {
        this.overlay.classList.add('hidden');
    },

    renderTasks() {
        const list = document.getElementById('task-list');
        const tasks = TaskManager.getTasks();

        list.innerHTML = tasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''}">
                <div class="task-icon">${task.icon}</div>
                <div class="task-info">
                    <div class="task-name">${task.name}</div>
                    <div class="task-desc">${task.description}</div>
                </div>
                <div class="task-status">
                    ${task.completed ? '<span class="status-done">[[ SECURED ]]</span>' : '<span class="status-pending">[[ OPERATIONAL ]]</span>'}
                </div>
            </div>
        `).join('');
    },

    toggle() {
        if (this.overlay.classList.contains('hidden')) {
            this.show();
        } else {
            this.hide();
        }
    }
};
