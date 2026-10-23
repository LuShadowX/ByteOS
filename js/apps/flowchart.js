// Flowchart Studio: algorithms as pseudocode + flowcharts you can run step by step, and computational thinking.

import { h, s, tabs, table, note } from '../core/ui.js';

const SIZE = { terminal: [130, 40], io: [180, 44], process: [160, 44], decision: [190, 70] };

/* Each algorithm: inputs, pseudocode lines, and nodes laid out by hand.
   node: kind, text, x, y, line (pseudocode line), run(vars, out) for steps, test(vars) for decisions,
   next / yes / no (ids), optional edge hints. */
const ALGORITHMS = {
    largest: {
        name: 'Largest of three numbers',
        idea: 'Nested decisions (selection)',
        inputs: [['A', 12], ['B', 47], ['C', 30]],
        height: 620,
        pseudo: ['START', 'INPUT A, B, C', 'IF A > B THEN', '    IF A > C THEN max ← A', '    ELSE max ← C', 'ELSE', '    IF B > C THEN max ← B', '    ELSE max ← C', 'PRINT max', 'STOP'],
        nodes: {
            start: { kind: 'terminal', text: 'Start', x: 310, y: 40, line: 0, next: 'in' },
            in: { kind: 'io', text: 'Input A, B, C', x: 310, y: 120, line: 1, next: 'd1' },
            d1: { kind: 'decision', text: 'A > B ?', x: 310, y: 215, line: 2, test: v => v.A > v.B, yes: 'd2', no: 'd3' },
            d2: { kind: 'decision', text: 'A > C ?', x: 160, y: 320, line: 3, test: v => v.A > v.C, yes: 'pA', no: 'pC' },
            d3: { kind: 'decision', text: 'B > C ?', x: 460, y: 320, line: 6, test: v => v.B > v.C, yes: 'pB', no: 'pC' },
            pA: { kind: 'process', text: 'max = A', x: 90, y: 425, line: 3, run: v => { v.max = v.A; }, next: 'out' },
            pC: { kind: 'process', text: 'max = C', x: 310, y: 425, line: 4, run: v => { v.max = v.C; }, next: 'out' },
            pB: { kind: 'process', text: 'max = B', x: 530, y: 425, line: 6, run: v => { v.max = v.B; }, next: 'out' },
            out: { kind: 'io', text: 'Print max', x: 310, y: 505, line: 8, run: (v, o) => o.push(v.max), next: 'end' },
            end: { kind: 'terminal', text: 'Stop', x: 310, y: 585, line: 9 }
        }
    },
    evenodd: {
        name: 'Even or odd',
        idea: 'Simple decision',
        inputs: [['N', 17]],
        height: 520,
        pseudo: ['START', 'INPUT N', 'r ← N MOD 2', 'IF r = 0 THEN PRINT "Even"', 'ELSE PRINT "Odd"', 'STOP'],
        nodes: {
            start: { kind: 'terminal', text: 'Start', x: 310, y: 40, line: 0, next: 'in' },
            in: { kind: 'io', text: 'Input N', x: 310, y: 120, line: 1, next: 'p' },
            p: { kind: 'process', text: 'r = N mod 2', x: 310, y: 200, line: 2, run: v => { v.r = ((v.N % 2) + 2) % 2; }, next: 'd' },
            d: { kind: 'decision', text: 'r = 0 ?', x: 310, y: 295, line: 3, test: v => v.r === 0, yes: 'e', no: 'o' },
            e: { kind: 'io', text: 'Print "Even"', x: 140, y: 395, line: 3, run: (v, o) => o.push('Even'), next: 'end' },
            o: { kind: 'io', text: 'Print "Odd"', x: 480, y: 395, line: 4, run: (v, o) => o.push('Odd'), next: 'end' },
            end: { kind: 'terminal', text: 'Stop', x: 310, y: 480, line: 5 }
        }
    },
    sum: {
        name: 'Sum of 1 to N',
        idea: 'Loop (iteration)',
        inputs: [['N', 5]],
        limits: { N: [1, 12] },
        height: 560,
        pseudo: ['START', 'INPUT N', 'sum ← 0, i ← 1', 'WHILE i ≤ N DO', '    sum ← sum + i', '    i ← i + 1', 'END WHILE', 'PRINT sum', 'STOP'],
        nodes: {
            start: { kind: 'terminal', text: 'Start', x: 310, y: 40, line: 0, next: 'in' },
            in: { kind: 'io', text: 'Input N', x: 310, y: 120, line: 1, next: 'init' },
            init: { kind: 'process', text: 'sum = 0, i = 1', x: 310, y: 200, line: 2, run: v => { v.sum = 0; v.i = 1; }, next: 'd' },
            d: { kind: 'decision', text: 'i ≤ N ?', x: 310, y: 295, line: 3, test: v => v.i <= v.N, yes: 'add', no: 'out' },
            add: { kind: 'process', text: 'sum = sum + i', x: 310, y: 395, line: 4, run: v => { v.sum += v.i; }, next: 'inc' },
            inc: { kind: 'process', text: 'i = i + 1', x: 310, y: 470, line: 5, run: v => { v.i += 1; }, next: 'd' },
            out: { kind: 'io', text: 'Print sum', x: 520, y: 395, line: 7, run: (v, o) => o.push(v.sum), next: 'end' },
            end: { kind: 'terminal', text: 'Stop', x: 520, y: 470, line: 8 }
        }
    },
    factorial: {
        name: 'Factorial of N',
        idea: 'Loop with a running product',
        inputs: [['N', 5]],
        limits: { N: [0, 12] },
        height: 560,
        pseudo: ['START', 'INPUT N', 'fact ← 1, i ← 1', 'WHILE i ≤ N DO', '    fact ← fact × i', '    i ← i + 1', 'END WHILE', 'PRINT fact', 'STOP'],
        nodes: {
            start: { kind: 'terminal', text: 'Start', x: 310, y: 40, line: 0, next: 'in' },
            in: { kind: 'io', text: 'Input N', x: 310, y: 120, line: 1, next: 'init' },
            init: { kind: 'process', text: 'fact = 1, i = 1', x: 310, y: 200, line: 2, run: v => { v.fact = 1; v.i = 1; }, next: 'd' },
            d: { kind: 'decision', text: 'i ≤ N ?', x: 310, y: 295, line: 3, test: v => v.i <= v.N, yes: 'mul', no: 'out' },
            mul: { kind: 'process', text: 'fact = fact × i', x: 310, y: 395, line: 4, run: v => { v.fact *= v.i; }, next: 'inc' },
            inc: { kind: 'process', text: 'i = i + 1', x: 310, y: 470, line: 5, run: v => { v.i += 1; }, next: 'd' },
            out: { kind: 'io', text: 'Print fact', x: 520, y: 395, line: 7, run: (v, o) => o.push(v.fact), next: 'end' },
            end: { kind: 'terminal', text: 'Stop', x: 520, y: 470, line: 8 }
        }
    },
    grade: {
        name: 'Grade from marks',
        idea: 'If–else ladder',
        inputs: [['marks', 78]],
        limits: { marks: [0, 100] },
        height: 700,
        pseudo: ['START', 'INPUT marks', 'IF marks ≥ 90 THEN grade ← "O"', 'ELSE IF marks ≥ 75 THEN grade ← "A+"', 'ELSE IF marks ≥ 60 THEN grade ← "A"', 'ELSE grade ← "B"', 'PRINT grade', 'STOP'],
        nodes: {
            start: { kind: 'terminal', text: 'Start', x: 250, y: 40, line: 0, next: 'in' },
            in: { kind: 'io', text: 'Input marks', x: 250, y: 120, line: 1, next: 'd1' },
            d1: { kind: 'decision', text: 'marks ≥ 90 ?', x: 250, y: 215, line: 2, test: v => v.marks >= 90, yes: 'g1', no: 'd2' },
            d2: { kind: 'decision', text: 'marks ≥ 75 ?', x: 250, y: 315, line: 3, test: v => v.marks >= 75, yes: 'g2', no: 'd3' },
            d3: { kind: 'decision', text: 'marks ≥ 60 ?', x: 250, y: 415, line: 4, test: v => v.marks >= 60, yes: 'g3', no: 'g4' },
            g1: { kind: 'process', text: 'grade = "O"', x: 470, y: 215, line: 2, run: v => { v.grade = 'O'; }, next: 'out', via: [[590, 215], [590, 600]], from: 'right', to: 'right' },
            g2: { kind: 'process', text: 'grade = "A+"', x: 470, y: 315, line: 3, run: v => { v.grade = 'A+'; }, next: 'out', via: [[590, 315], [590, 600]], from: 'right', to: 'right' },
            g3: { kind: 'process', text: 'grade = "A"', x: 470, y: 415, line: 4, run: v => { v.grade = 'A'; }, next: 'out', via: [[590, 415], [590, 600]], from: 'right', to: 'right' },
            g4: { kind: 'process', text: 'grade = "B"', x: 250, y: 515, line: 5, run: v => { v.grade = 'B'; }, next: 'out' },
            out: { kind: 'io', text: 'Print grade', x: 250, y: 600, line: 6, run: (v, o) => o.push(v.grade), next: 'end' },
            end: { kind: 'terminal', text: 'Stop', x: 250, y: 670, line: 7 }
        }
    }
};

