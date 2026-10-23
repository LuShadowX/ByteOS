// System Monitor: live processes, OS architecture and kernel types, OS types, boot process, OS functions + CPU scheduling.

import { h, s, tabs, table, note } from '../core/ui.js';
import { bus } from '../core/store.js';
import { processes, killByPid } from '../core/wm.js';

/* ---------------- processes ---------------- */

const SYSTEM = [
    [1, 'systemd', 'root', 'init: parent of every process'],
    [2, 'kthreadd', 'root', 'kernel thread manager'],
    [214, 'systemd-journald', 'root', 'collects logs'],
    [388, 'NetworkManager', 'root', 'Wi-Fi and Ethernet'],
    [412, 'sshd', 'root', 'remote login server'],
    [431, 'nftables', 'root', 'firewall'],
    [702, 'byteos-desktop', 'lukshya', 'draws the desktop and taskbar']
];

function procs(panel, { session }) {
    const cpu = new Map();
    const history = { cpu: [], mem: [] };
    const body = h('tbody');
    const canvas = h('canvas', { width: 600, height: 120, class: 'spark' });
    const totals = h('div', { class: 'grid-4' });

    const sample = (pid, base) => {
        const prev = cpu.get(pid) ?? base;
        const next = Math.max(0, Math.min(base * 4 + 2, prev + (Math.random() - 0.5) * base));
        cpu.set(pid, next);
        return next;
    };

    const draw = () => {
        const ctx = canvas.getContext('2d');
        const { width: w, height: ht } = canvas;
        ctx.clearRect(0, 0, w, ht);
        ctx.strokeStyle = '#e3e6ee';
        for (let y = 0; y <= 4; y++) { ctx.beginPath(); ctx.moveTo(0, (y * ht) / 4); ctx.lineTo(w, (y * ht) / 4); ctx.stroke(); }
        const line = (data, color) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            data.forEach((v, i) => { const x = w - (data.length - 1 - i) * (w / 59); const y = ht - (v / 100) * ht; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
            ctx.stroke();
        };
        line(history.mem, '#00a389');
        line(history.cpu, '#ef6c00');
    };

    const render = () => {
        const gui = processes().map(p => [p.pid, p.name, session.user, p.title, p.minimized]);
        const rows = [...SYSTEM.map(([pid, name, user, what]) => [pid, name, user, what, false, 0.3]), ...gui.map(([pid, name, user, title, min]) => [pid, name, user, `window: ${title}`, min, 2.2])];
        let cpuTotal = 0;
        let memTotal = 0;
        body.replaceChildren(...rows.map(([pid, name, user, what, min, base]) => {
            const c = min ? 0 : sample(pid, base);
            const mem = pid < 1000 ? 12 + (pid % 40) : 60 + (pid % 7) * 18;
            cpuTotal += c;
            memTotal += mem;
            return h('tr', {},
                h('td', { class: 'mono' }, pid), h('th', { scope: 'row' }, name), h('td', {}, user),
                h('td', {}, h('span', { class: `badge ${min ? 'badge--warn' : c > 1 ? 'badge--good' : 'badge--info'}` }, min ? 'stopped' : c > 1 ? 'running' : 'sleeping')),
                h('td', { class: 'mono' }, `${c.toFixed(1)}%`), h('td', { class: 'mono' }, `${mem} MB`), h('td', { class: 'muted' }, what),
                h('td', {}, pid >= 1000 ? h('button', { type: 'button', class: 'btn btn--sm btn--ghost', onClick: () => killByPid(pid) }, 'End task') : h('span', { class: 'muted', title: 'System processes are protected' }, '🔒')));
        }));
        history.cpu.push(Math.min(100, cpuTotal * 3 + 4));
        history.mem.push(Math.min(100, (memTotal / 8192) * 100 + 20));
        if (history.cpu.length > 60) { history.cpu.shift(); history.mem.shift(); }
        totals.replaceChildren(
            h('div', { class: 'stat' }, h('span', {}, 'Processes'), h('b', {}, rows.length)),
            h('div', { class: 'stat' }, h('span', { style: { color: '#ef6c00' } }, '● CPU'), h('b', {}, `${history.cpu.at(-1).toFixed(0)}%`)),
            h('div', { class: 'stat' }, h('span', { style: { color: '#00a389' } }, '● Memory'), h('b', {}, `${(memTotal / 1024 + 1.6).toFixed(1)} / 8 GB`)),
            h('div', { class: 'stat' }, h('span', {}, 'Uptime'), h('b', {}, `${Math.max(1, Math.round(performance.now() / 60000))} min`)));
        draw();
    };

    const timer = setInterval(render, 1500);
    const off = bus.on('wm:change', render);
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Processes'), h('p', {}, 'A process is a program that is running. Every window you open gets a PID (process ID). The OS shares the CPU between them. Open or close apps and watch this list change.'))),
        totals, h('div', { class: 'svg-box', style: { padding: '8px' } }, canvas),
        h('table', { class: 'data' }, h('thead', {}, h('tr', {}, ['PID', 'Name', 'User', 'State', 'CPU', 'Memory', 'What it does', ''].map(t => h('th', {}, t)))), body),
        note('Process states: running (using the CPU now), sleeping (waiting for input or a timer), stopped (paused, like a minimised window here).'));
    render();
    return { cleanup: () => { clearInterval(timer); off(); } };
}

