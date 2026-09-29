import { Pane } from 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/+esm';

const themes = {
    'Reference gold': {
        scene: '#302b1d',
        ink: '#f1dca0',
        dial: 'brightness(.13) sepia(.35) saturate(.7)',
        hand: 'invert(1) sepia(1) saturate(4) hue-rotate(350deg) brightness(1.25)'
    },
    'Clean paper': {
        scene: '#f4f1e8',
        ink: '#272820',
        dial: 'none',
        hand: 'none'
    },
    'Arctic blue': {
        scene: '#14252d',
        ink: '#c7e9ed',
        dial: 'brightness(.14) sepia(.2) saturate(.7)',
        hand: 'invert(1) sepia(.55) saturate(2.8) hue-rotate(145deg) brightness(1.3)'
    },
    'Signal red': {
        scene: '#2a1c1b',
        ink: '#f3b7a3',
        dial: 'brightness(.13) sepia(.35) saturate(.8)',
        hand: 'invert(1) sepia(1) saturate(4) hue-rotate(315deg) brightness(1.2)'
    }
};

const settings = { theme: 'Reference gold' };
const root = document.documentElement;
const pane = new Pane({ container: document.querySelector('#theme-panel'), title: 'Clock themes' });

function applyTheme(name) {
    const theme = themes[name];
    root.style.setProperty('--scene', theme.scene);
    root.style.setProperty('--ink', theme.ink);
    root.style.setProperty('--dial-filter', theme.dial);
    root.style.setProperty('--hand-filter', theme.hand);
}

pane.addBinding(settings, 'theme', { options: Object.fromEntries(Object.keys(themes).map((name) => [name, name])) })
    .on('change', ({ value }) => applyTheme(value));

function fitClock() {
    const clock = document.querySelector('.clock > div');
    if (!clock) return;

    const scale = Math.min(
        1,
        (window.innerWidth - 32) / clock.offsetWidth,
        (window.innerHeight - 100) / clock.offsetHeight
    );
    root.style.setProperty('--clock-scale', Math.max(0, scale));
}

applyTheme(settings.theme);
fitClock();
window.addEventListener('resize', fitClock);