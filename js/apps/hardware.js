// Inside the Computer: computer basics, block diagram + instruction cycle, memory, storage, CPU vs GPU, ports, RAID.

import { h, s, tabs, table, note, sleep } from '../core/ui.js';

/* ---------------- basics ---------------- */

const GENERATIONS = [
    ['1st', '1940–1956', 'Vacuum tubes', 'ENIAC filled a room, used 18,000 tubes and was programmed by rewiring. Machine language only.'],
    ['2nd', '1956–1963', 'Transistors', 'Smaller, cooler, more reliable. Assembly language and early FORTRAN and COBOL.'],
    ['3rd', '1964–1971', 'Integrated circuits', 'Many transistors on one chip. Keyboards, monitors and the first operating systems.'],
    ['4th', '1971–today', 'Microprocessors', 'A whole CPU on one chip (Intel 4004). Personal computers, laptops, the internet.'],
    ['5th', 'Today →', 'AI and parallel computing', 'GPUs, multi-core chips and AI accelerators. Machines that learn from data.']
];

const TYPES = [
    ['Supercomputer', 'Weather forecasting, nuclear and climate simulation', 'PARAM Siddhi-AI (India), Frontier (USA)'],
    ['Mainframe', 'Thousands of users at once: banks, airlines, railways', 'IBM z16 running IRCTC-style bookings'],
    ['Minicomputer / server', 'Serves a company or website', 'A rack server in a data centre'],
    ['Microcomputer', 'One person at a time', 'Desktop PC, laptop'],
    ['Mobile', 'Computing in your pocket', 'Smartphones, tablets'],
    ['Embedded', 'A computer hidden inside another device', 'Washing machine, car engine control, smart TV']
];

const CHARACTERISTICS = [
    ['Speed', 'Billions of instructions per second.'],
    ['Accuracy', 'Errors come from wrong input or bugs, not the hardware ("garbage in, garbage out").'],
    ['Diligence', 'Never gets tired or bored, the millionth task is done as well as the first.'],
    ['Versatility', 'The same machine edits video, runs games and controls robots.'],
    ['Storage', 'Keeps huge amounts of data and recalls it instantly.'],
    ['No IQ', 'It only follows instructions. It cannot decide what is right on its own.']
];

const SORT_ITEMS = [
    ['Keyboard', 'hardware'], ['Linux', 'software'], ['RAM stick', 'hardware'], ['Google Chrome', 'software'],
    ['Printer', 'hardware'], ['Compiler', 'software'], ['SSD', 'hardware'], ['Device driver', 'software'],
    ['Graphics card', 'hardware'], ['Antivirus', 'software']
];

function basics(panel) {
    const timeline = h('div', { class: 'gen-line' });
    const detail = h('p', { class: 'note' });
    const pick = (i) => {
        [...timeline.children].forEach((el, j) => el.classList.toggle('is-on', i === j));
        const [gen, years, tech, text] = GENERATIONS[i];
        detail.replaceChildren(h('strong', {}, `${gen} generation (${years}): ${tech}. `), text);
    };
    GENERATIONS.forEach(([gen, years, tech], i) => timeline.append(h('button', { type: 'button', class: 'gen-step', onClick: () => pick(i) }, h('b', {}, gen), h('span', {}, tech), h('small', {}, years))));
    pick(3);

    // hardware vs software sorting game
    const answers = new Map();
    const board = h('div', { class: 'sorter' });
    const result = h('p', { class: 'muted' }, 'Click an item to switch it between the two boxes, then check.');
    const renderBoard = () => {
        const box = (kind) => h('div', { class: 'sorter__box' }, h('h4', {}, kind === 'hardware' ? 'Hardware (you can touch it)' : 'Software (instructions)'),
            h('div', { class: 'row' }, SORT_ITEMS.filter(([name]) => answers.get(name) === kind).map(([name]) => h('button', { type: 'button', class: 'chip sorter__item', onClick: () => { answers.set(name, kind === 'hardware' ? 'software' : 'hardware'); renderBoard(); } }, name))));
        const unsorted = SORT_ITEMS.filter(([name]) => !answers.has(name));
        board.replaceChildren(
            h('div', { class: 'row sorter__pool' }, unsorted.length ? unsorted.map(([name]) => h('button', { type: 'button', class: 'chip sorter__item', onClick: () => { answers.set(name, 'hardware'); renderBoard(); } }, name)) : h('span', { class: 'muted' }, 'All items placed.')),
            h('div', { class: 'grid-2' }, box('hardware'), box('software')));
    };
    renderBoard();
    const check = h('button', { type: 'button', class: 'btn', onClick: () => {
        const right = SORT_ITEMS.filter(([name, kind]) => answers.get(name) === kind).length;
        result.className = right === SORT_ITEMS.length ? 'note note--good' : 'note note--warn';
        result.textContent = right === SORT_ITEMS.length
            ? 'All 10 correct! Hardware is the physical machine; software is the set of instructions that tells it what to do.'
            : `${right} of ${SORT_ITEMS.length} correct. Hint: a driver and a compiler are programs, so they are software.`;
    } }, 'Check');

    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'What is a computer?'), h('p', {}, 'An electronic machine that takes input, processes it with stored instructions, stores data and produces output. Here is how computers got here, and the kinds that exist today.'))),
        h('h4', {}, 'Evolution: five generations'), timeline, detail,
        h('h4', {}, 'Characteristics'),
        h('div', { class: 'info-cards' }, CHARACTERISTICS.map(([name, text]) => h('div', { class: 'info-card' }, h('h4', {}, name), h('p', {}, text)))),
        h('h4', {}, 'Types of computers'),
        table(['Type', 'Used for', 'Example'], TYPES),
        h('h4', {}, 'Input and output devices'),
        h('div', { class: 'grid-3' },
            h('div', { class: 'card' }, h('h3', {}, 'Input'), h('p', { class: 'muted' }, 'Keyboard, mouse, touchpad, scanner, microphone, webcam, joystick, barcode reader, biometric sensor')),
            h('div', { class: 'card' }, h('h3', {}, 'Output'), h('p', { class: 'muted' }, 'Monitor, printer, speakers, headphones, projector, plotter')),
            h('div', { class: 'card' }, h('h3', {}, 'Both'), h('p', { class: 'muted' }, 'Touchscreen, network card, external drive, headset with mic, modem'))),
        h('h4', {}, 'Hardware or software? Sort them'), board, h('div', { class: 'row' }, check), result);
}

