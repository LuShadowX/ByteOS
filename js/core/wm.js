// Window manager: opens apps in draggable, resizable windows and tracks them as processes.

import { h, $, clamp, toast } from './ui.js';
import { bus } from './store.js';
import { APPS, appById } from '../apps/index.js';

const layer = () => $('#windows');
const windows = new Map();
let zTop = 10;
let nextPid = 1204;
let cascade = 0;

const isSmall = () => innerWidth < 760;

export const session = { user: 'lukshya' };

function focus(win) {
    for (const other of windows.values()) other.el.classList.toggle('is-focused', other === win);
    win.el.style.zIndex = ++zTop;
    win.el.hidden = false;
    win.minimized = false;
    renderTaskbar();
}

function renderTaskbar() {
    const bar = $('#taskbar-apps');
    if (!bar) return;
    const focused = [...windows.values()].sort((a, b) => b.el.style.zIndex - a.el.style.zIndex)[0];
    bar.replaceChildren(...[...windows.values()].map(win => h('button', {
        type: 'button',
        class: `taskbar__app${win === focused && !win.minimized ? ' is-active' : ''}${win.minimized ? ' is-min' : ''}`,
        title: win.app.title,
        style: { '--app': win.app.color },
        onClick: () => (win === focused && !win.minimized ? minimize(win) : focus(win))
    }, h('span', { class: 'taskbar__icon', html: win.app.icon }), h('span', { class: 'taskbar__label' }, win.app.title))));
    bus.emit('wm:change');
}

function minimize(win) {
    win.minimized = true;
    win.el.hidden = true;
    renderTaskbar();
}

function toggleMax(win) {
    win.el.classList.toggle('is-max');
    bus.emit('wm:resize', win.app.id);
}

export function close(id) {
    const win = windows.get(id);
    if (!win) return;
    win.cleanup?.();
    win.el.classList.add('is-closing');
    setTimeout(() => win.el.remove(), 160);
    windows.delete(id);
    renderTaskbar();
}

function makeDraggable(win, handle) {
    handle.addEventListener('pointerdown', e => {
        if (e.target.closest('button') || win.el.classList.contains('is-max') || isSmall()) return;
        const start = { x: e.clientX, y: e.clientY, left: win.el.offsetLeft, top: win.el.offsetTop };
        handle.setPointerCapture(e.pointerId);
        const move = ev => {
            win.el.style.left = `${clamp(start.left + ev.clientX - start.x, -win.el.offsetWidth + 120, innerWidth - 120)}px`;
            win.el.style.top = `${clamp(start.top + ev.clientY - start.y, 0, innerHeight - 90)}px`;
        };
        const up = () => {
            handle.removeEventListener('pointermove', move);
            handle.removeEventListener('pointerup', up);
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', up);
    });
    handle.addEventListener('dblclick', e => { if (!e.target.closest('button')) toggleMax(win); });
}

function makeResizable(win, grip) {
    grip.addEventListener('pointerdown', e => {
        e.preventDefault();
        const start = { x: e.clientX, y: e.clientY, w: win.el.offsetWidth, h: win.el.offsetHeight };
        grip.setPointerCapture(e.pointerId);
        const move = ev => {
            win.el.style.width = `${Math.max(380, start.w + ev.clientX - start.x)}px`;
            win.el.style.height = `${Math.max(260, start.h + ev.clientY - start.y)}px`;
        };
        const up = () => {
            grip.removeEventListener('pointermove', move);
            grip.removeEventListener('pointerup', up);
            bus.emit('wm:resize', win.app.id);
        };
        grip.addEventListener('pointermove', move);
        grip.addEventListener('pointerup', up);
    });
}

export async function open(id, args = {}) {
    const existing = windows.get(id);
    if (existing) {
        focus(existing);
        existing.onArgs?.(args);
        return existing;
    }
    const app = appById(id);
    if (!app) return toast(`No app called "${id}"`);

    const [width, height] = app.size;
    const offset = (cascade++ % 6) * 28;
    const body = h('div', { class: 'window__body' }, h('div', { class: 'window__loading' }, 'Loading…'));
    const title = h('header', { class: 'window__bar' },
        h('span', { class: 'window__icon', html: app.icon, style: { '--app': app.color } }),
        h('h2', { class: 'window__title' }, app.title),
        h('span', { class: 'window__group' }, app.group),
        h('div', { class: 'window__controls' },
            h('button', { type: 'button', class: 'wbtn wbtn--min', 'aria-label': `Minimize ${app.title}`, onClick: () => minimize(win) }),
            h('button', { type: 'button', class: 'wbtn wbtn--max', 'aria-label': `Maximize ${app.title}`, onClick: () => toggleMax(win) }),
            h('button', { type: 'button', class: 'wbtn wbtn--close', 'aria-label': `Close ${app.title}`, onClick: () => close(id) })));
    const grip = h('div', { class: 'window__grip', 'aria-hidden': 'true' });
    const el = h('section', {
        class: `window${isSmall() ? ' is-max' : ''}`,
        role: 'dialog',
        'aria-label': app.title,
        dataset: { app: id },
        style: {
            width: `${Math.min(width, innerWidth - 40)}px`,
            height: `${Math.min(height, innerHeight - 110)}px`,
            left: `${Math.max(12, (innerWidth - width) / 2 - 60 + offset)}px`,
            top: `${Math.max(12, (innerHeight - height) / 2 - 40 + offset)}px`,
            '--app': app.color
        }
    }, title, body, grip);

    const win = { app, el, pid: nextPid++, started: Date.now(), minimized: false };
    windows.set(id, win);
    el.addEventListener('pointerdown', () => focus(win));
    makeDraggable(win, title);
    makeResizable(win, grip);
    layer().append(el);
    focus(win);

    try {
        const module = await app.load();
        body.replaceChildren();
        const result = await module.mount(body, { args, open, close: () => close(id), session, win });
        win.cleanup = result?.cleanup;
        win.onArgs = result?.onArgs;
    } catch (err) {
        console.error(err);
        body.replaceChildren(h('div', { class: 'window__error' }, h('strong', {}, `${app.title} crashed while starting.`), h('p', {}, err.message)));
    }
    return win;
}

export const processes = () => [...windows.values()].map(win => ({
    pid: win.pid, name: win.app.id, title: win.app.title, started: win.started, minimized: win.minimized
}));

export const killByPid = (pid) => {
    const win = [...windows.values()].find(w => w.pid === pid);
    if (win) close(win.app.id);
    return Boolean(win);
};

export const closeAll = () => [...windows.keys()].forEach(close);

export { APPS };
