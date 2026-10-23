// Number Systems: conversions with the working shown, a bit board, text as binary, and a quiz.

import { h, tabs, table, note } from '../core/ui.js';
import { store } from '../core/store.js';

const BASES = { 2: 'Binary', 8: 'Octal', 10: 'Decimal', 16: 'Hexadecimal' };
const VALID = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^\d+$/, 16: /^[\da-f]+$/i };
const DIGITS = '0123456789ABCDEF';

const parse = (text, base) => [...text.toUpperCase()].reduce((acc, d) => acc * BigInt(base) + BigInt(DIGITS.indexOf(d)), 0n);
const format = (value, base) => value.toString(base).toUpperCase();
const group = (bin, size) => bin.padStart(Math.ceil(bin.length / size) * size, '0').match(new RegExp(`.{${size}}`, 'g'));

function convert(panel) {
    const state = { text: '156', from: 10, show: 2 };
    const input = h('input', { class: 'input mono big-input', value: state.text, 'aria-label': 'Number', autocomplete: 'off', spellcheck: false });
    const fromSel = h('select', { class: 'select', 'aria-label': 'Input base' }, Object.entries(BASES).map(([b, name]) => h('option', { value: b, selected: Number(b) === state.from }, `${name} (base ${b})`)));
    const error = h('p', { class: 'field-error' });
    const results = h('div', { class: 'grid-4' });
    const showSeg = h('div', { class: 'seg' });
    const working = h('div', { class: 'working' });

    const render = () => {
        const text = input.value.trim();
        const ok = text && VALID[state.from].test(text) && text.length <= 20;
        input.classList.toggle('is-bad', Boolean(text) && !ok);
        error.textContent = !text ? '' : ok ? '' : `"${text}" is not a valid ${BASES[state.from].toLowerCase()} number. Allowed digits: ${DIGITS.slice(0, state.from).split('').join(' ')}`;
        if (!ok) { results.replaceChildren(); working.replaceChildren(); return; }
        const value = parse(text, state.from);
        results.replaceChildren(...[2, 8, 10, 16].map(b => h('div', { class: `stat num-card${b === state.from ? ' is-from' : ''}` },
            h('span', {}, `${BASES[b]} · base ${b}`), h('b', { class: 'mono' }, format(value, b)),
            b === 2 ? h('small', { class: 'muted' }, `${format(value, 2).length} bits`) : null)));
        [...showSeg.children].forEach(btn => btn.setAttribute('aria-pressed', Number(btn.dataset.base) === state.show));
        working.replaceChildren(...explain(text, state.from, state.show, value));
    };

    Object.entries(BASES).forEach(([b, name]) => showSeg.append(h('button', { type: 'button', dataset: { base: b }, onClick: () => { state.show = Number(b); render(); } }, `to ${name}`)));
    input.addEventListener('input', render);
    fromSel.addEventListener('change', () => { state.from = Number(fromSel.value); render(); });

    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Number system converter'), h('p', {}, 'Computers store everything as binary (base 2). Octal and hex are shorthand for binary that humans find easier to read. Type a number and see every step.'))),
        h('div', { class: 'row' }, h('label', { class: 'field', style: { flex: '1 1 220px' } }, h('span', {}, 'Number'), input), h('label', { class: 'field' }, h('span', {}, 'It is written in'), fromSel)),
        error, results,
        h('div', { class: 'row', style: { margin: '18px 0 8px' } }, h('strong', {}, 'Show the working'), showSeg),
        working);
    render();
}

