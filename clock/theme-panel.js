import { Pane } from 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/+esm';

const themes = {
    'Clean paper': {
        ink: '#272820',
        dial: 'none',
        hand: 'none'
    },
    'Reference gold': {
        ink: '#d4a82e',
        dial: 'none',
        hand: 'brightness(0) saturate(100%) invert(77%) sepia(80%) saturate(680%) hue-rotate(359deg) brightness(102%) contrast(101%)'
    },
    'Arctic blue': {
        ink: '#168bd2',
        dial: 'none',
        hand: 'brightness(0) saturate(100%) invert(36%) sepia(98%) saturate(1650%) hue-rotate(183deg) brightness(99%) contrast(103%)'
    },
    'Signal red': {
        ink: '#dc352f',
        dial: 'none',
        hand: 'brightness(0) saturate(100%) invert(24%) sepia(97%) saturate(4550%) hue-rotate(347deg) brightness(99%) contrast(105%)'
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
}

pane.addBinding(settings, 'theme', { options: Object.fromEntries(Object.keys(themes).map((name) => [name, name])) })
    .on('change', ({ value }) => applyTheme(value));

function fitClock() {
    const clockArea = document.querySelector('.clock');
    const clock = clockArea?.firstElementChild;
    if (!clock || !clockArea) return;

    const scale = Math.min(
        1,
        (clockArea.clientWidth - 24) / clock.offsetWidth,
        (clockArea.clientHeight - 24) / clock.offsetHeight
    );
    root.style.setProperty('--clock-scale', Math.max(0, scale));
}

applyTheme(settings.theme);
fitClock();
const clockArea = document.querySelector('.clock');
if (clockArea) new ResizeObserver(fitClock).observe(clockArea);