/* ---------------- kernel ---------------- */

const KERNELS = {
    monolithic: {
        name: 'Monolithic kernel', examples: 'Linux, older Unix, MS-DOS',
        inKernel: ['File systems', 'Device drivers', 'Memory manager', 'Scheduler', 'Networking', 'IPC'], user: ['Apps', 'Shell'],
        pros: 'Very fast: everything talks inside one program.', cons: 'One buggy driver can crash the whole system. Large and complex.'
    },
    micro: {
        name: 'Microkernel', examples: 'MINIX, QNX (cars), seL4',
        inKernel: ['Scheduler', 'IPC', 'Basic memory'], user: ['Apps', 'Shell', 'File system server', 'Driver servers', 'Network server'],
        pros: 'Stable and secure: a crashed driver is just restarted.', cons: 'Slower, because services must pass messages to each other.'
    },
    hybrid: {
        name: 'Hybrid kernel', examples: 'Windows NT/10/11, macOS (XNU)',
        inKernel: ['Scheduler', 'IPC', 'Memory manager', 'Some drivers', 'File systems'], user: ['Apps', 'Shell', 'Some services'],
        pros: 'Balances speed and modularity.', cons: 'Inherits some complexity of both.'
    },
    exo: {
        name: 'Exokernel', examples: 'MIT Exokernel (research)',
        inKernel: ['Resource protection only'], user: ['Apps', 'Library OS (apps manage hardware themselves)'],
        pros: 'Apps get almost direct hardware access, very flexible and fast.', cons: 'Hard to program. Mostly research, not common in products.'
    }
};

function kernel(panel) {
    const diagram = h('div', { class: 'svg-box' });
    const info = h('div', { class: 'card' });
    const seg = h('div', { class: 'seg' });
    const show = (id) => {
        const k = KERNELS[id];
        [...seg.children].forEach(b => b.setAttribute('aria-pressed', b.dataset.id === id));
        const box = (x, y, w, label, cls) => s('g', {}, s('rect', { x, y, width: w, height: 30, rx: 7, class: cls }), s('text', { x: x + w / 2, y: y + 20, 'text-anchor': 'middle', class: 'k-text' }, label));
        const userW = 580 / k.user.length;
        const kernW = 580 / k.inKernel.length;
        diagram.replaceChildren(s('svg', { viewBox: '0 0 620 250', role: 'img', 'aria-label': `${k.name} diagram` },
            s('rect', { x: 10, y: 10, width: 600, height: 70, rx: 10, class: 'k-space-user' }),
            s('text', { x: 22, y: 28, class: 'k-space-label' }, 'USER SPACE (unprivileged)'),
            ...k.user.map((label, i) => box(20 + i * userW, 38, userW - 8, label, 'k-user')),
            s('rect', { x: 10, y: 95, width: 600, height: 80, rx: 10, class: 'k-space-kernel' }),
            s('text', { x: 22, y: 113, class: 'k-space-label' }, 'KERNEL SPACE (privileged, full hardware access)'),
            ...k.inKernel.map((label, i) => box(20 + i * kernW, 128, kernW - 8, label, 'k-kernel')),
            s('rect', { x: 10, y: 190, width: 600, height: 48, rx: 10, class: 'k-hw' }),
            s('text', { x: 310, y: 219, 'text-anchor': 'middle', class: 'k-text' }, 'Hardware: CPU · RAM · disks · network · devices')));
        info.replaceChildren(h('h3', {}, k.name), h('p', {}, h('b', {}, 'Examples: '), k.examples), h('p', { class: 'note note--good' }, '+ ', k.pros), h('p', { class: 'note note--bad' }, '− ', k.cons));
    };
    Object.entries(KERNELS).forEach(([id, k]) => seg.append(h('button', { type: 'button', dataset: { id }, onClick: () => show(id) }, k.name.replace(' kernel', ''))));

    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Operating system architecture'), h('p', {}, 'The OS sits between your apps and the hardware. Its core is the kernel: the only software allowed to touch hardware directly. Apps ask it for things through system calls.'))),
        h('div', { class: 'os-layers' },
            ...[['Applications', 'Chrome, VS Code, games', '#2f6fed'], ['Shell / GUI', 'bash, the desktop you are using', '#00a389'], ['System calls', 'open(), read(), fork() — the doorway into the kernel', '#7c4dff'], ['Kernel', 'process, memory, file and device management', '#ef6c00'], ['Hardware', 'CPU, RAM, disk, network card', '#4a5165']]
                .map(([name, text, color]) => h('div', { class: 'os-layer', style: { '--c': color } }, h('b', {}, name), h('span', {}, text)))),
        h('h4', {}, 'Types of kernels'), seg, h('div', { class: 'split', style: { marginTop: '12px' } }, diagram, info));
    show('monolithic');
}