/* ---------------- block diagram + instruction cycle ---------------- */

const UNITS = {
    input: ['Input unit', 'Takes data from devices like the keyboard, mouse or scanner and converts it into binary the computer understands.'],
    cu: ['Control unit (CU)', 'The manager of the CPU. It fetches instructions from memory, decodes them and sends control signals telling every other part what to do.'],
    alu: ['Arithmetic logic unit (ALU)', 'Does the actual work: arithmetic (+ − × ÷) and logic (AND, OR, NOT, comparisons).'],
    reg: ['Registers', 'Tiny, extremely fast storage inside the CPU. PC holds the next instruction\'s address, IR holds the current instruction, R1/R2 hold data.'],
    memory: ['Memory unit', 'Primary memory (RAM) holds the running program and its data. It is fast but volatile: it forgets everything when power goes off.'],
    storage: ['Secondary storage', 'SSD or HDD. Slower than RAM but permanent. Programs are loaded from here into RAM before they run.'],
    output: ['Output unit', 'Turns binary results back into something people use: pixels on a monitor, sound, printed pages.'],
    bus: ['System bus', 'The wires connecting everything. The address bus says WHERE, the data bus carries WHAT, and the control bus says read or write.']
};

const PROGRAM = [
    { addr: 100, text: 'LOAD R1, 5' },
    { addr: 101, text: 'LOAD R2, 3' },
    { addr: 102, text: 'ADD R1, R2' },
    { addr: 103, text: 'STORE R1, [200]' },
    { addr: 104, text: 'OUT [200]' }
];

function cycleSteps() {
    const steps = [];
    const regs = { PC: 100, IR: '—', R1: 0, R2: 0 };
    const mem = { 200: '—' };
    const push = (phase, units, text, change = () => {}) => { change(); steps.push({ phase, units, text, regs: { ...regs }, mem: { ...mem } }); };
    push('Start', ['input'], 'You typed a program "A = 5 + 3". It was compiled into 5 machine instructions and loaded into RAM at addresses 100–104. PC points at 100.');
    for (const ins of PROGRAM) {
        push('Fetch', ['cu', 'bus', 'memory', 'reg'], `CU puts PC=${ins.addr} on the address bus. RAM sends back "${ins.text}" on the data bus into IR. PC becomes ${ins.addr + 1}.`, () => { regs.IR = ins.text; regs.PC = ins.addr + 1; });
        push('Decode', ['cu'], `CU decodes "${ins.text}": ${ins.text.startsWith('LOAD') ? 'put a number into a register' : ins.text.startsWith('ADD') ? 'ask the ALU to add two registers' : ins.text.startsWith('STORE') ? 'copy a register into RAM' : 'send a memory value to the output unit'}.`);
        if (ins.text === 'LOAD R1, 5') push('Execute', ['reg'], 'R1 ← 5', () => { regs.R1 = 5; });
        if (ins.text === 'LOAD R2, 3') push('Execute', ['reg'], 'R2 ← 3', () => { regs.R2 = 3; });
        if (ins.text === 'ADD R1, R2') push('Execute', ['alu', 'reg'], 'ALU adds R1 + R2 = 8 and writes the result back into R1.', () => { regs.R1 = 8; });
        if (ins.text.startsWith('STORE')) push('Execute', ['reg', 'bus', 'memory'], 'R1 (8) travels over the data bus into RAM address 200.', () => { mem[200] = 8; });
        if (ins.text.startsWith('OUT')) push('Execute', ['memory', 'bus', 'output'], 'RAM address 200 is sent to the output unit. The screen shows: A = 8', () => {});
    }
    return steps;
}

