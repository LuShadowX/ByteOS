// In-memory Linux-style file system with owners and rwx permissions.
// The tree is saved to localStorage so files survive a reload.

import { store, bus } from './store.js';

export const USERS = {
    root: { uid: 0, home: '/root', type: 'Administrator (superuser)', sudo: true },
    lukshya: { uid: 1000, home: '/home/lukshya', type: 'Standard user', sudo: true },
    guest: { uid: 1001, home: '/home/guest', type: 'Guest account', sudo: false }
};

// What each top-level directory is for (Filesystem Hierarchy Standard)
export const FHS = {
    '/': 'Root of the whole tree. Every file and device hangs off here.',
    '/bin': 'Essential command programs (ls, cat, cp) that every user needs.',
    '/boot': 'Kernel image and bootloader files used while the machine starts.',
    '/dev': 'Device files. Hardware like disks shows up here as files.',
    '/etc': 'System-wide configuration files. Only root may change them.',
    '/home': 'Personal folders for normal users.',
    '/root': 'Home folder of the root (administrator) user.',
    '/tmp': 'Temporary files, cleared on reboot. Anyone may write here.',
    '/usr': 'Installed software, libraries and documentation.',
    '/var': 'Variable data: logs, caches, mail spools.',
    '/proc': 'Virtual files the kernel creates to describe running processes and hardware.'
};

const now = () => Date.now();
const dir = (owner = 'root', mode = 0o755, children = {}) => ({ type: 'dir', owner, mode, mtime: now(), children });
const file = (content = '', owner = 'root', mode = 0o644) => ({ type: 'file', owner, mode, mtime: now(), content });

function defaultTree() {
    const bins = ['ls', 'cd', 'cat', 'cp', 'mv', 'rm', 'mkdir', 'chmod', 'echo', 'grep', 'git', 'ps'];
    return dir('root', 0o755, {
        bin: dir('root', 0o755, Object.fromEntries(bins.map(name => [name, file(`ELF 64-bit executable: ${name}`, 'root', 0o755)]))),
        boot: dir('root', 0o755, {
            'vmlinuz': file('Linux kernel image 6.8 (compressed)', 'root', 0o644),
            'initrd.img': file('Initial RAM disk used before the real root file system is mounted', 'root', 0o644),
            grub: dir('root', 0o755, {
                'grub.cfg': file('menuentry "ByteOS" {\n  linux /boot/vmlinuz root=/dev/sda2 quiet\n  initrd /boot/initrd.img\n}', 'root', 0o644)
            })
        }),
        dev: dir('root', 0o755, {
            sda: file('block device: 256 GB SSD', 'root', 0o660),
            sda1: file('partition: EFI system (FAT32)', 'root', 0o660),
            sda2: file('partition: root file system (ext4)', 'root', 0o660),
            null: file('', 'root', 0o666),
            tty: file('terminal device', 'root', 0o666)
        }),
        etc: dir('root', 0o755, {
            hostname: file('byteos', 'root', 0o644),
            'os-release': file('NAME="ByteOS"\nVERSION="1.0"\nID=byteos\nID_LIKE=debian\nPRETTY_NAME="ByteOS 1.0 (browser edition)"', 'root', 0o644),
            passwd: file('root:x:0:0:root:/root:/bin/bash\nlukshya:x:1000:1000:Lukshya:/home/lukshya:/bin/bash\nguest:x:1001:1001:Guest:/home/guest:/bin/bash', 'root', 0o644),
            shadow: file('root:$6$Kq...:19800:0:99999:7:::\nlukshya:$6$x9...:19800:0:99999:7:::', 'root', 0o600),
            fstab: file('/dev/sda2  /      ext4  defaults  0 1\n/dev/sda1  /boot/efi  vfat  umask=0077  0 1', 'root', 0o644)
        }),
        home: dir('root', 0o755, {
            lukshya: dir('lukshya', 0o755, {
                Documents: dir('lukshya', 0o755, {
                    'notes.txt': file('CSE111 notes\n- CPU = Control Unit + ALU + Registers\n- RAM is volatile, ROM is not\n- Kernel talks to hardware', 'lukshya', 0o644),
                    'todo.txt': file('1. Try chmod on a file\n2. Make a git repo in ~/projects\n3. Read /etc/os-release', 'lukshya', 0o644)
                }),
                projects: dir('lukshya', 0o755, {}),
                'welcome.txt': file('Welcome to ByteOS!\nType "help" to see every command, or "man <command>" to learn one.', 'lukshya', 0o644),
                'secret.txt': file('Only I can read this file (mode 600).', 'lukshya', 0o600)
            }),
            guest: dir('guest', 0o755, {
                'readme.txt': file('Guest accounts can look around but cannot change the system.', 'guest', 0o644)
            })
        }),
        root: dir('root', 0o700, {
            'admin-notes.txt': file('Only root can open this folder.', 'root', 0o600)
        }),
        tmp: dir('root', 0o777, {}),
        usr: dir('root', 0o755, {
            bin: dir('root', 0o755, { python3: file('Python 3.12 interpreter', 'root', 0o755), gcc: file('GNU C compiler', 'root', 0o755) }),
            share: dir('root', 0o755, { doc: dir('root', 0o755, {}) })
        }),
        var: dir('root', 0o755, {
            log: dir('root', 0o755, {
                syslog: file('kernel: Booting Linux 6.8\nsystemd[1]: Reached target Graphical Interface\nsshd[412]: Server listening on 0.0.0.0 port 22', 'root', 0o640)
            })
        }),
        proc: dir('root', 0o555, {
            cpuinfo: file('model name : ByteCore i5 (virtual)\ncpu cores  : 4\nthreads    : 8\ncache size : 8192 KB', 'root', 0o444),
            meminfo: file('MemTotal:  8388608 kB\nMemFree:   5242880 kB\nSwapTotal: 2097152 kB', 'root', 0o444),
            version: file('Linux version 6.8.0-byteos (gcc 13.2)', 'root', 0o444)
        })
    });
}

