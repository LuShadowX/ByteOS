// Files: a graphical explorer over the same file system the Terminal uses, plus file system types.

import { h, tabs, table, note, toast } from '../core/ui.js';
import { bus } from '../core/store.js';
import { fs, lookup, normalize, basename, dirname, modeString, sizeOf, can, FHS, USERS } from '../core/vfs.js';

function permTable(node) {
    const who = [['Owner', 6], ['Group', 3], ['Others', 0]];
    return h('table', { class: 'data perm-table' },
        h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Read (4)'), h('th', {}, 'Write (2)'), h('th', {}, 'Execute (1)'), h('th', {}, 'Digit'))),
        h('tbody', {}, who.map(([name, shift]) => {
            const bits = (node.mode >> shift) & 7;
            return h('tr', {}, h('th', { scope: 'row' }, name), ...[4, 2, 1].map(b => h('td', {}, bits & b ? h('span', { class: 'badge badge--good' }, 'yes') : h('span', { class: 'muted' }, '—'))), h('td', { class: 'mono' }, bits));
        })));
}

function browser(panel, { session, open }) {
    const user = session.user;
    let cwd = USERS[user].home;
    let selected = null;
    const expanded = new Set(['/', '/home', USERS[user].home]);

    const tree = h('nav', { class: 'fx-tree', 'aria-label': 'Folders' });
    const crumbs = h('div', { class: 'fx-crumbs' });
    const about = h('p', { class: 'fx-about' });
    const list = h('tbody');
    const preview = h('aside', { class: 'fx-preview' });

    const renderTree = () => {
        const node = (path) => {
            const entry = lookup(path);
            const kids = Object.entries(entry.children).filter(([, c]) => c.type === 'dir').sort(([a], [b]) => a.localeCompare(b));
            const isOpen = expanded.has(path);
            const locked = !can(user, entry, 'x');
            return h('li', {},
                h('button', { type: 'button', class: `fx-folder${path === cwd ? ' is-current' : ''}`, onClick: () => { if (kids.length) isOpen ? expanded.delete(path) : expanded.add(path); go(path); } },
                    h('span', { class: 'fx-caret' }, kids.length ? (isOpen ? '▾' : '▸') : ''), locked ? '🔒 ' : '📁 ', path === '/' ? '/' : basename(path)),
                isOpen && kids.length ? h('ul', {}, kids.map(([name]) => node(path === '/' ? `/${name}` : `${path}/${name}`))) : null);
        };
        tree.replaceChildren(h('ul', {}, node('/')));
    };

    const go = (path) => {
        try {
            fs.list(path, user);
        } catch (err) {
            toast(`${err.message}. Log in as root (or use sudo in the terminal) to open it.`);
            return;
        }
        cwd = path;
        selected = null;
        let p = path;
        while (p !== '/') { expanded.add(p); p = dirname(p); }
        render();
    };

    const select = (name) => { selected = name; renderList(); renderPreview(); };

    const renderList = () => {
        let entries = [];
        try { entries = fs.list(cwd, user); } catch { entries = []; }
        list.replaceChildren(...entries.filter(([name]) => name !== '.git').map(([name, n]) => h('tr', {
            class: `${selected === name ? 'is-selected' : ''}`, tabindex: 0,
            onClick: () => select(name),
            onDblclick: () => n.type === 'dir' && go(normalize(name, cwd)),
            onKeydown: e => { if (e.key === 'Enter') n.type === 'dir' ? go(normalize(name, cwd)) : select(name); }
        },
            h('th', { scope: 'row' }, n.type === 'dir' ? '📁 ' : '📄 ', name),
            h('td', { class: 'mono' }, modeString(n)), h('td', {}, n.owner), h('td', {}, n.type === 'dir' ? '—' : `${sizeOf(n)} B`),
            h('td', { class: 'muted' }, new Date(n.mtime).toLocaleDateString()))));
        if (!entries.length) list.append(h('tr', {}, h('td', { colspan: 5, class: 'muted' }, 'This folder is empty.')));
    };

    const renderPreview = () => {
        if (!selected) {
            const node = lookup(cwd);
            preview.replaceChildren(h('h4', {}, cwd), h('p', { class: 'muted' }, `Folder · owner ${node.owner} · ${modeString(node)}`), permTable(node),
                h('p', { class: 'muted' }, 'Select a file to read it. Double-click a folder to open it.'));
            return;
        }
        const path = normalize(selected, cwd);
        const node = lookup(path);
        let content;
        try { content = node.type === 'file' ? fs.read(path, user) : null; } catch (err) { content = err; }
        preview.replaceChildren(
            h('h4', {}, selected), h('p', { class: 'muted mono' }, `${modeString(node)}  owner: ${node.owner}  (${(node.mode).toString(8).padStart(3, '0')})`),
            permTable(node),
            node.type === 'file' ? (content instanceof Error
                ? h('p', { class: 'note note--bad' }, `${content.message}. The "r" bit is off for you, so the OS refuses to open it.`)
                : h('pre', { class: 'code fx-content' }, content || '(empty file)')) : '',
            h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onClick: () => open('terminal', { run: `cd ${cwd} && ls -l` }) }, 'Show in Terminal'));
    };

    const render = () => {
        renderTree();
        const parts = cwd.split('/').filter(Boolean);
        crumbs.replaceChildren(h('button', { type: 'button', onClick: () => go('/') }, '/'),
            ...parts.flatMap((part, i) => [h('span', {}, '›'), h('button', { type: 'button', onClick: () => go('/' + parts.slice(0, i + 1).join('/')) }, part)]));
        const top = '/' + (parts[0] ?? '');
        about.replaceChildren(h('b', {}, `${FHS[cwd] ? cwd : top}: `), FHS[cwd] ?? FHS[top] ?? '');
        about.hidden = !(FHS[cwd] ?? FHS[top]);
        renderList();
        renderPreview();
    };

    const action = (label, fn) => h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onClick: () => { try { fn(); } catch (err) { toast(err.message); } } }, label);
    const toolbar = h('div', { class: 'row fx-toolbar' },
        action('↑ Up', () => go(dirname(cwd))),
        action('🏠 Home', () => go(USERS[user].home)),
        action('+ Folder', () => { const name = prompt('Folder name'); if (name) fs.mkdir(normalize(name, cwd), user); }),
        action('+ File', () => { const name = prompt('File name'); if (name) fs.write(normalize(name, cwd), prompt('Contents (optional)') ?? '', user); }),
        action('Delete', () => { if (selected && confirm(`Delete ${selected}?`)) { fs.remove(normalize(selected, cwd), user, { recursive: true }); selected = null; } }),
        h('span', { class: 'muted', style: { marginLeft: 'auto' } }, `Signed in as ${user}`));

    panel.append(
        h('div', { class: 'fx' },
            tree,
            h('div', { class: 'fx-main' }, toolbar, crumbs, about,
                h('div', { class: 'fx-split' },
                    h('table', { class: 'data fx-list' }, h('thead', {}, h('tr', {}, ['Name', 'Permissions', 'Owner', 'Size', 'Modified'].map(t => h('th', {}, t)))), list),
                    preview))));
    render();
    return bus.on('fs:change', render);
}

