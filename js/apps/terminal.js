// Terminal: a bash-like shell over the ByteOS file system.
// Supports pipes (|), redirection (> >>), && chains, quotes, $VARS, globs, history and tab completion.

import { h, sleep, track } from '../core/ui.js';
import { bus } from '../core/store.js';
import { fs, lookup, normalize, modeString, sizeOf, USERS, FHS, FsError } from '../core/vfs.js';
import { git } from '../core/git.js';
import { processes, killByPid } from '../core/wm.js';
import { APPS } from '../apps/index.js';

class ShellError extends Error {}

const SYSTEM_PROCS = [
    [1, 'root', 'systemd', 0.0, 0.3],
    [2, 'root', 'kthreadd', 0.0, 0.0],
    [214, 'root', 'systemd-journald', 0.1, 0.4],
    [388, 'root', 'NetworkManager', 0.2, 0.6],
    [412, 'root', 'sshd', 0.0, 0.2],
    [431, 'root', 'nftables (firewall)', 0.0, 0.1],
    [702, 'lukshya', 'byteos-desktop', 1.4, 2.8]
];

const MANUAL = {
    ls: ['list directory contents', 'ls [-l] [-a] [path]', '-l shows permissions, owner, size and date. -a includes hidden files (names starting with a dot).'],
    cd: ['change the working directory', 'cd [dir]', 'cd with no argument goes home. "cd .." goes up one level, "cd -" goes back.'],
    pwd: ['print working directory', 'pwd', 'Shows the full path of the folder you are in.'],
    mkdir: ['make directories', 'mkdir [-p] dir', '-p creates parent folders as needed.'],
    touch: ['create an empty file or update its time', 'touch file', ''],
    cat: ['print file contents', 'cat file...', 'Short for "concatenate": with several files it joins them.'],
    echo: ['print text', 'echo text [> file]', 'Use > to write into a file and >> to append to it.'],
    rm: ['remove files', 'rm [-r] path', '-r removes a folder and everything inside it. There is no recycle bin.'],
    cp: ['copy', 'cp source dest', ''],
    mv: ['move or rename', 'mv source dest', ''],
    chmod: ['change file permissions', 'chmod 755 file | chmod u+x file', 'Each digit is owner/group/others. r=4, w=2, x=1, so 7 = rwx, 5 = r-x, 4 = r--.'],
    whoami: ['print the current user', 'whoami', ''],
    su: ['switch user', 'su [user]', 'Without a name it switches to root. "exit" switches back.'],
    sudo: ['run one command as root', 'sudo command', 'Only users in the sudo group may use it. Guest is not.'],
    ps: ['list processes', 'ps', 'Every open ByteOS window is a process with its own PID.'],
    kill: ['stop a process', 'kill PID', 'Killing a window\'s PID closes that window.'],
    top: ['live process summary', 'top', ''],
    uname: ['print system information', 'uname [-a]', ''],
    df: ['disk space and file system types', 'df [-h] [-T]', '-T shows the file system type (ext4, vfat, tmpfs...).'],
    free: ['memory usage', 'free [-h]', ''],
    lsblk: ['list block devices (disks and partitions)', 'lsblk', ''],
    lscpu: ['CPU details', 'lscpu', ''],
    grep: ['search text', 'grep [-i] [-n] pattern [file]', 'Works on files or on piped input: cat notes.txt | grep CPU'],
    wc: ['count lines, words, characters', 'wc [-l] [file]', ''],
    head: ['first lines', 'head [-n N] [file]', ''],
    tail: ['last lines', 'tail [-n N] [file]', ''],
    sort: ['sort lines', 'sort [-r] [file]', ''],
    tree: ['show a folder as a tree', 'tree [dir]', ''],
    git: ['version control', 'git <command>', 'Try: git init, git add ., git commit -m "msg", git switch -c feature, git merge feature. Watch it in Git Lab.'],
    ping: ['test if a host is reachable', 'ping [-c N] host', 'Sends ICMP echo requests (simulated) and reports round-trip time.'],
    ip: ['network interfaces', 'ip a', ''],
    history: ['commands you typed', 'history', ''],
    open: ['open a ByteOS app', 'open <app>', 'For example: open files, open gitlab, open network'],
    hier: ['the Linux directory layout', 'man hier', 'Explains what each top-level folder is for.'],
    neofetch: ['system summary', 'neofetch', ''],
    clear: ['clear the screen', 'clear (or Ctrl+L)', ''],
    'reset-fs': ['restore every file to how it was', 'reset-fs', '']
};