/* ---------------- OS types ---------------- */

const OS_TYPES = [
    ['Batch', 'Jobs are collected and run one after another with no user interaction.', 'Payroll and bank statements processed overnight'],
    ['Time-sharing (multitasking)', 'The CPU switches between users/programs so fast that everyone seems to run at once.', 'Linux, Windows, macOS, old mainframe terminals'],
    ['Distributed', 'Many computers work together and look like one system to the user.', 'Google search, Hadoop clusters'],
    ['Network (NOS)', 'Manages shared files, printers and users over a network.', 'Windows Server, Linux file servers'],
    ['Real-time (RTOS)', 'Must respond within a strict deadline. Hard RTOS: a missed deadline is a failure. Soft: it degrades.', 'Airbags, pacemakers (hard); video streaming (soft)'],
    ['Mobile / embedded', 'Built for small devices with limited power and touch input.', 'Android, iOS, smart TVs, washing machines']
];

const SCENARIOS = [
    ['A car\'s airbag must open within 30 milliseconds of a crash.', 'Real-time (RTOS)'],
    ['A bank processes all of today\'s cheques at 2 AM with nobody watching.', 'Batch'],
    ['A college lab server shares files and printers with 60 PCs.', 'Network (NOS)'],
    ['A search engine spreads every query across thousands of machines.', 'Distributed'],
    ['You listen to music while coding and chatting on one laptop.', 'Time-sharing (multitasking)']
];

function osTypes(panel) {
    let i = 0;
    let score = 0;
    const box = h('div', { class: 'card' });
    const ask = () => {
        if (i >= SCENARIOS.length) {
            box.replaceChildren(h('h3', {}, `You scored ${score} / ${SCENARIOS.length}`), h('button', { type: 'button', class: 'btn', onClick: () => { i = 0; score = 0; ask(); } }, 'Try again'));
            return;
        }
        const [text, answer] = SCENARIOS[i];
        box.replaceChildren(h('small', { class: 'muted' }, `Scenario ${i + 1} of ${SCENARIOS.length}`), h('h3', {}, text),
            ...OS_TYPES.slice(0, 5).map(([name]) => h('button', { type: 'button', class: 'quiz-option', onClick: e => {
                const right = name === answer;
                if (right) score++;
                e.target.classList.add(right ? 'is-right' : 'is-wrong');
                box.querySelectorAll('.quiz-option').forEach(b => { b.disabled = true; if (b.textContent === answer) b.classList.add('is-right'); });
                setTimeout(() => { i++; ask(); }, 1300);
            } }, name)));
    };
    ask();
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Types of operating systems'), h('p', {}, 'Different jobs need different kinds of OS.'))),
        table(['Type', 'How it works', 'Example'], OS_TYPES),
        h('h4', {}, 'Which OS type fits?'), box);
}

/* ---------------- boot ---------------- */

const BOOT = [
    ['Power on', 'The power supply stabilises and the CPU starts executing code at a fixed address in the firmware chip.'],
    ['BIOS / UEFI + POST', 'Firmware runs the Power-On Self-Test: checks CPU, RAM, keyboard and disks. Beeps or errors appear here if hardware is broken.'],
    ['Find a boot device', 'Firmware follows the boot order (SSD, USB, network) and reads the first sector (MBR) or the EFI partition (GPT).'],
    ['Bootloader (GRUB)', 'A small program that shows the OS menu, then loads the chosen kernel and initial RAM disk into memory.'],
    ['Kernel', 'Decompresses itself, detects hardware, loads drivers, mounts the root file system and starts PID 1.'],
    ['init / systemd (PID 1)', 'Starts services in order: logging, networking, firewall, SSH, then the display manager.'],
    ['Login', 'You sign in. Your session and desktop start under your user account with your permissions.']
];