let root = store.get('fs') ?? defaultTree();

const save = () => {
    store.set('fs', root);
    bus.emit('fs:change');
};

export class FsError extends Error {}

export function normalize(path, cwd = '/', home = '/') {
    if (path === '~' || path.startsWith('~/')) path = home + path.slice(1);
    const parts = (path.startsWith('/') ? path : `${cwd}/${path}`).split('/');
    const out = [];
    for (const part of parts) {
        if (!part || part === '.') continue;
        if (part === '..') out.pop();
        else out.push(part);
    }
    return '/' + out.join('/');
}

export const basename = (path) => path.split('/').filter(Boolean).pop() ?? '/';
export const dirname = (path) => normalize(path + '/..');

export function lookup(path) {
    let node = root;
    for (const part of path.split('/').filter(Boolean)) {
        if (node.type !== 'dir' || !node.children[part]) return null;
        node = node.children[part];
    }
    return node;
}

// owner gets the first rwx triple, everyone else the last one
export function can(user, node, action) {
    if (user === 'root') return true;
    const shift = node.owner === user ? 6 : 0;
    const bit = { r: 4, w: 2, x: 1 }[action];
    return Boolean((node.mode >> shift) & bit);
}

export function modeString(node) {
    const triple = (bits) => `${bits & 4 ? 'r' : '-'}${bits & 2 ? 'w' : '-'}${bits & 1 ? 'x' : '-'}`;
    return (node.type === 'dir' ? 'd' : '-') + triple(node.mode >> 6) + triple((node.mode >> 3) & 7) + triple(node.mode & 7);
}

export const sizeOf = (node) => node.type === 'file'
    ? new Blob([node.content]).size
    : Object.values(node.children).reduce((sum, child) => sum + sizeOf(child), 0);

function need(user, node, action, path) {
    if (!can(user, node, action)) throw new FsError(`${path}: Permission denied`);
}