function blockDiagram(panel) {
    const info = h('div', { class: 'card' });
    const box = (id, x, y, w, ht, label, sub) => s('g', { class: 'bd-unit', 'data-unit': id, tabindex: 0, role: 'button', 'aria-label': UNITS[id][0], onClick: () => select(id), onKeydown: e => { if (e.key === 'Enter') select(id); } },
        s('rect', { x, y, width: w, height: ht, rx: 10 }),
        s('text', { x: x + w / 2, y: y + ht / 2 - (sub ? 6 : -4), 'text-anchor': 'middle', class: 'bd-label' }, label),
        sub ? s('text', { x: x + w / 2, y: y + ht / 2 + 13, 'text-anchor': 'middle', class: 'bd-sub' }, sub) : null);

    const svg = s('svg', { viewBox: '0 0 720 360', role: 'img', 'aria-label': 'Block diagram of a computer' },
        s('defs', {}, s('marker', { id: 'bd-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, s('path', { d: 'M0 0L10 5L0 10z', fill: '#7b8296' }))),
        s('rect', { x: 200, y: 20, width: 320, height: 200, rx: 14, class: 'bd-cpu' }),
        s('text', { x: 360, y: 42, 'text-anchor': 'middle', class: 'bd-cpu-label' }, 'CPU (Central Processing Unit)'),
        box('cu', 220, 56, 280, 50, 'Control Unit', 'fetch · decode · signal'),
        box('alu', 220, 120, 130, 80, 'ALU', '+ − × ÷  AND OR'),
        box('reg', 366, 120, 134, 80, 'Registers', 'PC · IR · R1 · R2'),
        box('input', 20, 80, 150, 70, 'Input unit', 'keyboard, mouse'),
        box('output', 550, 80, 150, 70, 'Output unit', 'monitor, printer'),
        box('memory', 200, 260, 150, 70, 'Memory (RAM)', 'primary, volatile'),
        box('storage', 370, 260, 150, 70, 'Storage', 'SSD / HDD'),
        s('g', { class: 'bd-unit bd-busgroup', 'data-unit': 'bus', tabindex: 0, role: 'button', 'aria-label': 'System bus', onClick: () => select('bus') },
            s('rect', { x: 200, y: 232, width: 320, height: 16, rx: 8 }),
            s('text', { x: 360, y: 244, 'text-anchor': 'middle', class: 'bd-sub' }, 'system bus: address · data · control')),
        s('path', { d: 'M170 115 H198', class: 'bd-arrow', 'marker-end': 'url(#bd-arrow)' }),
        s('path', { d: 'M522 115 H548', class: 'bd-arrow', 'marker-end': 'url(#bd-arrow)' }),
        s('path', { d: 'M275 222 V230 M275 250 V258', class: 'bd-arrow', 'marker-start': 'url(#bd-arrow)', 'marker-end': 'url(#bd-arrow)' }),
        s('path', { d: 'M445 222 V230 M445 250 V258', class: 'bd-arrow', 'marker-start': 'url(#bd-arrow)', 'marker-end': 'url(#bd-arrow)' }));

    const select = (id) => {
        svg.querySelectorAll('.bd-unit').forEach(g => g.classList.toggle('is-selected', g.dataset.unit === id));
        info.replaceChildren(h('h3', {}, UNITS[id][0]), h('p', {}, UNITS[id][1]));
    };
    select('cu');

    // instruction cycle player
    const steps = cycleSteps();
    let at = 0;
    let timer = null;
    const phase = h('span', { class: 'badge badge--info' });
    const text = h('p', { class: 'cycle__text' });
    const regsEl = h('div', { class: 'cycle__regs' });
    const progEl = h('ol', { class: 'cycle__prog' }, PROGRAM.map(ins => h('li', { dataset: { addr: ins.addr } }, h('code', {}, ins.addr), ' ', ins.text)));
    const render = () => {
        const step = steps[at];
        phase.textContent = `${step.phase} · step ${at + 1}/${steps.length}`;
        phase.className = `badge ${step.phase === 'Fetch' ? 'badge--info' : step.phase === 'Decode' ? 'badge--warn' : 'badge--good'}`;
        text.textContent = step.text;
        regsEl.replaceChildren(...Object.entries(step.regs).map(([k, v]) => h('div', { class: 'stat' }, h('span', {}, k), h('b', { class: 'mono' }, v))), h('div', { class: 'stat' }, h('span', {}, 'RAM[200]'), h('b', { class: 'mono' }, step.mem[200])));
        svg.querySelectorAll('.bd-unit').forEach(g => g.classList.toggle('is-active', step.units.includes(g.dataset.unit)));
        [...progEl.children].forEach(li => li.classList.toggle('is-current', step.regs.IR !== '—' && li.textContent.endsWith(step.regs.IR)));
    };
    const stop = () => { clearInterval(timer); timer = null; playBtn.textContent = 'Play'; };
    const next = () => { if (at < steps.length - 1) { at++; render(); } else stop(); };
    const playBtn = h('button', { type: 'button', class: 'btn', onClick: () => {
        if (timer) return stop();
        if (at === steps.length - 1) at = 0;
        playBtn.textContent = 'Pause';
        timer = setInterval(next, 1600);
    } }, 'Play');

    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Block diagram of a computer'), h('p', {}, 'Click any unit to learn what it does, then run a real instruction cycle and watch data move.'))),
        h('div', { class: 'split' }, h('div', { class: 'svg-box bd' }, svg), info),
        h('div', { class: 'card cycle' },
            h('div', { class: 'row' }, h('h3', { style: { margin: 0 } }, 'Fetch → decode → execute'), phase),
            h('div', { class: 'split' }, h('div', {}, text, regsEl), h('div', {}, h('small', { class: 'muted' }, 'Program in RAM'), progEl)),
            h('div', { class: 'row' },
                h('button', { type: 'button', class: 'btn btn--ghost', onClick: () => { stop(); at = Math.max(0, at - 1); render(); } }, '← Back'),
                playBtn,
                h('button', { type: 'button', class: 'btn btn--ghost', onClick: () => { stop(); next(); } }, 'Step →'),
                h('button', { type: 'button', class: 'btn btn--ghost', onClick: () => { stop(); at = 0; render(); } }, 'Reset'))));
    render();
    return { cleanup: stop };
}

/* ---------------- memory ---------------- */

const LEVELS = [
    ['Registers', '< 1 KB', '0.3 ns', '1 second', 'Inside the CPU core', 'volatile'],
    ['L1 cache', '32–64 KB', '1 ns', '3 seconds', 'Per core, SRAM', 'volatile'],
    ['L2 cache', '256 KB–2 MB', '3 ns', '9 seconds', 'Per core, SRAM', 'volatile'],
    ['L3 cache', '8–64 MB', '13 ns', '43 seconds', 'Shared by all cores', 'volatile'],
    ['RAM (main memory)', '8–64 GB', '100 ns', '6 minutes', 'DRAM sticks on the motherboard', 'volatile'],
    ['SSD', '256 GB–4 TB', '100 µs', '4 days', 'Flash memory, no moving parts', 'non-volatile'],
    ['HDD', '1–20 TB', '5 ms', '6 months', 'Spinning magnetic platters', 'non-volatile'],
    ['Cloud / tape backup', 'Unlimited', '50+ ms', '5+ years', 'Over the network', 'non-volatile']
];

function memory(panel) {
    const detail = h('div', { class: 'card' });
    const show = (i) => {
        const [name, size, latency, human, where, kind] = LEVELS[i];
        svg.querySelectorAll('.pyr').forEach((el, j) => el.classList.toggle('is-selected', i === j));
        detail.replaceChildren(h('h3', {}, name),
            table(['Property', 'Value'], [['Typical size', size], ['Access time', latency], ['If a register took 1 second…', human], ['Where', where], ['Keeps data without power?', kind === 'volatile' ? 'No (volatile)' : 'Yes (non-volatile)']]));
    };
    const svg = s('svg', { viewBox: '0 0 420 330', role: 'img', 'aria-label': 'Memory hierarchy pyramid' },
        ...LEVELS.map(([name], i) => {
            const y = 10 + i * 39;
            const half = 30 + i * 22;
            return s('g', { class: 'pyr', tabindex: 0, role: 'button', 'aria-label': name, onClick: () => show(i), onKeydown: e => { if (e.key === 'Enter') show(i); } },
                s('polygon', { points: `${210 - half},${y + 36} ${210 + half},${y + 36} ${210 + half - 22},${y} ${210 - half + 22},${y}`, style: `--i:${i}` }),
                s('text', { x: 210, y: y + 23, 'text-anchor': 'middle' }, name));
        }));
    show(4);
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Memory hierarchy'), h('p', {}, 'Top: tiny, fast, expensive. Bottom: huge, slow, cheap. Computers keep what they need right now near the top.'))),
        h('div', { class: 'split' }, h('div', { class: 'svg-box' }, svg, h('div', { class: 'pyr-axis' }, h('span', {}, '↑ faster, costlier per GB'), h('span', {}, '↓ bigger, cheaper'))), detail),
        h('h4', {}, 'Primary memory: RAM and ROM'),
        table(['Type', 'Full form', 'Volatile?', 'Used for'], [
            ['SRAM', 'Static RAM', 'Yes', 'CPU cache. Fast, uses 6 transistors per bit.'],
            ['DRAM', 'Dynamic RAM', 'Yes', 'Main memory. Needs constant refreshing.'],
            ['ROM', 'Read-Only Memory', 'No', 'Firmware written at the factory.'],
            ['PROM', 'Programmable ROM', 'No', 'Written once by the user.'],
            ['EPROM', 'Erasable PROM', 'No', 'Erased with ultraviolet light, then rewritten.'],
            ['EEPROM / Flash', 'Electrically Erasable PROM', 'No', 'BIOS/UEFI chips, SSDs, USB drives.']
        ]),
        note('RAM is like a desk: fast to grab things from, but cleared at the end of the day. Storage is like a cupboard: slower, but things stay there.'));
}

/* ---------------- storage ---------------- */

function storage(panel) {
    const hddTime = h('b', {}, '—');
    const ssdTime = h('b', {}, '—');
    const hddBar = h('span');
    const ssdBar = h('span');
    const platter = s('g', { class: 'platter' }, s('circle', { cx: 80, cy: 80, r: 70 }), s('circle', { cx: 80, cy: 80, r: 46, class: 'platter__track' }), s('circle', { cx: 80, cy: 80, r: 8 }), s('line', { x1: 80, y1: 80, x2: 80, y2: 14, class: 'platter__mark' }));
    const arm = s('line', { x1: 160, y1: 150, x2: 110, y2: 60, class: 'platter__arm' });
    const disk = s('svg', { viewBox: '0 0 170 160', class: 'hdd-svg', 'aria-hidden': 'true' }, platter, arm);
    const cells = h('div', { class: 'ssd-cells' }, Array.from({ length: 32 }, () => h('span')));
    let running = false;

    const run = async () => {
        if (running) return;
        running = true;
        const reads = 12;
        let hdd = 0;
        let ssd = 0;
        hddBar.style.width = ssdBar.style.width = '0%';
        platter.classList.add('is-spinning');
        for (let i = 0; i < reads; i++) {
            const seek = 4 + Math.random() * 8;
            const rotation = Math.random() * 8.3;
            hdd += seek + rotation;
            ssd += 0.08 + Math.random() * 0.04;
            arm.setAttribute('x2', 95 + Math.random() * 40);
            arm.setAttribute('y2', 40 + Math.random() * 60);
            cells.children[Math.floor(Math.random() * 32)].classList.add('is-hit');
            hddTime.textContent = `${hdd.toFixed(1)} ms`;
            ssdTime.textContent = `${ssd.toFixed(2)} ms`;
            hddBar.style.width = `${(hdd / 170) * 100}%`;
            ssdBar.style.width = `${Math.max(1, (ssd / 170) * 100)}%`;
            await sleep(260);
        }
        platter.classList.remove('is-spinning');
        [...cells.children].forEach(c => c.classList.remove('is-hit'));
        running = false;
    };

    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Secondary storage'), h('p', {}, 'Permanent storage that keeps data with the power off. The big question: spinning disk or flash?'))),
        h('div', { class: 'grid-2' },
            h('div', { class: 'card' }, h('h3', {}, 'HDD: moves a head over a spinning platter'), disk, h('div', { class: 'race' }, h('div', { class: 'meter' }, hddBar), hddTime)),
            h('div', { class: 'card' }, h('h3', {}, 'SSD: reads flash cells electronically'), cells, h('div', { class: 'race' }, h('div', { class: 'meter' }, ssdBar), ssdTime))),
        h('div', { class: 'row', style: { margin: '12px 0' } }, h('button', { type: 'button', class: 'btn', onClick: run }, 'Race: read 12 random files'), h('span', { class: 'muted' }, 'HDD time = seek + rotational delay for every file. SSD has no moving parts.')),
        table(['', 'HDD', 'SSD'], [
            ['How it stores data', 'Magnetic spinning platters', 'NAND flash chips'],
            ['Random read time', '5–15 ms', '0.05–0.15 ms'],
            ['Speed (sequential)', '100–200 MB/s', '500 MB/s (SATA) to 7,000 MB/s (NVMe)'],
            ['Noise, heat, power', 'Noisy, warmer, more power', 'Silent, cool, efficient'],
            ['Shock resistance', 'Fragile (moving parts)', 'Robust'],
            ['Cost per TB', 'Cheaper', 'More expensive'],
            ['Best for', 'Bulk storage, backups', 'OS, apps, laptops']
        ]),
        h('h4', {}, 'Classification of secondary storage'),
        h('div', { class: 'grid-3' },
            h('div', { class: 'card' }, h('h3', {}, 'Magnetic'), h('p', { class: 'muted' }, 'Hard disk drives, magnetic tape (still used for long-term backups).')),
            h('div', { class: 'card' }, h('h3', {}, 'Optical'), h('p', { class: 'muted' }, 'CD (700 MB), DVD (4.7 GB), Blu-ray (25–100 GB). Read with a laser.')),
            h('div', { class: 'card' }, h('h3', {}, 'Solid state'), h('p', { class: 'muted' }, 'SSD, USB pen drive, SD and microSD cards. Flash memory, no moving parts.'))));
}