const anchor = (n, side) => {
    const [w, ht] = SIZE[n.kind];
    return side === 'top' ? [n.x, n.y - ht / 2] : side === 'bottom' ? [n.x, n.y + ht / 2] : side === 'left' ? [n.x - w / 2, n.y] : [n.x + w / 2, n.y];
};

function route(src, dst, hint = {}) {
    if (hint.via) return [anchor(src, hint.from ?? 'right'), ...hint.via, anchor(dst, hint.to ?? 'top')];
    if (dst.y < src.y) {
        const b = anchor(src, 'bottom');
        const t = anchor(dst, 'left');
        const lane = 110;
        return [b, [b[0], b[1] + 18], [lane, b[1] + 18], [lane, t[1]], t];
    }
    if (dst.x === src.x) return [anchor(src, 'bottom'), anchor(dst, 'top')];
    if (src.kind === 'decision') {
        const side = dst.x < src.x ? 'left' : 'right';
        const a = anchor(src, side);
        if (Math.abs(dst.y - src.y) < 5) return [a, anchor(dst, side === 'left' ? 'right' : 'left')];
        return [a, [dst.x, a[1]], anchor(dst, 'top')];
    }
    const b = anchor(src, 'bottom');
    const t = anchor(dst, 'top');
    const mid = (b[1] + t[1]) / 2;
    return [b, [b[0], mid], [t[0], mid], t];
}

