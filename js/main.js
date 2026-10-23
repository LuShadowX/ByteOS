import { h, $, toast } from './core/ui.js';
import { store } from './core/store.js';
import { fs, USERS } from './core/vfs.js';
import { boot } from './core/boot.js';
import { open, closeAll, session, APPS } from './core/wm.js';
import { GROUPS } from './apps/index.js';

const SESSION_KEY = 'byteos:session';

const readSession = () => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) ?? {}; } catch { return {}; }
};
const writeSession = (value) => {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(value)); } catch { /* ignore */ }
};

/* ---------- login ---------- */

function showLogin() {
    $('#desktop').hidden = true;
    $('#taskbar').hidden = true;
    $('#login').hidden = false;
    $('#login-time').textContent = new Date().toLocaleString(undefined, { weekday: 'long', hour: '2-digit', minute: '2-digit' });

    const accounts = [
        ['lukshya', 'Lukshya', 'Standard user · can use sudo'],
        ['guest', 'Guest', 'Guest account · limited']
    ];
    $('#login-users').replaceChildren(...accounts.map(([user, name, kind]) => h('button', {
        type: 'button', class: 'login__user',
        onClick: () => login(user)
    }, h('span', { class: 'login__avatar' }, name[0]), h('strong', {}, name), h('small', {}, kind))));
    $('#login-users button')?.focus();
}

function login(user) {
    session.user = user;
    writeSession({ booted: true, user });
    $('#login').hidden = true;
    showDesktop();
}

/* ---------- desktop ---------- */

function showDesktop() {
    $('#desktop').hidden = false;
    $('#taskbar').hidden = false;
    $('#tray-user').textContent = `${session.user} · ${USERS[session.user].type.split(' (')[0]}`;

    $('#desktop-icons').replaceChildren(...APPS.map(app => h('button', {
        type: 'button', class: 'desk-icon', style: { '--app': app.color }, title: app.about,
        onClick: () => open(app.id)
    }, h('span', { class: 'desk-icon__img', html: app.icon }), h('span', { class: 'desk-icon__label' }, app.title))));

    if (!store.get('welcomed')) {
        store.set('welcomed', true);
        open('coursemap');
    }
}

/* ---------- start menu ---------- */

function renderStart(filter = '') {
    const q = filter.trim().toLowerCase();
    const list = $('#start-list');
    const matches = APPS.filter(app => !q || `${app.title} ${app.about} ${app.group}`.toLowerCase().includes(q));
    list.replaceChildren(...GROUPS.map(group => {
        const apps = matches.filter(app => app.group === group);
        if (!apps.length) return null;
        return h('div', { class: 'start-group' },
            h('p', { class: 'start-group__name' }, group),
            apps.map(app => h('button', {
                type: 'button', class: 'start-app', style: { '--app': app.color },
                onClick: () => { toggleStart(false); open(app.id); }
            }, h('span', { class: 'start-app__icon', html: app.icon }), h('span', {}, h('strong', {}, app.title), h('small', {}, app.about)))));
    }).filter(Boolean));
    if (!matches.length) list.append(h('p', { class: 'start-empty' }, 'No app matches that.'));
}

function toggleStart(force) {
    const menu = $('#start-menu');
    const show = force ?? menu.hidden;
    menu.hidden = !show;
    $('#start-button').setAttribute('aria-expanded', show);
    if (show) {
        $('#power-menu').hidden = true;
        $('#start-search').value = '';
        renderStart();
        $('#start-search').focus();
    }
}

/* ---------- tray ---------- */

function tickClock() {
    const now = new Date();
    const clock = $('#tray-clock');
    clock.textContent = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    clock.title = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

async function power(action) {
    $('#power-menu').hidden = true;
    if (action === 'restart') {
        closeAll();
        $('#desktop').hidden = true;
        $('#taskbar').hidden = true;
        writeSession({});
        await boot();
        showLogin();
    } else if (action === 'logout') {
        closeAll();
        writeSession({ booted: true });
        showLogin();
    } else if (action === 'reset') {
        if (!confirm('Reset ByteOS? Your files, git repos, pins and progress will be erased.')) return;
        closeAll();
        store.clearAll();
        fs.reset();
        writeSession({});
        toast('ByteOS was reset to factory state.');
        setTimeout(() => location.reload(), 600);
    }
}

/* ---------- wiring ---------- */

$('#start-button').addEventListener('click', () => toggleStart());
$('#start-search').addEventListener('input', e => renderStart(e.target.value));
$('#start-search').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('#start-list .start-app')?.click();
});
$('#power-button').addEventListener('click', () => {
    toggleStart(false);
    $('#power-menu').hidden = !$('#power-menu').hidden;
});
$('#power-menu').addEventListener('click', e => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action) power(action);
});
$('#tray-clock').addEventListener('click', () => open('monitor'));

document.addEventListener('pointerdown', e => {
    if (!e.target.closest('#start-menu, #start-button')) toggleStart(false);
    if (!e.target.closest('#power-menu, #power-button')) $('#power-menu').hidden = true;
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        toggleStart(false);
        $('#power-menu').hidden = true;
    }
    // Ctrl+Alt+T opens a terminal, like on Ubuntu
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 't' && !$('#desktop').hidden) open('terminal');
});

tickClock();
setInterval(tickClock, 10000);

const saved = readSession();
if (saved.user && USERS[saved.user]) {
    session.user = saved.user;
    $('#boot').hidden = true;
    showDesktop();
} else if (saved.booted) {
    $('#boot').hidden = true;
    showLogin();
} else {
    await boot();
    writeSession({ booted: true });
    showLogin();
}