/* ---------------- CPU vs GPU ---------------- */

function cpuGpu(panel) {
    const size = 48;
    const make = () => h('canvas', { width: size * 5, height: size * 5, class: 'paint' });
    const cpuCanvas = make();
    const gpuCanvas = make();
    const cpuTime = h('b', {}, '—');
    const gpuTime = h('b', {}, '—');
    let frame = 0;

    const paint = (canvas, workers, label, done) => {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#eceff6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        let next = 0;
        let ticks = 0;
        const total = size * size;
        const step = () => {
            for (let w = 0; w < workers && next < total; w++, next++) {
                const x = next % size;
                const y = Math.floor(next / size);
                const hue = 200 + (x / size) * 120 + Math.sin(y / 6) * 20;
                ctx.fillStyle = `hsl(${hue} 70% ${45 + (y / size) * 20}%)`;
                ctx.fillRect(x * 5, y * 5, 5, 5);
            }
            ticks++;
            label.textContent = `${ticks} clock ticks`;
            if (next < total) frame = requestAnimationFrame(step);
            else done?.();
        };
        step();
    };

    const run = () => {
        cancelAnimationFrame(frame);
        paint(cpuCanvas, 8, cpuTime);
        setTimeout(() => paint(gpuCanvas, 256, gpuTime), 0);
    };

    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'CPU vs GPU'), h('p', {}, 'Both are processors. A CPU has a few very smart cores, a GPU has thousands of simple ones. Here both shade the same 2,304-pixel image, one pixel per core per tick.'))),
        h('div', { class: 'grid-2' },
            h('div', { class: 'card center' }, h('h3', {}, 'CPU · 8 cores'), cpuCanvas, cpuTime),
            h('div', { class: 'card center' }, h('h3', {}, 'GPU · 256 cores'), gpuCanvas, gpuTime)),
        h('div', { class: 'row', style: { margin: '12px 0' } }, h('button', { type: 'button', class: 'btn', onClick: run }, 'Start painting')),
        table(['', 'CPU', 'GPU'], [
            ['Cores', '4–24 powerful cores', 'Thousands of small cores'],
            ['Good at', 'Complex logic, branching, one task fast', 'The same simple maths on lots of data at once'],
            ['Used for', 'Running the OS, apps, games logic', 'Graphics, video, AI training, crypto'],
            ['Analogy', 'A few professors', 'A stadium full of students doing sums']
        ]),
        note('This is why AI uses GPUs: training a neural network is millions of independent multiplications, perfect for thousands of cores.'));
    return { cleanup: () => cancelAnimationFrame(frame) };
}