function shape(n) {
    const [w, ht] = SIZE[n.kind];
    const { x, y } = n;
    if (n.kind === 'terminal') return s('rect', { x: x - w / 2, y: y - ht / 2, width: w, height: ht, rx: ht / 2 });
    if (n.kind === 'process') return s('rect', { x: x - w / 2, y: y - ht / 2, width: w, height: ht, rx: 4 });
    if (n.kind === 'io') return s('polygon', { points: `${x - w / 2 + 16},${y - ht / 2} ${x + w / 2},${y - ht / 2} ${x + w / 2 - 16},${y + ht / 2} ${x - w / 2},${y + ht / 2}` });
    return s('polygon', { points: `${x},${y - ht / 2} ${x + w / 2},${y} ${x},${y + ht / 2} ${x - w / 2},${y}` });
}

function studio(panel) {
    const state = { id: 'largest', vars: {}, out: [], current: null, trace: [], steps: 0, timer: null, taken: new Set() };
    const pick = h('select', { class: 'select', 'aria-label': 'Algorithm' }, Object.entries(ALGORITHMS).map(([id, a]) => h('option', { value: id }, `${a.name} · ${a.idea}`)));
    const inputsEl = h('div', { class: 'row' });
    const pseudoEl = h('ol', { class: 'pseudo' });
    const chart = h('div', { class: 'svg-box flow' });
    const varsEl = h('div', { class: 'grid-3' });
    const outEl = h('pre', { class: 'code flow-out' });
    const traceBody = h('tbody');
    const status = h('p', { class: 'muted' });
    let fields = [];

    const algo = () => ALGORITHMS[state.id];

    const draw = () => {
        const a = algo();
        const svg = s('svg', { viewBox: `0 0 640 ${a.height}`, role: 'img', 'aria-label': `Flowchart: ${a.name}` },
            s('defs', {}, s('marker', { id: 'fc-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, s('path', { d: 'M0 0L10 5L0 10z', class: 'fc-arrowhead' }))));
        for (const [id, n] of Object.entries(a.nodes)) {
            const edges = n.kind === 'decision' ? [['yes', n.yes, 'Yes'], ['no', n.no, 'No']] : n.next ? [['next', n.next, '']] : [];
            for (const [kind, target, label] of edges) {
                const pts = route(n, a.nodes[target], kind === 'next' ? n : {});
                const key = `${id}>${target}`;
                svg.append(s('polyline', { points: pts.map(p => p.join(',')).join(' '), class: `fc-edge${state.taken.has(key) ? ' is-taken' : ''}`, 'marker-end': 'url(#fc-arrow)' }));
                if (label) svg.append(s('text', { x: pts[0][0] + (pts[1][0] > pts[0][0] ? 8 : pts[1][0] < pts[0][0] ? -26 : 6), y: pts[0][1] + (pts[1][1] > pts[0][1] ? 16 : -6), class: `fc-label fc-label--${kind}` }, label));
            }
        }
        for (const [id, n] of Object.entries(a.nodes)) {
            svg.append(s('g', { class: `fc-node fc-node--${n.kind}${state.current === id ? ' is-current' : ''}` }, shape(n), s('text', { x: n.x, y: n.y + 5, 'text-anchor': 'middle' }, n.text)));
        }
        chart.replaceChildren(svg);
        const line = state.current ? a.nodes[state.current].line : -1;
        [...pseudoEl.children].forEach((li, i) => li.classList.toggle('is-current', i === line));
        varsEl.replaceChildren(...Object.entries(state.vars).map(([k, v]) => h('div', { class: 'stat' }, h('span', {}, k), h('b', { class: 'mono' }, String(v)))));
        if (!Object.keys(state.vars).length) varsEl.append(h('p', { class: 'muted' }, 'Variables appear here as the algorithm runs.'));
        outEl.textContent = state.out.join('\n') || ' ';
    };

    const reset = () => {
        clearInterval(state.timer);
        state.timer = null;
        state.vars = {};
        state.out = [];
        state.current = null;
        state.steps = 0;
        state.trace = [];
        state.taken = new Set();
        traceBody.replaceChildren();
        status.textContent = 'Press Step to start at the Start symbol.';
        draw();
    };

    const readInputs = () => {
        const a = algo();
        const vars = {};
        for (const [name, input] of fields) {
            const n = Number(input.value);
            const [lo, hi] = a.limits?.[name] ?? [-9999, 9999];
            const ok = input.value.trim() !== '' && Number.isInteger(n) && n >= lo && n <= hi;
            input.classList.toggle('is-bad', !ok);
            if (!ok) { status.textContent = `${name} must be a whole number from ${lo} to ${hi}.`; status.className = 'note note--bad'; return null; }
            vars[name] = n;
        }
        return vars;
    };

    const step = () => {
        const a = algo();
        if (state.current === 'end') { clearInterval(state.timer); return; }
        if (state.current === null) {
            const vars = readInputs();
            if (!vars) return;
            state.pending = vars;
            state.current = 'start';
        } else {
            const n = a.nodes[state.current];
            let next;
            let detail = '';
            if (state.current === 'in') { Object.assign(state.vars, state.pending); detail = Object.entries(state.pending).map(([k, v]) => `${k}=${v}`).join(', '); next = n.next; }
            else if (n.kind === 'decision') { const r = n.test(state.vars); detail = r ? 'true → Yes' : 'false → No'; next = r ? n.yes : n.no; }
            else { n.run?.(state.vars, state.out); next = n.next; detail = n.kind === 'io' ? `output: ${state.out.at(-1)}` : Object.entries(state.vars).map(([k, v]) => `${k}=${v}`).join(', '); }
            state.taken.add(`${state.current}>${next}`);
            state.trace.push([state.steps + 1, n.text, detail]);
            traceBody.append(h('tr', {}, h('td', {}, state.steps + 1), h('th', { scope: 'row' }, n.text), h('td', { class: 'mono' }, detail)));
            state.current = next;
            state.steps++;
        }
        status.className = 'muted';
        status.textContent = state.current === 'end' ? `Finished in ${state.steps} steps.` : `Step ${state.steps}: at "${a.nodes[state.current].text}"`;
        if (state.steps > 300) { clearInterval(state.timer); status.textContent = 'Stopped after 300 steps.'; }
        draw();
        if (state.current === 'end') clearInterval(state.timer);
    };

    const load = () => {
        const a = algo();
        fields = a.inputs.map(([name, value]) => [name, h('input', { class: 'input mono', type: 'number', value, style: { width: '90px' }, 'aria-label': name, onInput: reset })]);
        inputsEl.replaceChildren(...fields.map(([name, input]) => h('label', { class: 'row' }, h('b', {}, name), input)));
        pseudoEl.replaceChildren(...a.pseudo.map(line => h('li', {}, h('code', {}, line))));
        reset();
    };
    pick.addEventListener('change', () => { state.id = pick.value; load(); });

    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Algorithms, pseudocode and flowcharts'), h('p', {}, 'An algorithm is a finite list of clear steps that solves a problem. Pseudocode writes it in plain structured English, a flowchart draws it. Run it and watch both light up together.'))),
        h('div', { class: 'row' }, pick, inputsEl,
            h('button', { type: 'button', class: 'btn', onClick: () => { clearInterval(state.timer); step(); } }, 'Step'),
            h('button', { type: 'button', class: 'btn btn--ghost', onClick: () => { clearInterval(state.timer); if (state.current === 'end') reset(); state.timer = setInterval(step, 550); } }, 'Run'),
            h('button', { type: 'button', class: 'btn btn--ghost', onClick: reset }, 'Reset')),
        status,
        h('div', { class: 'flow-layout' },
            h('div', {}, h('h4', {}, 'Pseudocode'), pseudoEl, h('h4', {}, 'Variables'), varsEl, h('h4', {}, 'Output'), outEl),
            chart),
        h('h4', {}, 'Trace table (dry run)'),
        h('table', { class: 'data' }, h('thead', {}, h('tr', {}, ['Step', 'Symbol', 'What happened'].map(t => h('th', {}, t)))), traceBody));
    load();
    return { cleanup: () => clearInterval(state.timer) };
}

function thinking(panel) {
    const symbol = (kind, label, text) => h('div', { class: 'symbol' },
        s('svg', { viewBox: '0 0 200 70', 'aria-hidden': 'true' }, shape({ kind, x: 100, y: 35 })), h('b', {}, label), h('small', {}, text));
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Computational thinking'), h('p', {}, 'Thinking about a problem the way a computer scientist would, before writing any code. Four habits, shown on one real problem: "work out my CGPA".'))),
        h('div', { class: 'grid-2' },
            ...[['1 · Decomposition', 'Break a big problem into smaller ones.', 'CGPA → get each term\'s subjects → get credits and grade points → combine them.'],
                ['2 · Pattern recognition', 'Spot what repeats.', 'Every subject is handled the same way: credits × grade point. Only the numbers change.'],
                ['3 · Abstraction', 'Keep what matters, ignore the rest.', 'Teacher names and exam dates do not affect CGPA. Only credits and grades do.'],
                ['4 · Algorithm design', 'Write exact steps that always work.', 'total = Σ(credits × points), CGPA = total ÷ Σ credits. Same steps for any student.']]
                .map(([title, what, example]) => h('div', { class: 'card' }, h('h3', {}, title), h('p', {}, what), h('p', { class: 'note' }, example)))),
        h('h4', {}, 'Flowchart symbols'),
        h('div', { class: 'symbols' },
            symbol('terminal', 'Terminal', 'Start or stop'),
            symbol('io', 'Input / output', 'Read or print data'),
            symbol('process', 'Process', 'A calculation or assignment'),
            symbol('decision', 'Decision', 'A yes/no question, two exits')),
        h('h4', {}, 'A good algorithm has five properties'),
        table(['Property', 'Meaning'], [['Input', 'Zero or more values given to it'], ['Output', 'At least one result'], ['Definiteness', 'Every step is clear and has only one meaning'], ['Finiteness', 'It always stops after a limited number of steps'], ['Effectiveness', 'Each step is simple enough to actually be done']]),
        h('h4', {}, 'Pseudocode keywords'),
        table(['Keyword', 'Use'], [['START / STOP', 'Begin and end'], ['INPUT / READ', 'Take a value'], ['PRINT / OUTPUT', 'Show a result'], ['← or =', 'Store a value in a variable'], ['IF … THEN … ELSE', 'Choose between two paths'], ['WHILE … DO', 'Repeat while a condition is true'], ['FOR i ← 1 TO N', 'Repeat a fixed number of times']]),
        note('Three building blocks are enough for any algorithm: sequence (steps in order), selection (IF) and iteration (loops). The Studio tab has all three.'));
}

export function mount(body, { args }) {
    const cleanups = [];
    const view = tabs([
        { id: 'studio', label: 'Studio', render: (p) => cleanups.push(studio(p).cleanup) },
        { id: 'thinking', label: 'Computational thinking', render: thinking }
    ], { app: 'flowchart' });
    body.append(view.el);
    if (args?.tab) view.show(args.tab);
    return { cleanup: () => cleanups.forEach(fn => fn()), onArgs: (a) => a?.tab && view.show(a.tab) };
}