const FILE_SYSTEMS = [
    ['FAT32', '4 GB', '2 TB', 'No', 'Windows, macOS, Linux, cameras, TVs', 'Old USB drives, SD cards, the EFI boot partition'],
    ['exFAT', '16 EB', '128 PB', 'No', 'Windows, macOS, Linux', 'Big USB drives and SD cards shared between PCs and Macs'],
    ['NTFS', '16 TB+', '256 TB', 'Yes', 'Windows (read-only on macOS)', 'Windows system drive (C:)'],
    ['ext4', '16 TB', '1 EB', 'Yes', 'Linux', 'Linux root and home partitions'],
    ['HFS+', '8 EB', '8 EB', 'Yes', 'macOS (older)', 'Macs before 2017, Time Machine drives'],
    ['APFS', '8 EB', '8 EB', 'Copy-on-write', 'macOS, iOS', 'Modern Macs and iPhones, optimised for SSDs'],
    ['UDF', '16 EB', '2 TB+', 'No', 'All OSes', 'DVDs and Blu-ray discs']
];

const PICKS = [
    ['A 64 GB pen drive you use on both Windows and Mac, with 6 GB movie files', 'exFAT'],
    ['The main drive of a Windows laptop', 'NTFS'],
    ['The root partition of an Ubuntu install', 'ext4'],
    ['A data DVD you are burning', 'UDF'],
    ['The small EFI partition the firmware boots from', 'FAT32']
];

function fsTypes(panel) {
    let i = 0;
    const quiz = h('div', { class: 'card' });
    const ask = () => {
        const [text, answer] = PICKS[i % PICKS.length];
        quiz.replaceChildren(h('small', { class: 'muted' }, `Pick the best file system (${(i % PICKS.length) + 1}/${PICKS.length})`), h('h3', {}, text),
            ...['FAT32', 'exFAT', 'NTFS', 'ext4', 'UDF'].map(name => h('button', { type: 'button', class: 'quiz-option', onClick: e => {
                e.target.classList.add(name === answer ? 'is-right' : 'is-wrong');
                quiz.querySelectorAll('.quiz-option').forEach(b => { b.disabled = true; if (b.textContent === answer) b.classList.add('is-right'); });
                setTimeout(() => { i++; ask(); }, 1300);
            } }, name)));
    };
    ask();
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'File systems'), h('p', {}, 'A file system decides how files are named, stored, found and protected on a disk. Without one, a disk is just billions of unlabelled bytes.'))),
        h('div', { class: 'info-cards' },
            h('div', { class: 'info-card' }, h('h4', {}, 'Files and directories'), h('p', {}, 'Named data, organised in a tree starting from a root.')),
            h('div', { class: 'info-card' }, h('h4', {}, 'Metadata'), h('p', {}, 'Size, owner, permissions and dates. Linux keeps them in an inode.')),
            h('div', { class: 'info-card' }, h('h4', {}, 'Blocks'), h('p', {}, 'The disk is divided into fixed-size blocks (often 4 KB). A file uses one or more.')),
            h('div', { class: 'info-card' }, h('h4', {}, 'Journaling'), h('p', {}, 'Changes are written to a log first, so a power cut cannot corrupt the disk.'))),
        h('h4', {}, 'Common file systems'),
        table(['File system', 'Max file size', 'Max volume', 'Journaling', 'Works on', 'Typical use'], FILE_SYSTEMS),
        note('Run "df -T" in the Terminal to see which file systems ByteOS has mounted.'),
        h('h4', {}, 'Which file system would you choose?'), quiz);
}

export function mount(body, { args, session, open }) {
    const cleanups = [];
    const view = tabs([
        { id: 'browser', label: 'File explorer', render: (p) => cleanups.push(browser(p, { session, open })) },
        { id: 'fstypes', label: 'File system types', render: fsTypes }
    ], { app: 'files' });
    body.append(view.el);
    if (args?.tab) view.show(args.tab);
    return { cleanup: () => cleanups.forEach(fn => fn()), onArgs: (a) => a?.tab && view.show(a.tab) };
}