/* ---------------- ports ---------------- */

const PORTS = [
    ['USB 2.0', 'wired', 0.48, 'Keyboards, mice, older pen drives'],
    ['USB 3.2 Gen 2', 'wired', 10, 'Fast pen drives, external SSDs'],
    ['USB-C / Thunderbolt 4', 'wired', 40, 'Laptops: charging, displays and data in one cable'],
    ['HDMI 2.1', 'wired', 48, 'TVs, monitors, projectors (video + audio)'],
    ['DisplayPort 2.1', 'wired', 80, 'High-refresh gaming monitors'],
    ['Ethernet (RJ-45)', 'wired', 1, 'Wired internet, LAN'],
    ['SATA III', 'wired', 6, 'Connects HDDs and SATA SSDs inside the PC'],
    ['PCIe 4.0 x4 (NVMe)', 'wired', 64, 'Fastest SSDs, plugged straight into the motherboard'],
    ['3.5 mm audio jack', 'wired', null, 'Headphones, speakers (analog signal)'],
    ['Wi-Fi 6', 'wireless', 9.6, 'Wireless networking (theoretical max)'],
    ['Bluetooth 5', 'wireless', 0.002, 'Earbuds, smartwatches, wireless mice'],
    ['NFC', 'wireless', 0.000424, 'Tap-to-pay, pairing (works within ~4 cm)'],
    ['Infrared (IR)', 'wireless', 0.000115, 'TV remotes (needs line of sight)']
];

