// js/managers/TaskManager.js
import { ChallengeManager } from './ChallengeManager.js';

export const TaskManager = {
    dailyTasks: [],
    lastUpdateDate: null,

    /**
     * Initialize tasks for the day
     */
    init() {
        const today = new Date().toDateString();

        // Load from localStorage if available
        const saved = localStorage.getItem('daily_tasks');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.date === today) {
                this.dailyTasks = parsed.tasks;
                this.lastUpdateDate = parsed.date;
                return;
            }
        }

        // Generate new tasks for the day
        this.generateDailyTasks();
    },

    /**
     * Generate 3 random challenges as daily tasks
     */
    generateDailyTasks() {
        const today = new Date().toDateString();
        const allChallenges = ChallengeManager.getAllChallenges();

        // Use date as seed for randomness to ensure same tasks for everyone/all day
        const seed = this.hashString(today);
        let tasks = [];
        let available = [...allChallenges];

        // Pick 3 random challenges
        for (let i = 0; i < 3 && available.length > 0; i++) {
            const index = (seed + i) % available.length;
            const challenge = available.splice(index, 1)[0];
            tasks.push({
                ...challenge,
                completed: false
            });
        }

        this.dailyTasks = tasks;
        this.lastUpdateDate = today;
        this.save();
    },

    /**
     * Simple string hash function
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    },

    /**
     * Save tasks to localStorage
     */
    save() {
        localStorage.setItem('daily_tasks', JSON.stringify({
            date: this.lastUpdateDate,
            tasks: this.dailyTasks
        }));
    },

    /**
     * Check if a challenge was completed and mark it in daily tasks
     */
    checkCompletion(completedChallengeIds) {
        let changed = false;
        this.dailyTasks.forEach(task => {
            if (!task.completed && completedChallengeIds.includes(task.id)) {
                task.completed = true;
                changed = true;
            }
        });

        if (changed) {
            this.save();
        }
    },

    getTasks() {
        return this.dailyTasks;
    }
};