function bootTab(panel) {
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'The boot process'), h('p', {}, 'What happens between pressing the power button and seeing the desktop. ByteOS actually follows these steps when it starts.'))),
        h('ol', { class: 'timeline' }, BOOT.map(([name, text], i) => h('li', {}, h('b', {}, `${i + 1}. ${name}`), h('p', {}, text)))),
        h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', onClick: () => document.querySelector('#power-menu [data-action="restart"]').click() }, 'Restart ByteOS and watch it boot')),
        h('h4', {}, 'MBR vs GPT'),
        table(['', 'MBR (old)', 'GPT (modern)'], [['Firmware', 'BIOS', 'UEFI'], ['Max disk size', '2 TB', '9.4 ZB (practically unlimited)'], ['Partitions', '4 primary', '128'], ['Backup of partition table', 'No', 'Yes']]));
}

/* ---------------- functions + scheduling ---------------- */

const FUNCTIONS = [
    ['Process management', 'Creates, schedules and ends processes. Shares the CPU fairly.'],
    ['Memory management', 'Gives each process its own RAM, and uses virtual memory when RAM is full.'],
    ['File management', 'Organises files in folders, controls who can read or write them.'],
    ['Device management', 'Talks to hardware through drivers. Queues jobs for the printer, disk, etc.'],
    ['Security and access', 'Logins, user accounts, permissions and the firewall.'],
    ['User interface', 'The shell (command line) and the GUI (windows, icons, menus).'],
    ['Networking', 'Connects to other computers and the internet.'],
    ['Error detection', 'Detects hardware and software faults and logs them.']
];

function schedule(procs, algo, quantum) {
    const list = procs.map((p, i) => ({ ...p, id: `P${i + 1}`, left: p.burst }));
    const segments = [];
    let time = 0;
    const done = {};
    const push = (id, start, end) => {
        const last = segments.at(-1);
        if (last && last.id === id && last.end === start) last.end = end;
        else segments.push({ id, start, end });
    };

    if (algo === 'rr') {
        const queue = [];
        const arrived = new Set();
        const admit = () => list.filter(p => p.arrival <= time && !arrived.has(p.id)).sort((a, b) => a.arrival - b.arrival).forEach(p => { arrived.add(p.id); queue.push(p); });
        admit();
        while (Object.keys(done).length < list.length) {
            if (!queue.length) {
                const next = Math.min(...list.filter(p => !arrived.has(p.id)).map(p => p.arrival));
                push('idle', time, next);
                time = next;
                admit();
                continue;
            }
            const p = queue.shift();
            const run = Math.min(quantum, p.left);
            push(p.id, time, time + run);
            time += run;
            p.left -= run;
            admit();
            if (p.left > 0) queue.push(p); else done[p.id] = time;
        }
    } else {
        const pending = [...list];
        while (pending.length) {
            const ready = pending.filter(p => p.arrival <= time);
            if (!ready.length) {
                const next = Math.min(...pending.map(p => p.arrival));
                push('idle', time, next);
                time = next;
                continue;
            }
            const p = algo === 'sjf' ? ready.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival)[0] : ready.sort((a, b) => a.arrival - b.arrival)[0];
            push(p.id, time, time + p.burst);
            time += p.burst;
            done[p.id] = time;
            pending.splice(pending.indexOf(p), 1);
        }
    }
    const stats = list.map(p => ({ id: p.id, arrival: p.arrival, burst: p.burst, finish: done[p.id], turnaround: done[p.id] - p.arrival, waiting: done[p.id] - p.arrival - p.burst }));
    return { segments, stats };
}