function ports(panel) {
    const movie = 25 * 8; // 25 GB in gigabits
    const time = (gbps) => {
        if (!gbps) return '—';
        const sec = movie / gbps;
        if (sec < 60) return `${sec.toFixed(1)} s`;
        if (sec < 3600) return `${(sec / 60).toFixed(1)} min`;
        if (sec < 86400) return `${(sec / 3600).toFixed(1)} hours`;
        return `${(sec / 86400).toFixed(1)} days`;
    };
    const speed = (gbps) => (gbps == null ? 'analog' : gbps >= 1 ? `${gbps} Gbps` : gbps >= 0.001 ? `${(gbps * 1000).toFixed(0)} Mbps` : `${(gbps * 1e6).toFixed(0)} kbps`);
    const bar = (gbps) => h('div', { class: 'meter' }, h('span', { style: { '--v': gbps ? `${Math.max(2, (Math.log10(gbps * 1e6) / Math.log10(80e6)) * 100)}%` : '0%' } }));
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'PC connection interfaces'), h('p', {}, 'How devices plug into (or talk to) a computer. The last column shows how long copying a 25 GB 4K movie would take at full speed.'))),
        table(['Interface', 'Type', 'Max speed', 'Speed (log scale)', '25 GB movie', 'Used for'],
            PORTS.map(([name, type, gbps, use]) => [name, h('span', { class: `badge ${type === 'wired' ? 'badge--info' : 'badge--warn'}` }, type), speed(gbps), bar(gbps), time(gbps), use])),
        note('Real speeds are lower than these maximums because of protocol overhead, cable quality and the device itself.'));
}

/* ---------------- RAID ---------------- */

const RAID = {
    0: { name: 'RAID 0 · striping', min: 2, max: 6, text: 'Data is split across all disks. Fastest and uses 100% of space, but if ANY disk fails, everything is lost.' },
    1: { name: 'RAID 1 · mirroring', min: 2, max: 4, text: 'Every disk holds a full copy. Survives all but one disk failing, but you only get one disk of space.' },
    5: { name: 'RAID 5 · striping + parity', min: 3, max: 6, text: 'Data is striped and one parity block (XOR of the data) per stripe rotates across disks. Survives any ONE disk failure.' },
    6: { name: 'RAID 6 · double parity', min: 4, max: 6, text: 'Two parity blocks (P and Q) per stripe. Survives any TWO disk failures. Common in big storage servers.' },
    10: { name: 'RAID 10 · mirror + stripe', min: 4, max: 6, even: true, text: 'Disks are paired into mirrors, then data is striped across the pairs. Fast and safe: survives one failure in every pair.' }
};