function tokenize(line) {
    const tokens = [];
    const re = /"([^"]*)"|'([^']*)'|(&&|>>|>|\||[^\s|>&]+)/g;
    let match;
    while ((match = re.exec(line))) {
        if (match[1] !== undefined) tokens.push({ value: match[1], quoted: 'double' });
        else if (match[2] !== undefined) tokens.push({ value: match[2], quoted: 'single' });
        else tokens.push({ value: match[3], op: ['&&', '>>', '>', '|'].includes(match[3]) });
    }
    return tokens;
}

export function mount(body, { session, open, close, args }) {
    track('terminal/main');
    const env = () => ({ USER: state.user, HOME: USERS[state.user].home, PWD: state.cwd, SHELL: '/bin/bash', HOSTNAME: 'byteos' });
    const state = {
        user: session.user,
        cwd: USERS[session.user].home,
        prev: null,
        stack: [],
        history: [],
        cursor: 0,
        busy: false
    };

    const screen = h('div', { class: 'term__screen', role: 'log', 'aria-live': 'polite' });
    const promptEl = h('span', { class: 'term__prompt' });
    const input = h('input', { class: 'term__input', type: 'text', spellcheck: false, autocomplete: 'off', autocapitalize: 'off', 'aria-label': 'Terminal input' });
    const inputRow = h('div', { class: 'term__row' }, promptEl, input);
    const term = h('div', { class: 'term', onClick: () => { if (!getSelection().toString()) input.focus(); } }, screen, inputRow);
    body.append(term);

    const home = () => USERS[state.user].home;
    const short = (path) => (path === home() ? '~' : path.startsWith(home() + '/') ? '~' + path.slice(home().length) : path);
    const renderPrompt = () => {
        promptEl.replaceChildren(
            h('span', { class: state.user === 'root' ? 'p-root' : 'p-user' }, `${state.user}@byteos`), ':',
            h('span', { class: 'p-path' }, short(state.cwd)), state.user === 'root' ? '# ' : '$ ');
    };
    const print = (lines, cls = '') => {
        for (const line of [].concat(lines)) {
            if (line && typeof line === 'object') screen.append(h('div', { class: `term__line ${line.cls ?? ''}` }, line.text));
            else screen.append(h('div', { class: `term__line ${cls}` }, line === '' ? ' ' : line));
        }
        term.scrollTop = term.scrollHeight;
    };
    const resolve = (path) => normalize(path, state.cwd, home());
    const textOf = (lines) => lines.map(line => (typeof line === 'object' ? line.text : line)).join('\n');

    function expandGlob(word) {
        if (!word.includes('*')) return [word];
        const dirPath = word.includes('/') ? word.slice(0, word.lastIndexOf('/')) || '/' : '.';
        const pattern = word.slice(word.lastIndexOf('/') + 1);
        const re = new RegExp('^' + pattern.replace(/[.+?^${}()[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
        try {
            const matches = fs.list(resolve(dirPath), state.user).map(([name]) => name).filter(name => re.test(name) && !name.startsWith('.'));
            return matches.length ? matches.map(name => (dirPath === '.' ? name : `${dirPath}/${name}`)) : [word];
        } catch {
            return [word];
        }
    }

    function expand(tokens) {
        const vars = env();
        return tokens.flatMap(token => {
            if (token.op || token.quoted === 'single') return [token.value];
            const value = token.value.replace(/\$(\w+)/g, (_, name) => vars[name] ?? '');
            return token.quoted ? [value] : expandGlob(value);
        });
    }

    const ownerName = (node) => node.owner;

    /* ---------------- commands ---------------- */

    const COMMANDS = {
        help() {
            const groups = {
                'Files and folders': ['ls', 'cd', 'pwd', 'tree', 'mkdir', 'touch', 'cat', 'echo', 'cp', 'mv', 'rm'],
                'Permissions and users': ['chmod', 'whoami', 'id', 'su', 'sudo', 'exit'],
                'Processes and system': ['ps', 'top', 'kill', 'uname', 'neofetch', 'lscpu', 'lsblk', 'df', 'free', 'uptime', 'date'],
                'Text tools (work with |)': ['grep', 'wc', 'head', 'tail', 'sort', 'history'],
                'Network': ['ping', 'ip', 'hostname'],
                'Version control': ['git'],
                'ByteOS': ['open', 'apps', 'man', 'clear', 'reset-fs']
            };
            const out = ['ByteOS shell. Commands by topic:', ''];
            for (const [group, names] of Object.entries(groups)) out.push({ text: group, cls: 't-head' }, '  ' + names.join('  '), '');
            out.push('Pipes and redirection work:  cat notes.txt | grep CPU > found.txt', 'Type "man <command>" for details, Tab to complete, ↑ ↓ for history.');
            return out;
        },

        man(args) {
            const name = args[0];
            if (!name) return ['What manual page do you want? Try: man ls'];
            if (name === 'hier') return ['HIER(7) - the Linux directory layout', '', ...Object.entries(FHS).map(([dir, text]) => `  ${dir.padEnd(7)} ${text}`)];
            const page = MANUAL[name];
            if (!page) return [`No manual entry for ${name}`];
            return [{ text: `${name.toUpperCase()}(1)`, cls: 't-head' }, '', `NAME`, `    ${name} - ${page[0]}`, '', 'SYNOPSIS', `    ${page[1]}`, ...(page[2] ? ['', 'DESCRIPTION', `    ${page[2]}`] : [])];
        },

        clear() { screen.replaceChildren(); return []; },

        echo(args) { return [args.join(' ')]; },

        pwd() { return [state.cwd]; },

        cd(args) {
            let target = args[0] ?? '~';
            if (target === '-') {
                if (!state.prev) throw new ShellError('OLDPWD not set');
                target = state.prev;
            }
            const path = resolve(target);
            const node = fs.stat(path, state.user);
            if (node.type !== 'dir') throw new ShellError(`${target}: Not a directory`);
            state.prev = state.cwd;
            state.cwd = path;
            return [];
        },

        ls(args) {
            const flags = args.filter(a => a.startsWith('-')).join('');
            const targets = args.filter(a => !a.startsWith('-'));
            const long = flags.includes('l');
            const all = flags.includes('a');
            const out = [];
            for (const target of targets.length ? targets : ['.']) {
                const path = resolve(target);
                let entries = fs.list(path, state.user);
                if (!all) entries = entries.filter(([name]) => !name.startsWith('.'));
                if (targets.length > 1) out.push(`${target}:`);
                if (long) {
                    out.push(`total ${entries.length}`);
                    for (const [name, node] of entries) {
                        const date = new Date(node.mtime).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
                        out.push({ text: `${modeString(node)} 1 ${ownerName(node).padEnd(7)} ${ownerName(node).padEnd(7)} ${String(sizeOf(node)).padStart(5)} ${date} ${name}`, cls: node.type === 'dir' ? 't-dir' : node.mode & 0o111 ? 't-exec' : '' });
                    }
                } else {
                    out.push({ text: entries.map(([name, node]) => (node.type === 'dir' ? `${name}/` : name)).join('   ') || '', cls: 't-ls' });
                }
            }
            return out;
        },

        tree(args) {
            const path = resolve(args[0] ?? '.');
            const out = [short(path)];
            let dirs = 0;
            let files = 0;
            const walk = (dirPath, prefix) => {
                let entries;
                try { entries = fs.list(dirPath, state.user).filter(([name]) => !name.startsWith('.')); } catch { return; }
                entries.forEach(([name, node], i) => {
                    const last = i === entries.length - 1;
                    out.push({ text: `${prefix}${last ? '└── ' : '├── '}${name}`, cls: node.type === 'dir' ? 't-dir' : '' });
                    if (node.type === 'dir') { dirs++; walk(`${dirPath === '/' ? '' : dirPath}/${name}`, prefix + (last ? '    ' : '│   ')); } else files++;
                });
            };
            walk(path, '');
            out.push('', `${dirs} directories, ${files} files`);
            return out;
        },

        mkdir(args) {
            const parents = args.includes('-p');
            const names = args.filter(a => a !== '-p');
            if (!names.length) throw new ShellError('missing operand');
            names.forEach(name => fs.mkdir(resolve(name), state.user, { parents }));
            return [];
        },

        touch(args) {
            if (!args.length) throw new ShellError('missing file operand');
            args.forEach(name => fs.touch(resolve(name), state.user));
            return [];
        },

        cat(args, io) {
            if (!args.length) return io.stdin != null ? io.stdin.split('\n') : [];
            return args.flatMap(name => fs.read(resolve(name), state.user).split('\n'));
        },

        rm(args) {
            const flags = args.filter(a => a.startsWith('-')).join('');
            const names = args.filter(a => !a.startsWith('-'));
            if (!names.length) throw new ShellError('missing operand');
            for (const name of names) {
                const path = resolve(name);
                if (!lookup(path)) {
                    if (flags.includes('f')) continue;
                    throw new ShellError(`cannot remove '${name}': No such file or directory`);
                }
                fs.remove(path, state.user, { recursive: flags.includes('r') || flags.includes('R') });
            }
            return [];
        },

        cp(args) {
            const [from, to] = args.filter(a => !a.startsWith('-'));
            if (!to) throw new ShellError('missing destination file operand');
            fs.copy(resolve(from), resolve(to), state.user);
            return [];
        },

        mv(args) {
            const [from, to] = args;
            if (!to) throw new ShellError('missing destination file operand');
            fs.move(resolve(from), resolve(to), state.user);
            return [];
        },

        chmod(args) {
            const [mode, ...names] = args;
            if (!mode || !names.length) throw new ShellError('usage: chmod 755 file  or  chmod u+x file');
            for (const name of names) {
                const path = resolve(name);
                const node = fs.stat(path, state.user);
                let next;
                if (/^[0-7]{3}$/.test(mode)) {
                    next = parseInt(mode, 8);
                } else {
                    const m = mode.match(/^([ugoa]*)([+\-=])([rwx]+)$/);
                    if (!m) throw new ShellError(`invalid mode: '${mode}'`);
                    const [, who = 'a', op, perms] = m;
                    const bits = [...perms].reduce((sum, p) => sum | { r: 4, w: 2, x: 1 }[p], 0);
                    const targets = (who || 'a').replace('a', 'ugo');
                    const mask = [...targets].reduce((sum, w) => sum | (bits << { u: 6, g: 3, o: 0 }[w]), 0);
                    const clear = [...targets].reduce((sum, w) => sum | (7 << { u: 6, g: 3, o: 0 }[w]), 0);
                    next = op === '+' ? node.mode | mask : op === '-' ? node.mode & ~mask : (node.mode & ~clear) | mask;
                }
                fs.chmod(path, next, state.user);
            }
            return [];
        },

        whoami() { return [state.user]; },

        id() {
            const u = USERS[state.user];
            const groups = [`${u.uid}(${state.user})`, ...(u.sudo ? ['27(sudo)'] : [])];
            return [`uid=${u.uid}(${state.user}) gid=${u.uid}(${state.user}) groups=${groups.join(',')}`, `account type: ${u.type}`];
        },

        su(args) {
            const target = args.filter(a => a !== '-')[0] ?? 'root';
            if (!USERS[target]) throw new ShellError(`user ${target} does not exist`);
            if (state.user === 'guest' && target !== 'guest') throw new ShellError('Authentication failure (guest accounts cannot switch users)');
            state.stack.push({ user: state.user, cwd: state.cwd });
            state.user = target;
            state.cwd = USERS[target].home;
            return [`Switched to ${target} (${USERS[target].type}). Type "exit" to go back.`];
        },

        exit() {
            const prev = state.stack.pop();
            if (!prev) { setTimeout(close, 150); return ['logout']; }
            state.user = prev.user;
            state.cwd = prev.cwd;
            return ['exit'];
        },

        ps() {
            const gui = processes().map(p => [p.pid, session.user, p.name, 0.8, 1.9]);
            const rows = [...SYSTEM_PROCS, ...gui];
            const out = ['  PID USER      %CPU %MEM COMMAND'];
            rows.forEach(([pid, user, name, cpu, mem]) => out.push(`${String(pid).padStart(5)} ${user.padEnd(9)} ${cpu.toFixed(1).padStart(4)} ${mem.toFixed(1).padStart(4)} ${name}`));
            return out;
        },

        top() {
            const procs = [...SYSTEM_PROCS, ...processes().map(p => [p.pid, session.user, p.name, 0, 0])]
                .map(([pid, user, name]) => [pid, user, name, +(Math.random() * (name === 'terminal' ? 6 : 3)).toFixed(1), +(Math.random() * 4 + 0.2).toFixed(1)])
                .sort((a, b) => b[3] - a[3]);
            const cpu = procs.reduce((sum, p) => sum + p[3], 0);
            return [
                `top - ${new Date().toLocaleTimeString()} up ${Math.round(performance.now() / 60000)} min, 1 user, load average: 0.42, 0.31, 0.25`,
                `Tasks: ${procs.length} total, 1 running, ${procs.length - 1} sleeping`,
                `%Cpu(s): ${cpu.toFixed(1)} us, ${(100 - cpu).toFixed(1)} id`,
                'MiB Mem :   8192.0 total,   5120.4 free,   2187.2 used,    884.4 buff/cache',
                '',
                '  PID USER      %CPU %MEM COMMAND',
                ...procs.map(([pid, user, name, c, m]) => `${String(pid).padStart(5)} ${user.padEnd(9)} ${c.toFixed(1).padStart(4)} ${m.toFixed(1).padStart(4)} ${name}`),
                '', '(snapshot; real top refreshes every few seconds)'
            ];
        },

        kill(args) {
            const pid = Number(args.filter(a => !a.startsWith('-'))[0]);
            if (!pid) throw new ShellError('usage: kill PID (see ps)');
            if (SYSTEM_PROCS.some(([p]) => p === pid)) {
                if (state.user !== 'root') throw new ShellError(`(${pid}) - Operation not permitted`);
                if (pid === 1) throw new ShellError('(1) - refusing: PID 1 (systemd) is the parent of every process. Killing it would crash the whole system.');
                return [`Stopped system process ${pid} (it will be restarted by systemd).`];
            }
            if (!killByPid(pid)) throw new ShellError(`(${pid}) - No such process`);
            return [];
        },

        uname(args) {
            return [args.includes('-a') ? 'Linux byteos 6.8.0-byteos #1 SMP PREEMPT x86_64 GNU/Linux' : 'Linux'];
        },

        hostname() { return [fs.read('/etc/hostname', 'root')]; },

        date() { return [new Date().toString()]; },

        uptime() { return [` ${new Date().toLocaleTimeString()} up ${Math.max(1, Math.round(performance.now() / 60000))} min, 1 user`]; },

        df(args) {
            const hr = args.some(a => a.includes('h'));
            const showType = args.some(a => a.includes('T'));
            const rows = [
                ['/dev/sda2', 'ext4', 249_000_000, 61_200_000, '/'],
                ['/dev/sda1', 'vfat', 524_288, 6_200, '/boot/efi'],
                ['tmpfs', 'tmpfs', 4_096_000, 1_200, '/tmp'],
                ['proc', 'proc', 0, 0, '/proc']
            ];
            const size = (kb) => (hr ? (kb >= 1e6 ? `${(kb / 1048576).toFixed(1)}G` : kb >= 1024 ? `${Math.round(kb / 1024)}M` : `${kb}K`) : String(kb));
            const head = `Filesystem ${showType ? 'Type  ' : ''}${hr ? ' Size  Used Avail' : '  1K-blocks      Used     Avail'} Use% Mounted on`;
            return [head, ...rows.map(([name, type, total, used, mount]) =>
                `${name.padEnd(10)} ${showType ? type.padEnd(6) : ''}${size(total).padStart(hr ? 5 : 11)} ${size(used).padStart(hr ? 5 : 9)} ${size(total - used).padStart(hr ? 5 : 9)} ${total ? String(Math.round((used / total) * 100)).padStart(3) + '%' : '   -'} ${mount}`),
            ...(showType ? ['', 'ext4 = Linux\'s main file system, vfat = FAT32 (needed by UEFI), tmpfs = lives in RAM, proc = virtual kernel files'] : [])];
        },

        free(args) {
            const hr = args.includes('-h');
            const f = (mb) => (hr ? `${(mb / 1024).toFixed(1)}Gi` : String(mb * 1024));
            return ['               total        used        free      shared  buff/cache   available',
                `Mem:    ${[8192, 2187, 5120, 112, 884, 5741].map(v => f(v).padStart(11)).join(' ')}`,
                `Swap:   ${[2048, 0, 2048].map(v => f(v).padStart(11)).join(' ')}`];
        },

        lsblk() {
            return ['NAME   MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS', 'sda      8:0    0   256G  0 disk', '├─sda1   8:1    0   512M  0 part /boot/efi', '└─sda2   8:2    0 255.5G  0 part /'];
        },

        lscpu() {
            return ['Architecture:        x86_64', 'CPU(s):              8', 'Thread(s) per core:  2', 'Core(s) per socket:  4', 'Model name:          ByteCore i5 (virtual)', 'CPU max MHz:         3200', 'L1d cache:           192 KiB', 'L2 cache:            2 MiB', 'L3 cache:            8 MiB'];
        },

        neofetch() {
            const art = ['   ____        _       ', '  | __ ) _   _| |_ ___ ', '  |  _ \\| | | | __/ _ \\', '  | |_) | |_| | ||  __/', '  |____/ \\__, |\\__\\___|', '         |___/  OS     '];
            const info = [`${state.user}@byteos`, '--------------', 'OS: ByteOS 1.0 x86_64', 'Kernel: 6.8.0-byteos', 'Shell: bash 5.2', 'CPU: ByteCore i5 (8) @ 3.2GHz', 'GPU: ByteGraphics 2048', 'Memory: 2187MiB / 8192MiB'];
            return info.map((line, i) => ({ text: `${(art[i] ?? '').padEnd(25)}${line}`, cls: i < art.length ? 't-art' : '' }));
        },

        history() { return state.history.map((cmd, i) => `${String(i + 1).padStart(4)}  ${cmd}`); },

        grep(args, io) {
            const flags = args.filter(a => a.startsWith('-')).join('');
            const [pattern, ...names] = args.filter(a => !a.startsWith('-'));
            if (!pattern) throw new ShellError('usage: grep [-i] [-n] pattern [file]');
            const re = new RegExp(pattern.replace(/[.+?^${}()[\]\\]/g, '\\$&'), flags.includes('i') ? 'i' : '');
            const sources = names.length ? names.map(n => [n, fs.read(resolve(n), state.user)]) : [['', io.stdin ?? '']];
            return sources.flatMap(([name, text]) => text.split('\n')
                .map((line, i) => [line, i])
                .filter(([line]) => re.test(line))
                .map(([line, i]) => ({ text: `${names.length > 1 ? name + ':' : ''}${flags.includes('n') ? i + 1 + ':' : ''}${line}`, cls: 't-match' })));
        },

        wc(args, io) {
            const name = args.find(a => !a.startsWith('-'));
            const text = name ? fs.read(resolve(name), state.user) : io.stdin ?? '';
            const lines = text ? text.split('\n').length : 0;
            if (args.includes('-l')) return [`${lines}${name ? ' ' + name : ''}`];
            return [`${String(lines).padStart(4)} ${String(text.split(/\s+/).filter(Boolean).length).padStart(4)} ${String(text.length).padStart(5)}${name ? ' ' + name : ''}`];
        },

        head(args, io) { return lines(args, io).slice(0, count(args)); },
        tail(args, io) { return lines(args, io).slice(-count(args)); },
        sort(args, io) {
            const out = lines(args, io).sort((a, b) => a.localeCompare(b));
            return args.includes('-r') ? out.reverse() : out;
        },

        git(args) { return git(args, { cwd: state.cwd, user: state.user }).map(line => ({ text: line, cls: /^(fatal|error|CONFLICT)/.test(line) ? 't-err' : /^\t(new file|modified|deleted)/.test(line) ? 't-git' : '' })); },

        async ping(args, io) {
            const host = args.filter(a => !a.startsWith('-') && !/^\d+$/.test(a))[0];
            const at = args.indexOf('-c');
            const n = at >= 0 ? Math.min(10, Number(args[at + 1]) || 4) : 4;
            if (!host) throw new ShellError('usage: ping [-c N] host');
            const local = ['localhost', '127.0.0.1', 'byteos'].includes(host);
            const ip = local ? '127.0.0.1' : `142.250.${(host.length * 7) % 255}.${(host.length * 13) % 255}`;
            const base = local ? 0.04 : 18 + (host.length % 9) * 3;
            io.print(`PING ${host} (${ip}) 56(84) bytes of data.`);
            const times = [];
            for (let i = 1; i <= n; i++) {
                await sleep(500);
                const t = +(base + Math.random() * (local ? 0.05 : 9)).toFixed(local ? 3 : 1);
                times.push(t);
                io.print(`64 bytes from ${ip}: icmp_seq=${i} ttl=${local ? 64 : 117} time=${t} ms`);
            }
            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            return ['', `--- ${host} ping statistics ---`, `${n} packets transmitted, ${n} received, 0% packet loss`, `rtt min/avg/max = ${Math.min(...times)}/${avg.toFixed(2)}/${Math.max(...times)} ms`];
        },

        ip() {
            return ['1: lo: <LOOPBACK,UP> mtu 65536', '    inet 127.0.0.1/8 scope host lo', '2: wlan0: <BROADCAST,MULTICAST,UP> mtu 1500', '    link/ether 3c:22:fb:9a:41:0e', '    inet 192.168.1.42/24 brd 192.168.1.255 scope global wlan0', '', 'Your LAN address is private (192.168.x.x). The router translates it (NAT) for the internet.'];
        },

        open(args) {
            const name = (args[0] ?? '').toLowerCase();
            const app = APPS.find(a => a.id === name || a.title.toLowerCase().replace(/\s+/g, '') === name.replace(/\s+/g, ''));
            if (!app) throw new ShellError(`no app "${name}". Try: ${APPS.map(a => a.id).join(', ')}`);
            open(app.id);
            return [`Opening ${app.title}...`];
        },

        apps() { return APPS.map(app => `${app.id.padEnd(10)} ${app.title} - ${app.about}`); },

        'reset-fs'() {
            fs.reset();
            state.cwd = home();
            return ['File system restored to factory state.'];
        }
    };
    COMMANDS.ifconfig = COMMANDS.ip;

    function lines(args, io) {
        const name = args.find(a => !a.startsWith('-') && !/^\d+$/.test(a));
        return (name ? fs.read(resolve(name), state.user) : io.stdin ?? '').split('\n');
    }
    function count(args) {
        const at = args.indexOf('-n');
        return at >= 0 ? Number(args[at + 1]) || 10 : 10;
    }

    /* ---------------- execution ---------------- */

    async function runSimple(words, stdin, asUser) {
        const [name, ...rest] = words;
        if (!name) return [];
        if (name === 'sudo') {
            if (!USERS[state.user].sudo) throw new ShellError(`${state.user} is not in the sudoers file. This incident will be reported.`);
            if (!rest.length) throw new ShellError('usage: sudo command');
            const before = state.user;
            state.user = 'root';
            try {
                return await runSimple(rest, stdin, 'root');
            } finally {
                state.user = before;
            }
        }
        const command = COMMANDS[name];
        if (!command) throw new ShellError(`${name}: command not found${MANUAL[name] ? '' : '. Type "help" for the list.'}`);
        try {
            return await command(rest, { stdin, print: (line) => print(line), user: asUser ?? state.user });
        } catch (err) {
            if (err instanceof FsError || err instanceof ShellError) throw new ShellError(`${name}: ${err.message}`);
            throw err;
        }
    }

    async function runPipeline(tokens) {
        // split on | then handle a trailing > or >>
        const stages = [[]];
        for (const t of tokens) {
            if (t.op && t.value === '|') stages.push([]);
            else stages[stages.length - 1].push(t);
        }
        let output = null;
        let redirect = null;
        for (let i = 0; i < stages.length; i++) {
            let stage = stages[i];
            const at = stage.findIndex(t => t.op && (t.value === '>' || t.value === '>>'));
            if (at >= 0) {
                if (i !== stages.length - 1) throw new ShellError('redirect only works at the end of a pipeline');
                const target = stage[at + 1];
                if (!target) throw new ShellError('syntax error near unexpected token `newline\'');
                redirect = { append: stage[at].value === '>>', path: resolve(expand([target])[0]) };
                stage = stage.slice(0, at);
            }
            const words = expand(stage);
            output = await runSimple(words, output == null ? null : textOf(output));
        }
        if (redirect) {
            const text = textOf(output);
            fs.write(redirect.path, redirect.append ? `${text}\n` : text, state.user, { append: redirect.append });
            return [];
        }
        return output ?? [];
    }

    async function execute(line) {
        const tokens = tokenize(line);
        const chain = [[]];
        for (const t of tokens) {
            if (t.op && t.value === '&&') chain.push([]);
            else chain[chain.length - 1].push(t);
        }
        for (const part of chain) {
            if (!part.length) continue;
            try {
                print(await runPipeline(part));
            } catch (err) {
                print(err instanceof ShellError ? err.message : `bash: ${err.message}`, 't-err');
                break;
            }
        }
    }

    async function submit() {
        const line = input.value;
        input.value = '';
        print({ text: '', cls: 'term__echo' });
        screen.lastChild.replaceChildren(promptEl.cloneNode(true), line);
        if (line.trim()) {
            state.history.push(line);
            state.cursor = state.history.length;
            state.busy = true;
            inputRow.hidden = true;
            await execute(line);
            inputRow.hidden = false;
            state.busy = false;
            bus.emit('term:run', line);
        }
        renderPrompt();
        input.focus();
        term.scrollTop = term.scrollHeight;
    }

    function complete() {
        const value = input.value;
        const parts = value.split(/\s+/);
        const word = parts[parts.length - 1];
        let options;
        if (parts.length === 1) {
            options = Object.keys(COMMANDS).filter(name => COMMANDS[name] && name.startsWith(word));
        } else {
            const dirPart = word.includes('/') ? word.slice(0, word.lastIndexOf('/') + 1) : '';
            const base = word.slice(dirPart.length);
            try {
                options = fs.list(resolve(dirPart || '.'), state.user)
                    .filter(([name]) => name.startsWith(base) && (base.startsWith('.') || !name.startsWith('.')))
                    .map(([name, node]) => dirPart + name + (node.type === 'dir' ? '/' : ''));
            } catch { options = []; }
        }
        if (options.length === 1) {
            parts[parts.length - 1] = options[0];
            input.value = parts.join(' ') + (options[0].endsWith('/') ? '' : ' ');
        } else if (options.length > 1) {
            print({ text: '', cls: 'term__echo' });
            screen.lastChild.replaceChildren(promptEl.cloneNode(true), value);
            print(options.join('   '));
            const common = options.reduce((a, b) => { let i = 0; while (a[i] && a[i] === b[i]) i++; return a.slice(0, i); });
            parts[parts.length - 1] = common;
            input.value = parts.join(' ');
        }
    }

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); if (!state.busy) submit(); }
        else if (e.key === 'Tab') { e.preventDefault(); complete(); }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (state.cursor > 0) input.value = state.history[--state.cursor];
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            state.cursor = Math.min(state.history.length, state.cursor + 1);
            input.value = state.history[state.cursor] ?? '';
        } else if (e.key.toLowerCase() === 'l' && e.ctrlKey) {
            e.preventDefault();
            screen.replaceChildren();
        } else if (e.key.toLowerCase() === 'c' && e.ctrlKey && !getSelection().toString()) {
            e.preventDefault();
            print({ text: '', cls: 'term__echo' });
            screen.lastChild.replaceChildren(promptEl.cloneNode(true), input.value + '^C');
            input.value = '';
        }
    });

    print([
        { text: `ByteOS 1.0 (GNU/Linux 6.8.0-byteos x86_64)`, cls: 't-head' },
        '',
        ' * Type "help" to see every command, "man <command>" to learn one.',
        ' * Try:  ls -l   |   cat welcome.txt   |   chmod 600 welcome.txt   |   sudo ls /root',
        ' * Version control:  cd projects && git init',
        ''
    ]);
    renderPrompt();
    setTimeout(() => input.focus(), 50);

    const runArgs = async (a) => {
        if (a?.run) {
            input.value = a.run;
            await submit();
        }
    };
    runArgs(args);
    return { onArgs: runArgs };
}