function functionsTab(panel) {
    const state = { algo: 'rr', quantum: 2, procs: [{ arrival: 0, burst: 5 }, { arrival: 1, burst: 3 }, { arrival: 2, burst: 8 }, { arrival: 3, burst: 2 }] };
    const colors = ['#2f6fed', '#00a389', '#ef6c00', '#d81b60', '#7c4dff', '#6d4c41'];
    const rowsEl = h('tbody');
    const gantt = h('div', { class: 'gantt' });
    const result = h('div');
    const algoSeg = h('div', { class: 'seg' }, [['fcfs', 'FCFS'], ['sjf', 'SJF'], ['rr', 'Round Robin']].map(([id, label]) => h('button', { type: 'button', dataset: { id }, onClick: () => { state.algo = id; render(); } }, label)));
    const q = h('input', { type: 'number', class: 'input', min: 1, max: 6, value: state.quantum, style: { width: '70px' }, onInput: e => { state.quantum = Math.max(1, Number(e.target.value) || 1); render(); } });

    const render = () => {
        [...algoSeg.children].forEach(b => b.setAttribute('aria-pressed', b.dataset.id === state.algo));
        q.disabled = state.algo !== 'rr';
        rowsEl.replaceChildren(...state.procs.map((p, i) => h('tr', {},
            h('th', { scope: 'row' }, h('span', { class: 'dot', style: { background: colors[i] } }), `P${i + 1}`),
            ...['arrival', 'burst'].map(key => h('td', {}, h('input', { type: 'number', class: 'input', min: key === 'burst' ? 1 : 0, max: 20, value: p[key], style: { width: '80px' }, 'aria-label': `P${i + 1} ${key}`, onChange: e => { p[key] = Math.max(key === 'burst' ? 1 : 0, Number(e.target.value) || 0); render(); } }))),
            h('td', {}, state.procs.length > 2 ? h('button', { type: 'button', class: 'btn btn--sm btn--ghost', onClick: () => { state.procs.splice(i, 1); render(); } }, 'Remove') : null))));
        const { segments, stats } = schedule(state.procs, state.algo, state.quantum);
        const end = segments.at(-1).end;
        gantt.replaceChildren(...segments.map(seg => h('div', { class: `gantt__seg${seg.id === 'idle' ? ' is-idle' : ''}`, style: { flex: seg.end - seg.start, background: seg.id === 'idle' ? '' : colors[Number(seg.id.slice(1)) - 1] } },
            h('b', {}, seg.id === 'idle' ? 'idle' : seg.id), h('small', {}, seg.start))), h('small', { class: 'gantt__end' }, end));
        const avg = (key) => (stats.reduce((sum, st) => sum + st[key], 0) / stats.length).toFixed(2);
        result.replaceChildren(
            table(['Process', 'Arrival', 'Burst', 'Finish', 'Turnaround (finish − arrival)', 'Waiting (turnaround − burst)'], stats.map(st => [st.id, st.arrival, st.burst, st.finish, st.turnaround, st.waiting])),
            h('div', { class: 'grid-3', style: { marginTop: '10px' } },
                h('div', { class: 'stat' }, h('span', {}, 'Average waiting time'), h('b', {}, avg('waiting'))),
                h('div', { class: 'stat' }, h('span', {}, 'Average turnaround'), h('b', {}, avg('turnaround'))),
                h('div', { class: 'stat' }, h('span', {}, 'Context switches'), h('b', {}, Math.max(0, segments.filter(sg => sg.id !== 'idle').length - 1)))));
    };

    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Functions of an operating system'), h('p', {}, 'Everything the OS does for you behind the scenes.'))),
        h('div', { class: 'info-cards' }, FUNCTIONS.map(([name, text]) => h('div', { class: 'info-card' }, h('h4', {}, name), h('p', {}, text)))),
        h('h4', {}, 'Process management in action: CPU scheduling'),
        h('p', { class: 'muted' }, 'One CPU, several processes. The scheduler decides who runs when. Change the numbers and compare the algorithms.'),
        h('div', { class: 'row' }, algoSeg, h('label', { class: 'row' }, 'Time quantum', q), h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onClick: () => { if (state.procs.length < 6) { state.procs.push({ arrival: state.procs.length, burst: 3 }); render(); } } }, '+ Add process')),
        h('table', { class: 'data', style: { margin: '10px 0' } }, h('thead', {}, h('tr', {}, ['Process', 'Arrival time', 'Burst time', ''].map(t => h('th', {}, t)))), rowsEl),
        h('h4', {}, 'Gantt chart'), gantt, result,
        note('FCFS: first come, first served. SJF: shortest job first (lowest average waiting time). Round Robin: everyone gets a slice of time in turn, which is how time-sharing systems feel responsive.'));
    render();
}

export function mount(body, { args, session }) {
    const cleanups = [];
    const view = tabs([
        { id: 'procs', label: 'Processes', render: (p) => cleanups.push(procs(p, { session }).cleanup) },
        { id: 'kernel', label: 'Architecture & kernels', render: kernel },
        { id: 'ostypes', label: 'Types of OS', render: osTypes },
        { id: 'boot', label: 'Boot process', render: bootTab },
        { id: 'functions', label: 'OS functions & scheduling', render: functionsTab }
    ], { app: 'monitor' });
    body.append(view.el);
    if (args?.tab) view.show(args.tab);
    return { cleanup: () => cleanups.forEach(fn => fn?.()), onArgs: (a) => a?.tab && view.show(a.tab) };
}