// GF(2^8) multiply, used for RAID 6's Q parity
function gfMul(a, b) {
    let p = 0;
    for (let i = 0; i < 8; i++) {
        if (b & 1) p ^= a;
        const carry = a & 0x80;
        a = (a << 1) & 0xff;
        if (carry) a ^= 0x1d;
        b >>= 1;
    }
    return p;
}
const gfPow = (n) => { let r = 1; for (let i = 0; i < n; i++) r = gfMul(r, 2); return r; };

const toBytes = (text) => [...text].map(c => c.charCodeAt(0) & 0xff);
const hex = (bytes) => bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
const xor = (blocks) => blocks.reduce((acc, b) => acc.map((v, i) => v ^ (b[i] ?? 0)), [0, 0]);

function layout(level, n, blocks) {
    const disks = Array.from({ length: n }, () => []);
    const bytes = blocks.map(toBytes);
    if (level === 0) blocks.forEach((b, i) => disks[i % n].push({ kind: 'data', i, text: b }));
    if (level === 1) blocks.forEach((b, i) => disks.forEach(d => d.push({ kind: 'data', i, text: b })));
    if (level === 10) blocks.forEach((b, i) => { const pair = i % (n / 2); disks[pair * 2].push({ kind: 'data', i, text: b }); disks[pair * 2 + 1].push({ kind: 'data', i, text: b }); });
    if (level === 5 || level === 6) {
        const per = n - (level === 5 ? 1 : 2);
        for (let stripe = 0, i = 0; i < blocks.length; stripe++) {
            const group = [];
            for (let k = 0; k < per; k++, i++) group.push(i < blocks.length ? i : null);
            const pDisk = (n - 1 - (stripe % n) + n) % n;
            const qDisk = (pDisk + 1) % n;
            const dataBytes = group.map(idx => (idx == null ? [0, 0] : bytes[idx]));
            const p = xor(dataBytes);
            const q = dataBytes.reduce((acc, b, k) => acc.map((v, j) => v ^ gfMul(gfPow(k), b[j] ?? 0)), [0, 0]);
            let k = 0;
            for (let d = 0; d < n; d++) {
                if (d === pDisk) disks[d].push({ kind: 'parity', label: `P${stripe}`, text: hex(p), stripe });
                else if (level === 6 && d === qDisk) disks[d].push({ kind: 'parity', label: `Q${stripe}`, text: hex(q), stripe });
                else { const idx = group[k++]; disks[d].push(idx == null ? { kind: 'empty', stripe } : { kind: 'data', i: idx, text: blocks[idx], stripe }); }
            }
        }
    }
    return disks;
}

function survives(level, n, failed) {
    const f = failed.size;
    if (level === 0) return f === 0;
    if (level === 1) return f < n;
    if (level === 5) return f <= 1;
    if (level === 6) return f <= 2;
    if (level === 10) { for (let p = 0; p < n / 2; p++) if (failed.has(p * 2) && failed.has(p * 2 + 1)) return false; return true; }
    return false;
}

