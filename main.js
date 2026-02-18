import { QUIT_DATE, healthBenefits } from './benefits.js';

function formatTimeRemaining(ms) {
    if (ms <= 0) return 'Congratulations - you did it!';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const d = days;
    const h = hours % 24;
    const m = minutes % 60;

    let result = 'Reached in: ';
    if (d > 0) result += `${d} days `;
    if (h > 0 || d > 0) result += `${h} hours `;
    result += `${m} minutes`;

    return result;
}

function renderBenefits() {
    const container = document.getElementById('benefits-container');
    const now = new Date();
    const elapsedMs = now - QUIT_DATE;

    container.innerHTML = healthBenefits.map((benefit, index) => {
        const remainingMs = benefit.duration - elapsedMs;
        const progress = Math.min(100, Math.max(0, (elapsedMs / benefit.duration) * 100));
        const isComplete = progress >= 100;

        return `
            <div class="benefit-card">
                <div class="benefit-title">
                    ${benefit.title}
                    <span class="benefit-duration">(${benefit.displayDuration})</span>
                </div>
                <p class="benefit-description">${benefit.description}</p>
                <div class="progress-container">
                    <div class="progress-bar ${isComplete ? 'complete' : ''}" 
                         id="bar-${index}" 
                         data-target="${progress}"></div>
                </div>
                <div class="status-text">
                    <span class="${isComplete ? 'status-done' : ''}">
                        ${formatTimeRemaining(remainingMs)}
                    </span>
                </div>
            </div>
        `;
    }).join('');

    // Trigger animations after a small delay
    setTimeout(() => {
        healthBenefits.forEach((_, index) => {
            const bar = document.getElementById(`bar-${index}`);
            if (bar) {
                const target = bar.getAttribute('data-target');
                bar.style.width = `${target}%`;
            }
        });
    }, 100);
}

document.addEventListener('DOMContentLoaded', () => {
    // Format quit date display
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    document.getElementById('quit-date-display').textContent = `Quit Date: ${QUIT_DATE.toLocaleDateString(undefined, options)}`;

    renderBenefits();
});
