import { QUIT_DATE, translations } from './benefits.js';
import { getFingerprint } from './fingerprint.js';

// Track visit
async function trackVisit() {
    try {
        const fingerprint = await getFingerprint();
        await fetch('/.netlify/functions/track-visit', {
            method: 'POST',
            body: JSON.stringify({ fingerprint }),
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.error('Tracking failed', e);
    }
}

trackVisit();

let currentLang = localStorage.getItem('language') || 'de';

function getT() {
    return translations[currentLang];
}

function formatTimeRemaining(ms) {
    const t = getT();
    if (ms <= 0) return t.congratulations;

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const d = days;
    const h = hours % 24;
    const m = minutes % 60;

    let result = `${t.reachedIn}: `;
    if (d > 0) result += `${d} ${t.units.days} `;
    if (h > 0 || d > 0) result += `${h} ${t.units.hours} `;
    result += `${m} ${t.units.minutes}`;

    return result;
}

function renderBenefits() {
    const t = getT();
    const container = document.getElementById('benefits-container');
    const now = new Date();
    const elapsedMs = now - QUIT_DATE;

    container.innerHTML = t.benefits.map((benefit, index) => {
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
        t.benefits.forEach((_, index) => {
            const bar = document.getElementById(`bar-${index}`);
            if (bar) {
                const target = bar.getAttribute('data-target');
                bar.style.width = `${target}%`;
            }
        });
    }, 100);
}

function updateUI() {
    const t = getT();
    document.title = t.title;
    document.querySelector('h1').textContent = t.title;

    // Format quit date display
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const locale = currentLang === 'de' ? 'de-DE' : 'en-US';
    document.getElementById('quit-date-display').textContent = `${t.quitDate}: ${QUIT_DATE.toLocaleDateString(locale, options)}`;

    renderBenefits();

    // Update active class on selector
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('language', lang);
    updateUI();
}

document.addEventListener('DOMContentLoaded', () => {
    // Add click listeners to language buttons (they will be added to HTML soon)
    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('lang-btn')) {
            setLanguage(e.target.dataset.lang);
        }
    });

    updateUI();
});