function raid(panel) {
    const state = { level: 5, disks: 4, data: 'HELLO RAID WORLD', failed: new Set() };
    const levelSeg = h('div', { class: 'seg' });
    const diskInput = h('input', { type: 'range', min: 2, max: 6, value: 4, 'aria-label': 'Number of disks' });
    const diskCount = h('b');
    const dataInput = h('input', { class: 'input mono', value: state.data, maxlength: 24, 'aria-label': 'Data to store' });
    const grid = h('div', { class: 'raid-grid' });
    const status = h('div');
    const statsEl = h('div', { class: 'grid-4' });
    const desc = h('p', { class: 'lead' });

    const render = () => {
        const cfg = RAID[state.level];
        let n = Math.min(cfg.max, Math.max(cfg.min, state.disks));
        if (cfg.even && n % 2) n += n + 1 <= cfg.max ? 1 : -1;
        state.disks = n;
        diskInput.min = cfg.min;
        diskInput.max = cfg.max;
        diskInput.step = cfg.even ? 2 : 1;
        diskInput.value = n;
        diskCount.textContent = `${n} disks`;
        [...state.failed].forEach(d => { if (d >= n) state.failed.delete(d); });
        [...levelSeg.children].forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.level) === state.level));
        desc.textContent = cfg.text;

        const text = state.data.padEnd(Math.ceil(state.data.length / 2) * 2, ' ');
        const blocks = text.match(/.{1,2}/g) ?? [];
        const disks = layout(state.level, n, blocks);
        const ok = survives(state.level, n, state.failed);

        grid.style.setProperty('--n', n);
        grid.replaceChildren(...disks.map((cellsOnDisk, d) => h('div', { class: `raid-disk${state.failed.has(d) ? ' is-failed' : ''}` },
            h('button', { type: 'button', class: 'raid-disk__head', 'aria-pressed': state.failed.has(d), title: 'Click to fail or repair this disk', onClick: () => { state.failed.has(d) ? state.failed.delete(d) : state.failed.add(d); render(); } },
                h('span', {}, `Disk ${d}`), h('small', {}, state.failed.has(d) ? 'FAILED · click to replace' : state.level === 10 ? `mirror pair ${Math.floor(d / 2)}` : 'healthy · click to fail')),
            ...cellsOnDisk.map(cell => h('div', { class: `raid-cell raid-cell--${cell.kind}` },
                cell.kind === 'data' ? [h('small', {}, `D${cell.i}`), h('code', {}, `"${cell.text}"`)] :
                    cell.kind === 'parity' ? [h('small', {}, cell.label), h('code', {}, cell.text)] : h('small', {}, '—'))))));

        // what can be read back
        const recovered = blocks.map((b, i) => {
            const holders = disks.map((cellsOnDisk, d) => (cellsOnDisk.some(c => c.kind === 'data' && c.i === i) ? d : null)).filter(d => d !== null);
            const direct = holders.some(d => !state.failed.has(d));
            return { text: b, direct, ok: direct || ok };
        });
        const rebuilt = recovered.filter(r => !r.direct && r.ok).length;
        status.replaceChildren(
            h('p', { class: `note ${ok ? (state.failed.size ? 'note--warn' : 'note--good') : 'note--bad'}` },
                ok ? (state.failed.size ? `Degraded but alive. ${state.failed.size} disk${state.failed.size > 1 ? 's' : ''} down, ${rebuilt} block${rebuilt === 1 ? '' : 's'} rebuilt ${state.level === 5 ? 'by XOR-ing the other blocks in the stripe with parity' : state.level === 6 ? 'using the P and Q parity blocks' : 'from the mirror copy'}. Replace the disk soon!` : 'All disks healthy.') :
                    'ARRAY FAILED. Too many disks lost, the missing blocks cannot be rebuilt.'),
            h('div', { class: 'raid-read' }, h('span', { class: 'muted' }, 'Reading the data back: '),
                ...recovered.map(r => h('code', { class: r.ok ? (r.direct ? '' : 'is-rebuilt') : 'is-lost' }, r.ok ? r.text.replace(/ /g, '·') : '██'))));

        const size = 2;
        const usable = { 0: n, 1: 1, 5: n - 1, 6: n - 2, 10: n / 2 }[state.level] * size;
        const tolerance = { 0: '0 disks', 1: `${n - 1} disks`, 5: '1 disk', 6: '2 disks', 10: `1 per pair (up to ${n / 2})` }[state.level];
        statsEl.replaceChildren(
            h('div', { class: 'stat' }, h('span', {}, 'Raw capacity'), h('b', {}, `${n * size} TB`)),
            h('div', { class: 'stat' }, h('span', {}, 'Usable space'), h('b', {}, `${usable} TB`)),
            h('div', { class: 'stat' }, h('span', {}, 'Efficiency'), h('b', {}, `${Math.round((usable / (n * size)) * 100)}%`)),
            h('div', { class: 'stat' }, h('span', {}, 'Survives losing'), h('b', { style: { fontSize: '16px' } }, tolerance)));
    };

    Object.keys(RAID).forEach(level => levelSeg.append(h('button', { type: 'button', dataset: { level }, onClick: () => { state.level = Number(level); state.failed.clear(); render(); } }, `RAID ${level}`)));
    diskInput.addEventListener('input', () => { state.disks = Number(diskInput.value); render(); });
    dataInput.addEventListener('input', () => { state.data = dataInput.value || ' '; render(); });

    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'RAID lab'), h('p', {}, 'RAID (Redundant Array of Independent Disks) combines several disks into one for speed, safety, or both. Pick a level, then click disk headers to make them fail.'))),
        h('div', { class: 'row' }, levelSeg, h('label', { class: 'row' }, diskInput, diskCount), h('label', { class: 'field', style: { minWidth: '220px' } }, h('span', {}, 'Data to store (2 bytes per block)'), dataInput)),
        desc, statsEl, h('div', { class: 'raid-wrap' }, grid), status,
        note('Parity is real: P = D0 ⊕ D1 ⊕ … (XOR). If one block is lost, XOR-ing everything else in the stripe gives it back. Q uses Galois-field maths so two lost blocks can be solved.'));
    render();
}

export function mount(body, { args }) {
    const cleanups = [];
    const keep = (fn) => (panel) => { const r = fn(panel); if (r?.cleanup) cleanups.push(r.cleanup); };
    const view = tabs([
        { id: 'basics', label: 'Computer basics', render: basics },
        { id: 'block', label: 'Block diagram', render: keep(blockDiagram) },
        { id: 'memory', label: 'Memory', render: memory },
        { id: 'storage', label: 'Storage', render: storage },
        { id: 'cpugpu', label: 'CPU vs GPU', render: keep(cpuGpu) },
        { id: 'ports', label: 'Ports', render: ports },
        { id: 'raid', label: 'RAID lab', render: raid }
    ], { app: 'hardware' });
    body.append(view.el);
    if (args?.tab) view.show(args.tab);
    return { cleanup: () => cleanups.forEach(fn => fn()), onArgs: (a) => a?.tab && view.show(a.tab) };
}
