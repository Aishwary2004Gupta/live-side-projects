const root = document.documentElement;

function applyTheme() {
    root.style.setProperty('--ink', '#dfeaf7');
    root.style.setProperty('--dial-filter', 'brightness(0) saturate(100%) invert(85%) sepia(17%) saturate(415%) hue-rotate(182deg) brightness(106%) contrast(92%)');
    root.style.setProperty('--hand-filter', 'brightness(0) saturate(100%) invert(20%) sepia(44%) saturate(907%) hue-rotate(196deg) brightness(100%) contrast(108%)');
    root.style.setProperty('--page-bg', '#0d1d2f');
    root.style.setProperty('--clock-bg', '#0d1d2f');
}

function fitClock() {
    const clockArea = document.querySelector('.clock');
    const clock = clockArea?.querySelector(':scope > div');
    if (!clock || !clockArea) return;

    const scale = Math.min(
        1,
        (clockArea.clientWidth - 24) / clock.offsetWidth,
        (clockArea.clientHeight - 24) / clock.offsetHeight
    );
    root.style.setProperty('--clock-scale', Math.max(0, scale));
}

function updateAccessibleTime() {
    const time = document.querySelector('#clock-time');
    if (!time) return;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    time.dateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${hours}:${minutes}`;
    time.textContent = `${hours}:${minutes}`;

    window.setTimeout(updateAccessibleTime, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()));
}

applyTheme();
fitClock();
updateAccessibleTime();
const clockArea = document.querySelector('.clock');
if (clockArea) new ResizeObserver(fitClock).observe(clockArea);