function explain(text, from, to, value) {
    const out = [];
    let decimal = value;

    if (from !== 10) {
        const digits = [...text.toUpperCase()];
        const rows = digits.map((d, i) => {
            const power = digits.length - 1 - i;
            const dv = DIGITS.indexOf(d);
            return [d, `${dv} × ${from}^${power}`, `${dv} × ${BigInt(from) ** BigInt(power)}`, String(BigInt(dv) * BigInt(from) ** BigInt(power))];
        });
        out.push(h('h4', {}, `Step 1 · ${BASES[from]} → decimal (positional expansion)`),
            h('p', { class: 'muted' }, `Each digit is multiplied by ${from} raised to its position (counting from 0 on the right), then everything is added.`),
            table(['Digit', 'Place value', '=', 'Value'], rows),
            h('p', { class: 'answer' }, `${rows.map(r => r[3]).join(' + ')} = `, h('b', {}, String(decimal)), h('sub', {}, '10')));
    }

    if (to === 10) {
        if (from === 10) out.push(h('p', { class: 'note' }, 'The number is already in decimal. Pick another target above.'));
        return out;
    }

    // shortcut between binary and octal/hex
    if ((from === 2 && (to === 8 || to === 16)) || ((from === 8 || from === 16) && to === 2)) {
        const size = to === 8 || from === 8 ? 3 : 4;
        if (from === 2) {
            const groups = group(text, size);
            out.push(h('h4', {}, `Shortcut · group bits in ${size}s`),
                h('p', { class: 'muted' }, `Every ${BASES[to].toLowerCase()} digit is exactly ${size} bits, so split the binary into groups of ${size} from the right (padding with 0s) and convert each group.`),
                h('div', { class: 'bit-groups' }, groups.map(g => h('div', {}, h('code', {}, g), h('b', {}, DIGITS[parseInt(g, 2)])))),
                h('p', { class: 'answer' }, 'Answer: ', h('b', {}, format(value, to)), h('sub', {}, String(to))));
        } else {
            out.push(h('h4', {}, `Shortcut · each digit becomes ${size} bits`),
                h('div', { class: 'bit-groups' }, [...text.toUpperCase()].map(d => h('div', {}, h('b', {}, d), h('code', {}, DIGITS.indexOf(d).toString(2).padStart(size, '0'))))),
                h('p', { class: 'answer' }, 'Answer: ', h('b', {}, format(value, 2).replace(/^0+(?=.)/, '')), h('sub', {}, '2')));
        }
        return out;
    }

    const rows = [];
    let n = decimal;
    if (n === 0n) rows.push(['0 ÷ ' + to, '0', '0']);
    while (n > 0n) {
        const q = n / BigInt(to);
        const r = n % BigInt(to);
        rows.push([`${n} ÷ ${to}`, String(q), `${r}${r > 9n ? ` (${DIGITS[Number(r)]})` : ''}`]);
        n = q;
        if (rows.length > 64) break;
    }
    out.push(h('h4', {}, `Step ${from === 10 ? 1 : 2} · decimal → ${BASES[to].toLowerCase()} (repeated division)`),
        h('p', { class: 'muted' }, `Keep dividing by ${to}. The remainders, read from bottom to top, are the answer.`),
        table(['Division', 'Quotient', 'Remainder'], rows),
        h('p', { class: 'answer' }, 'Read remainders upwards ↑  ', h('b', {}, format(decimal, to)), h('sub', {}, String(to))));
    return out;
}

function bits(panel) {
    const state = { width: 8, bits: [0, 1, 0, 0, 0, 0, 0, 1], signed: false };
    const board = h('div', { class: 'bit-board' });
    const summary = h('div', { class: 'grid-4' });
    const widthSeg = h('div', { class: 'seg' }, [8, 16].map(w => h('button', { type: 'button', dataset: { w }, onClick: () => {
        state.bits = Array(w - state.width > 0 ? w - state.width : 0).fill(0).concat(state.bits).slice(-w);
        state.width = w;
        render();
    } }, `${w}-bit`)));
    const signed = h('input', { type: 'checkbox', onChange: e => { state.signed = e.target.checked; render(); } });

    const render = () => {
        [...widthSeg.children].forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.w) === state.width));
        board.style.setProperty('--n', state.width);
        board.replaceChildren(...state.bits.map((bit, i) => {
            const power = state.width - 1 - i;
            const place = state.signed && power === state.width - 1 ? -(2 ** power) : 2 ** power;
            return h('button', { type: 'button', class: `bit${bit ? ' is-on' : ''}`, 'aria-pressed': Boolean(bit), 'aria-label': `bit ${power}, worth ${place}`, onClick: () => { state.bits[i] ^= 1; render(); } },
                h('b', {}, bit), h('small', {}, place));
        }));
        const unsigned = state.bits.reduce((acc, b) => acc * 2 + b, 0);
        const value = state.signed && state.bits[0] ? unsigned - 2 ** state.width : unsigned;
        const ascii = state.width === 8 && unsigned >= 32 && unsigned < 127 ? `'${String.fromCharCode(unsigned)}'` : '—';
        summary.replaceChildren(
            h('div', { class: 'stat' }, h('span', {}, state.signed ? 'Decimal (signed)' : 'Decimal'), h('b', {}, value)),
            h('div', { class: 'stat' }, h('span', {}, 'Hex'), h('b', { class: 'mono' }, '0x' + unsigned.toString(16).toUpperCase().padStart(state.width / 4, '0'))),
            h('div', { class: 'stat' }, h('span', {}, 'Octal'), h('b', { class: 'mono' }, unsigned.toString(8))),
            h('div', { class: 'stat' }, h('span', {}, 'As an ASCII character'), h('b', {}, ascii)));
    };

    const ops = h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn btn--ghost', onClick: () => { state.bits = state.bits.map(b => b ^ 1); render(); } }, 'Flip all bits (NOT)'),
        h('button', { type: 'button', class: 'btn btn--ghost', onClick: () => { state.bits = [...state.bits.slice(1), 0]; render(); } }, 'Shift left (× 2)'),
        h('button', { type: 'button', class: 'btn btn--ghost', onClick: () => { state.bits = [0, ...state.bits.slice(0, -1)]; render(); } }, 'Shift right (÷ 2)'),
        h('button', { type: 'button', class: 'btn btn--ghost', onClick: () => {
            let carry = 1;
            for (let i = state.bits.length - 1; i >= 0 && carry; i--) { const s = state.bits[i] + carry; state.bits[i] = s % 2; carry = s >> 1; }
            render();
        } }, 'Add 1'),
        h('button', { type: 'button', class: 'btn btn--ghost', onClick: () => { state.bits.fill(0); render(); } }, 'Clear'));

    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Bit board'), h('p', {}, 'Click bits to switch them on and off. Each bit is worth double the one on its right.'))),
        h('div', { class: 'row' }, widthSeg, h('label', { class: 'row' }, signed, 'Signed (two\'s complement)')),
        board, summary, ops,
        note('Negative numbers: in two\'s complement the leftmost bit is worth a negative amount. To negate a number, flip all bits and add 1. Try it with 00000101 (5).'));
    render();
}

