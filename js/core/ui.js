// Small DOM helpers shared by every app.

import { store, bus } from './store.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function apply(el, props) {
    for (const [key, value] of Object.entries(props)) {
        if (value == null || value === false) continue;
        if (key === 'class') el.setAttribute('class', value);
        else if (key === 'style' && typeof value === 'object') {
            for (const [prop, v] of Object.entries(value)) {
                if (prop.startsWith('--')) el.style.setProperty(prop, v);
                else el.style[prop] = v;
            }
        }
        else if (key === 'dataset') Object.assign(el.dataset, value);
        else if (key === 'html') el.innerHTML = value;
        else if (key === 'text') el.textContent = value;
        else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
        else if (key in el && !(el instanceof SVGElement) && typeof value !== 'string') el[key] = value;
        else el.setAttribute(key, value === true ? '' : value);
    }
}

function append(el, children) {
    for (const child of children.flat(Infinity)) {
        if (child == null || child === false) continue;
        el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
}

// h('button', { class: 'btn', onClick: fn }, 'Label')
export function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    apply(el, props);
    append(el, children);
    return el;
}

export function s(tag, props = {}, ...children) {
    const el = document.createElementNS(SVG_NS, tag);
    apply(el, props);
    append(el, children);
    return el;
}

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// Remembers which app/tab pairs the user has opened (shown as progress in Course Map)
export function track(key) {
    const seen = new Set(store.get('visited', []));
    if (seen.has(key)) return;
    seen.add(key);
    store.set('visited', [...seen]);
    bus.emit('visited', key);
}

// Tabbed panels. Each panel is built the first time it is opened.
export function tabs(items, { onChange, app } = {}) {
    const bar = h('div', { class: 'tabs', role: 'tablist' });
    const body = h('div', { class: 'tab-body' });
    const built = new Map();

    const show = (id) => {
        for (const button of bar.children) {
            const active = button.dataset.id === id;
            button.setAttribute('aria-selected', active);
            button.tabIndex = active ? 0 : -1;
        }
        for (const panel of body.children) panel.hidden = panel.dataset.id !== id;
        if (!built.has(id)) {
            const item = items.find(entry => entry.id === id);
            const panel = h('div', { class: 'tab-panel', role: 'tabpanel', dataset: { id } });
            body.append(panel);
            built.set(id, item.render(panel) ?? true);
        }
        if (app) track(`${app}/${id}`);
        onChange?.(id);
    };

    items.forEach(item => bar.append(h('button', {
        class: 'tab', role: 'tab', type: 'button', dataset: { id: item.id },
        onClick: () => show(item.id)
    }, item.label)));

    bar.addEventListener('keydown', e => {
        if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
        const buttons = [...bar.children];
        const index = buttons.indexOf(document.activeElement);
        const next = buttons[(index + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length];
        next.focus();
        show(next.dataset.id);
    });

    const el = h('div', { class: 'tabbed' }, bar, body);
    show(items[0].id);
    return { el, show: (id) => items.some(item => item.id === id) && show(id) };
}

export const card = (title, ...children) => h('section', { class: 'card' }, title && h('h3', {}, title), ...children);

export const note = (...children) => h('p', { class: 'note' }, ...children);

export function table(head, rows, props = {}) {
    return h('table', { class: 'data', ...props },
        h('thead', {}, h('tr', {}, head.map(cell => h('th', { scope: 'col' }, cell)))),
        h('tbody', {}, rows.map(row => h('tr', {}, row.map((cell, i) => i === 0 ? h('th', { scope: 'row' }, cell) : h('td', {}, cell))))));
}

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
    return `${bytes < 10 && i ? bytes.toFixed(1) : Math.round(bytes)} ${units[i]}`;
}

export function toast(message) {
    const el = h('div', { class: 'toast', role: 'status' }, message);
    document.body.append(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    setTimeout(() => {
        el.classList.remove('is-in');
        setTimeout(() => el.remove(), 300);
    }, 2600);
}
