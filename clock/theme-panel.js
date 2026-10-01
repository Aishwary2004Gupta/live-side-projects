import { Pane } from 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/+esm';

const themes = {
    'Clean paper': {
        ink: '#272820',
        dial: 'none',
        hand: 'none',
        pageBg: '#ffffff',
        clockBg: '#ffffff'
    },
    'Reference gold': {
        ink: '#d4a82e',
        dial: 'none',
        hand: 'brightness(0) saturate(100%) invert(77%) sepia(80%) saturate(680%) hue-rotate(359deg) brightness(102%) contrast(101%)',
        pageBg: '#ffffff',
        clockBg: '#ffffff'
    },
    'Arctic blue': {
        ink: '#168bd2',
        dial: 'none',
        hand: 'brightness(0) saturate(100%) invert(36%) sepia(98%) saturate(1650%) hue-rotate(183deg) brightness(99%) contrast(103%)',
        pageBg: '#ffffff',
        clockBg: '#ffffff'
    },
    'Signal red': {
        ink: '#dc352f',
        dial: 'none',
        hand: 'brightness(0) saturate(100%) invert(24%) sepia(97%) saturate(4550%) hue-rotate(347deg) brightness(99%) contrast(105%)',
        pageBg: '#ffffff',
        clockBg: '#ffffff'
    },
    'Time': {
        ink: '#dfeaf7',
        dial: 'brightness(0) saturate(100%) invert(85%) sepia(17%) saturate(415%) hue-rotate(182deg) brightness(106%) contrast(92%)',
        hand: 'brightness(0) saturate(100%) invert(20%) sepia(44%) saturate(907%) hue-rotate(196deg) brightness(100%) contrast(108%)',
        pageBg: '#0d1d2f',
        clockBg: '#0d1d2f'
    }
};

const settings = { theme: 'Clean paper' };
const root = document.documentElement;
const pane = new Pane({ container: document.querySelector('#theme-panel'), title: 'Clock themes' });

function applyTheme(name) {
    const theme = themes[name];
    root.style.setProperty('--ink', theme.ink);
    root.style.setProperty('--dial-filter', theme.dial);
    root.style.setProperty('--hand-filter', theme.hand);
    root.style.setProperty('--page-bg', theme.pageBg);
    root.style.setProperty('--clock-bg', theme.clockBg);
}

pane.addBinding(settings, 'theme', { options: Object.fromEntries(Object.keys(themes).map((name) => [name, name])) })
    .on('change', ({ value }) => applyTheme(value));

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

applyTheme(settings.theme);
fitClock();
updateAccessibleTime();
const clockArea = document.querySelector('.clock');
if (clockArea) new ResizeObserver(fitClock).observe(clockArea);