function text(panel) {
    const input = h('input', { class: 'input', value: 'Hi CSE!', maxlength: 24, 'aria-label': 'Text' });
    const out = h('div');
    const encoder = new TextEncoder();
    const render = () => {
        const chars = [...input.value];
        out.replaceChildren(table(['Character', 'Code (decimal)', 'Hex', 'Bytes in binary (UTF-8)'],
            chars.map(c => {
                const bytes = [...encoder.encode(c)];
                return [c === ' ' ? '(space)' : c, String(c.codePointAt(0)), 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'), h('code', {}, bytes.map(b => b.toString(2).padStart(8, '0')).join(' '))];
            })),
            h('p', { class: 'muted' }, `${chars.length} characters = ${encoder.encode(input.value).length} bytes = ${encoder.encode(input.value).length * 8} bits.`));
    };
    input.addEventListener('input', render);
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Text is numbers too'), h('p', {}, 'Every character has a number (ASCII for English, Unicode for every language and emoji). The computer stores that number in binary.'))),
        input, out,
        note('ASCII uses 7 bits (128 characters). UTF-8 keeps ASCII as 1 byte and uses 2–4 bytes for other characters. Try typing हि or an emoji.'));
    render();
}

function quiz(panel) {
    const saved = store.get('num-quiz', { score: 0, total: 0, streak: 0 });
    const q = h('p', { class: 'quiz-q' });
    const input = h('input', { class: 'input mono big-input', 'aria-label': 'Your answer', autocomplete: 'off' });
    const feedback = h('p');
    const scoreEl = h('div', { class: 'grid-3' });
    let current;

    const newQuestion = () => {
        const bases = [2, 8, 10, 16];
        const from = bases[Math.floor(Math.random() * 4)];
        let to = bases[Math.floor(Math.random() * 4)];
        if (to === from) to = from === 2 ? 10 : 2;
        const value = BigInt(Math.floor(Math.random() * 250) + 5);
        current = { from, to, value };
        q.replaceChildren('Convert ', h('b', { class: 'mono' }, format(value, from)), h('sub', {}, String(from)), ` from ${BASES[from].toLowerCase()} to ${BASES[to].toLowerCase()}.`);
        input.value = '';
        feedback.replaceChildren();
        input.focus();
    };
    const renderScore = () => scoreEl.replaceChildren(
        h('div', { class: 'stat' }, h('span', {}, 'Correct'), h('b', {}, `${saved.score} / ${saved.total}`)),
        h('div', { class: 'stat' }, h('span', {}, 'Streak'), h('b', {}, saved.streak)),
        h('div', { class: 'stat' }, h('span', {}, 'Accuracy'), h('b', {}, saved.total ? `${Math.round((saved.score / saved.total) * 100)}%` : '—')));
    const check = () => {
        const answer = input.value.trim().replace(/^0x/i, '');
        if (!answer) return;
        const right = VALID[current.to].test(answer) && parse(answer, current.to) === current.value;
        saved.total++;
        if (right) { saved.score++; saved.streak++; } else saved.streak = 0;
        store.set('num-quiz', saved);
        feedback.className = `note ${right ? 'note--good' : 'note--bad'}`;
        feedback.textContent = right ? 'Correct!' : `Not quite. The answer is ${format(current.value, current.to)}. Use the Converter tab to see the working.`;
        renderScore();
        setTimeout(newQuestion, right ? 1200 : 2600);
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Practice'), h('p', {}, 'Random conversions. Your score is saved in this browser.'))),
        scoreEl, q, h('div', { class: 'row' }, input, h('button', { type: 'button', class: 'btn', onClick: check }, 'Check'), h('button', { type: 'button', class: 'btn btn--ghost', onClick: newQuestion }, 'Skip')), feedback);
    renderScore();
    newQuestion();
}

export function mount(body, { args }) {
    const view = tabs([
        { id: 'convert', label: 'Converter', render: convert },
        { id: 'bits', label: 'Bit board', render: bits },
        { id: 'text', label: 'Text as binary', render: text },
        { id: 'quiz', label: 'Practice quiz', render: quiz }
    ], { app: 'numbers' });
    body.append(view.el);
    if (args?.tab) view.show(args.tab);
    return { onArgs: (a) => a?.tab && view.show(a.tab) };
}