// Every directory on the way must be searchable (x) by the user
function walk(path, user) {
    let node = root;
    let seen = '';
    for (const part of path.split('/').filter(Boolean)) {
        need(user, node, 'x', seen || '/');
        if (node.type !== 'dir') throw new FsError(`${seen}: Not a directory`);
        node = node.children[part];
        seen += '/' + part;
        if (!node) throw new FsError(`${seen}: No such file or directory`);
    }
    return node;
}

function parentOf(path, user) {
    const parent = walk(dirname(path), user);
    if (parent.type !== 'dir') throw new FsError(`${dirname(path)}: Not a directory`);
    return parent;
}

export const fs = {
    stat: (path, user) => walk(path, user),

    exists: (path) => Boolean(lookup(path)),

    list(path, user) {
        const node = walk(path, user);
        if (node.type !== 'dir') return [[basename(path), node]];
        need(user, node, 'r', path);
        return Object.entries(node.children).sort(([a], [b]) => a.localeCompare(b));
    },

    read(path, user) {
        const node = walk(path, user);
        if (node.type === 'dir') throw new FsError(`${path}: Is a directory`);
        need(user, node, 'r', path);
        return node.content;
    },

    write(path, content, user, { append = false } = {}) {
        const existing = lookup(path);
        if (existing) {
            if (existing.type === 'dir') throw new FsError(`${path}: Is a directory`);
            walk(path, user);
            need(user, existing, 'w', path);
            existing.content = append ? existing.content + content : content;
            existing.mtime = now();
        } else {
            const parent = parentOf(path, user);
            need(user, parent, 'w', dirname(path));
            parent.children[basename(path)] = file(content, user, 0o644);
            parent.mtime = now();
        }
        save();
    },

    touch(path, user) {
        const node = lookup(path);
        if (node) {
            walk(path, user);
            node.mtime = now();
            save();
        } else {
            fs.write(path, '', user);
        }
    },

    mkdir(path, user, { parents = false } = {}) {
        if (lookup(path)) {
            if (parents) return;
            throw new FsError(`${path}: File exists`);
        }
        if (parents && !lookup(dirname(path))) fs.mkdir(dirname(path), user, { parents });
        const parent = parentOf(path, user);
        need(user, parent, 'w', dirname(path));
        parent.children[basename(path)] = dir(user, 0o755);
        save();
    },

    remove(path, user, { recursive = false } = {}) {
        if (path === '/') throw new FsError('/: refusing to remove the root directory');
        const node = walk(path, user);
        if (node.type === 'dir' && !recursive) throw new FsError(`${path}: Is a directory (use rm -r)`);
        const parent = parentOf(path, user);
        need(user, parent, 'w', dirname(path));
        delete parent.children[basename(path)];
        save();
    },

    copy(from, to, user) {
        const node = walk(from, user);
        need(user, node, 'r', from);
        const target = lookup(to);
        const dest = target?.type === 'dir' ? normalize(`${to}/${basename(from)}`) : to;
        const parent = parentOf(dest, user);
        need(user, parent, 'w', dirname(dest));
        const clone = structuredClone(node);
        clone.owner = user;
        parent.children[basename(dest)] = clone;
        save();
    },

    move(from, to, user) {
        const target = lookup(to);
        const dest = target?.type === 'dir' ? normalize(`${to}/${basename(from)}`) : to;
        if (dest.startsWith(from + '/')) throw new FsError(`cannot move ${from} into itself`);
        const node = walk(from, user);
        const source = parentOf(from, user);
        need(user, source, 'w', dirname(from));
        const parent = parentOf(dest, user);
        need(user, parent, 'w', dirname(dest));
        delete source.children[basename(from)];
        parent.children[basename(dest)] = node;
        save();
    },

    chmod(path, mode, user) {
        const node = walk(path, user);
        if (user !== 'root' && node.owner !== user) throw new FsError(`changing permissions of '${path}': Operation not permitted`);
        node.mode = mode;
        save();
    },

    // quiet write used by git internals (respects nothing, keeps owner)
    raw: { lookup, save },

    reset() {
        root = defaultTree();
        save();
    }
};
