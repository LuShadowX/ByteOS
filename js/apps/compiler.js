// Compiler Lab: a real (tiny) compiler and interpreter for "ByteScript".
//   let x = 3 + 4 * 2;   x = x - 1;   print x;
// Stages: lexer -> parser (AST) -> code generator (stack assembly) -> machine code -> virtual machine.

import { h, tabs, table, note } from '../core/ui.js';

class CompileError extends Error {
    constructor(message, line, col) {
        super(message);
        this.line = line;
        this.col = col;
    }
}

/* ---------------- lexer ---------------- */

const KEYWORDS = new Set(['let', 'print']);

export function lex(source) {
    const tokens = [];
    const errors = [];
    let line = 1;
    let col = 1;
    for (let i = 0; i < source.length;) {
        const c = source[i];
        if (c === '\n') { line++; col = 1; i++; continue; }
        if (/\s/.test(c)) { i++; col++; continue; }
        if (c === '/' && source[i + 1] === '/') { while (i < source.length && source[i] !== '\n') i++; continue; }
        const start = col;
        let m;
        if ((m = /^\d+/.exec(source.slice(i)))) tokens.push({ type: 'NUMBER', value: m[0], line, col: start });
        else if ((m = /^[A-Za-z_]\w*/.exec(source.slice(i)))) tokens.push({ type: KEYWORDS.has(m[0]) ? 'KEYWORD' : 'IDENT', value: m[0], line, col: start });
        else if ('+-*/='.includes(c)) tokens.push({ type: 'OPERATOR', value: c, line, col: start });
        else if (c === '(' || c === ')') tokens.push({ type: c === '(' ? 'LPAREN' : 'RPAREN', value: c, line, col: start });
        else if (c === ';') tokens.push({ type: 'SEMICOLON', value: c, line, col: start });
        else { errors.push(new CompileError(`Unexpected character "${c}"`, line, start)); i++; col++; continue; }
        i += (m ? m[0] : c).length;
        col += (m ? m[0] : c).length;
    }
    tokens.push({ type: 'EOF', value: '', line, col });
    return { tokens, errors };
}

/* ---------------- parser ---------------- */

export function parse(tokens) {
    let pos = 0;
    const errors = [];
    const peek = () => tokens[pos];
    const next = () => tokens[pos++];
    const expect = (type, value, what) => {
        const t = peek();
        if (t.type !== type || (value && t.value !== value)) {
            // a missing ";" belongs to the end of the previous line, like gcc reports it
            const prev = tokens[pos - 1];
            if (type === 'SEMICOLON' && prev && prev.line < t.line) throw new CompileError(`Missing ";" at the end of the line (after "${prev.value}")`, prev.line, prev.col + prev.value.length);
            throw new CompileError(`Expected ${what} but found ${t.type === 'EOF' ? 'end of program' : `"${t.value}"`}`, t.line, t.col);
        }
        return next();
    };

    const factor = () => {
        const t = peek();
        if (t.type === 'NUMBER') { next(); return { type: 'Number', value: Number(t.value) }; }
        if (t.type === 'IDENT') { next(); return { type: 'Var', name: t.value, line: t.line, col: t.col }; }
        if (t.type === 'LPAREN') { next(); const e = expr(); expect('RPAREN', ')', '")"'); return e; }
        if (t.type === 'OPERATOR' && t.value === '-') { next(); return { type: 'Negate', value: factor() }; }
        throw new CompileError(`Expected a number, variable or "(" but found ${t.type === 'EOF' ? 'end of program' : `"${t.value}"`}`, t.line, t.col);
    };
    const term = () => {
        let left = factor();
        while (peek().type === 'OPERATOR' && '*/'.includes(peek().value)) left = { type: 'Binary', op: next().value, left, right: factor() };
        return left;
    };
    const expr = () => {
        let left = term();
        while (peek().type === 'OPERATOR' && '+-'.includes(peek().value)) left = { type: 'Binary', op: next().value, left, right: term() };
        return left;
    };
    const statement = () => {
        const t = peek();
        if (t.type === 'KEYWORD' && t.value === 'let') {
            next();
            const name = expect('IDENT', null, 'a variable name').value;
            expect('OPERATOR', '=', '"="');
            const value = expr();
            expect('SEMICOLON', ';', '";"');
            return { type: 'Let', name, value, line: t.line };
        }
        if (t.type === 'KEYWORD' && t.value === 'print') {
            next();
            const value = expr();
            expect('SEMICOLON', ';', '";"');
            return { type: 'Print', value, line: t.line };
        }
        if (t.type === 'IDENT') {
            next();
            expect('OPERATOR', '=', '"="');
            const value = expr();
            expect('SEMICOLON', ';', '";"');
            return { type: 'Assign', name: t.value, value, line: t.line };
        }
        throw new CompileError(`A statement must start with "let", "print" or a variable, not "${t.value}"`, t.line, t.col);
    };

    const body = [];
    while (peek().type !== 'EOF') {
        try {
            body.push(statement());
        } catch (err) {
            if (!(err instanceof CompileError)) throw err;
            errors.push(err);
            // recover: skip to the next ';' so we can report more than one error
            while (peek().type !== 'EOF' && peek().type !== 'SEMICOLON') next();
            if (peek().type === 'SEMICOLON') next();
        }
    }
    return { ast: { type: 'Program', body }, errors };
}

/* ---------------- semantic check + code generation ---------------- */

const OPCODES = { PUSH: 0x01, LOAD: 0x02, STORE: 0x03, ADD: 0x10, SUB: 0x11, MUL: 0x12, DIV: 0x13, NEG: 0x14, PRINT: 0x20, HALT: 0xff };
const BIN_OP = { '+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV' };

export function generate(ast) {
    const symbols = new Map();
    const code = [];
    const errors = [];
    const emit = (op, arg, line) => code.push({ op, arg, line });

    const walk = (node, line) => {
        switch (node.type) {
            case 'Number': emit('PUSH', node.value, line); break;
            case 'Var':
                if (!symbols.has(node.name)) errors.push(new CompileError(`"${node.name}" is used before it was declared with let`, node.line, node.col));
                emit('LOAD', symbols.get(node.name) ?? 0, line);
                break;
            case 'Negate': walk(node.value, line); emit('NEG', undefined, line); break;
            case 'Binary': walk(node.left, line); walk(node.right, line); emit(BIN_OP[node.op], undefined, line); break;
        }
    };

    for (const stmt of ast.body) {
        if (stmt.type === 'Let') {
            walk(stmt.value, stmt.line);
            if (!symbols.has(stmt.name)) symbols.set(stmt.name, symbols.size);
            emit('STORE', symbols.get(stmt.name), stmt.line);
        } else if (stmt.type === 'Assign') {
            if (!symbols.has(stmt.name)) errors.push(new CompileError(`Cannot assign to "${stmt.name}" before declaring it with let`, stmt.line, 1));
            walk(stmt.value, stmt.line);
            emit('STORE', symbols.get(stmt.name) ?? 0, stmt.line);
        } else if (stmt.type === 'Print') {
            walk(stmt.value, stmt.line);
            emit('PRINT', undefined, stmt.line);
        }
    }
    emit('HALT', undefined, null);

    let addr = 0;
    const machine = code.map(ins => {
        const bytes = [OPCODES[ins.op]];
        if (ins.op === 'PUSH') bytes.push((ins.arg >> 8) & 0xff, ins.arg & 0xff);
        if (ins.op === 'LOAD' || ins.op === 'STORE') bytes.push(ins.arg);
        const row = { ...ins, addr, bytes };
        addr += bytes.length;
        return row;
    });
    return { code: machine, symbols, errors };
}

const asm = (ins, symbols) => {
    const name = [...symbols].find(([, a]) => a === ins.arg)?.[0];
    if (ins.op === 'PUSH') return `PUSH ${ins.arg}`;
    if (ins.op === 'LOAD' || ins.op === 'STORE') return `${ins.op} [${name ?? ins.arg}]`;
    return ins.op;
};

/* ---------------- virtual machine ---------------- */

function* runVM(code) {
    const stack = [];
    const memory = [];
    const output = [];
    for (let pc = 0; pc < code.length; pc++) {
        const ins = code[pc];
        let note = '';
        switch (ins.op) {
            case 'PUSH': stack.push(ins.arg); note = `push ${ins.arg} onto the stack`; break;
            case 'LOAD': stack.push(memory[ins.arg] ?? 0); note = `copy memory[${ins.arg}] onto the stack`; break;
            case 'STORE': memory[ins.arg] = stack.pop(); note = `pop the top of the stack into memory[${ins.arg}]`; break;
            case 'NEG': stack.push(-stack.pop()); note = 'negate the top value'; break;
            case 'PRINT': output.push(stack.pop()); note = 'pop and print'; break;
            case 'HALT': note = 'stop'; break;
            default: {
                const b = stack.pop();
                const a = stack.pop();
                if (ins.op === 'DIV' && b === 0) {
                    yield { pc, ins, stack: [...stack], memory: [...memory], output: [...output], error: 'Runtime error: division by zero' };
                    return;
                }
                const r = ins.op === 'ADD' ? a + b : ins.op === 'SUB' ? a - b : ins.op === 'MUL' ? a * b : Math.trunc(a / b);
                stack.push(r);
                note = `pop ${a} and ${b}, push ${a} ${{ ADD: '+', SUB: '−', MUL: '×', DIV: '÷' }[ins.op]} ${b} = ${r}`;
            }
        }
        yield { pc, ins, stack: [...stack], memory: [...memory], output: [...output], note };
    }
}

/* ---------------- tree view ---------------- */

function treeView(node) {
    const label = {
        Program: () => 'Program',
        Let: (n) => `let ${n.name} =`,
        Assign: (n) => `${n.name} =`,
        Print: () => 'print',
        Binary: (n) => n.op,
        Number: (n) => String(n.value),
        Var: (n) => n.name,
        Negate: () => 'negate'
    }[node.type](node);
    const kids = node.type === 'Program' ? node.body : node.type === 'Binary' ? [node.left, node.right] : node.value && typeof node.value === 'object' ? [node.value] : [];
    return h('li', {}, h('span', { class: `ast-node ast-${node.type.toLowerCase()}` }, label), kids.length ? h('ul', {}, kids.map(treeView)) : null);
}

/* ---------------- lab ---------------- */

const SAMPLES = {
    'Area of a rectangle': '// ByteScript: let, print, + - * / and ( )\nlet width = 12;\nlet height = 5;\nlet area = width * height;\nprint area;\nprint (width + height) * 2;',
    'Swap two numbers': 'let a = 7;\nlet b = 3;\nlet temp = a;\na = b;\nb = temp;\nprint a;\nprint b;',
    'Has a bug on line 4': 'let marks = 82;\nprint marks;\nlet bonus = 5;\nlet total = marks + bonus\nprint total;'
};

function lab(panel) {
    const editor = h('textarea', { class: 'input code-editor', spellcheck: false, rows: 9, 'aria-label': 'Source code' });
    editor.value = SAMPLES['Area of a rectangle'];
    const gutter = h('div', { class: 'gutter' });
    const sampleSel = h('select', { class: 'select', 'aria-label': 'Sample program' }, Object.keys(SAMPLES).map(k => h('option', {}, k)));
    const modeSeg = h('div', { class: 'seg' });
    const stages = h('div', { class: 'stages' });
    const runPanel = h('div', { class: 'card vm' });
    let mode = 'compiler';
    let player = null;

    const syncGutter = () => {
        const n = editor.value.split('\n').length;
        gutter.replaceChildren(...Array.from({ length: n }, (_, i) => h('span', { dataset: { line: i + 1 } }, i + 1)));
    };
    const markLines = (lines, cls) => gutter.querySelectorAll('span').forEach(s => s.classList.toggle(cls, lines.includes(Number(s.dataset.line))));

    const stageCard = (n, title, sub, content) => h('details', { class: 'stage', open: true }, h('summary', {}, h('b', {}, n), h('span', {}, title), h('small', {}, sub)), content);
    const errorList = (errors) => h('ul', { class: 'errors' }, errors.map(e => h('li', {}, h('b', {}, `Line ${e.line}, col ${e.col}: `), e.message)));

    const compile = () => {
        clearInterval(player);
        markLines([], 'is-error');
        markLines([], 'is-running');
        const source = editor.value;
        const { tokens, errors: lexErrors } = lex(source);
        const { ast, errors: parseErrors } = parse(tokens);
        const gen = generate(ast);
        const errors = [...lexErrors, ...parseErrors, ...gen.errors].sort((a, b) => a.line - b.line);

        const out = [stageCard('1', 'Lexical analysis', `${tokens.length - 1} tokens`,
            h('div', { class: 'tokens' }, tokens.filter(t => t.type !== 'EOF').map(t => h('span', { class: `tok tok-${t.type.toLowerCase()}`, title: `${t.type} at line ${t.line}` }, h('small', {}, t.type), t.value))))];

        if (mode === 'interpreter') {
            stages.replaceChildren(...out);
            return interpret(ast, [...lexErrors, ...parseErrors].sort((a, b) => a.line - b.line));
        }

        out.push(stageCard('2', 'Syntax analysis (parsing)', 'abstract syntax tree', h('ul', { class: 'ast' }, treeView(ast))));
        if (errors.length) {
            markLines(errors.map(e => e.line), 'is-error');
            out.push(h('div', { class: 'note note--bad' }, h('strong', {}, `Compilation failed with ${errors.length} error${errors.length > 1 ? 's' : ''}. Nothing was run.`), errorList(errors),
                h('p', {}, 'A compiler checks the whole program first, so even the correct lines before the error do not execute.')));
            stages.replaceChildren(...out);
            runPanel.replaceChildren();
            return;
        }
        out.push(stageCard('3', 'Code generation', `${gen.code.length} assembly instructions`,
            h('div', { class: 'split' },
                h('pre', { class: 'code' }, gen.code.map(ins => `${String(ins.addr).padStart(3, '0')}  ${asm(ins, gen.symbols)}`).join('\n')),
                h('div', {}, h('small', { class: 'muted' }, 'Symbol table (variable → memory address)'), table(['Variable', 'Address'], [...gen.symbols].map(([name, a]) => [name, `0x${a.toString(16).padStart(2, '0')}`]))))));
        const bytes = gen.code.flatMap(ins => ins.bytes);
        out.push(stageCard('4', 'Machine code', `${bytes.length} bytes`,
            h('div', {}, table(['Address', 'Assembly', 'Hex', 'Binary (what the CPU really sees)'], gen.code.map(ins => [
                `0x${ins.addr.toString(16).padStart(2, '0')}`, asm(ins, gen.symbols),
                h('code', {}, ins.bytes.map(b => b.toString(16).padStart(2, '0')).join(' ')),
                h('code', { class: 'bin' }, ins.bytes.map(b => b.toString(2).padStart(8, '0')).join(' '))])))));
        stages.replaceChildren(...out);
        execute(gen);
    };

    const execute = (gen) => {
        const steps = [...runVM(gen.code)];
        let at = -1;
        const pcEl = h('div', { class: 'vm__regs' });
        const log = h('p', { class: 'vm__note' }, 'Press Step or Run to execute the machine code.');
        const outEl = h('pre', { class: 'code vm__out' }, '');
        const render = () => {
            const st = steps[at];
            if (!st) return;
            pcEl.replaceChildren(
                h('div', { class: 'stat' }, h('span', {}, 'PC (program counter)'), h('b', { class: 'mono' }, `0x${gen.code[st.pc].addr.toString(16).padStart(2, '0')}`)),
                h('div', { class: 'stat' }, h('span', {}, 'Instruction'), h('b', { class: 'mono' }, asm(st.ins, gen.symbols))),
                h('div', { class: 'stat' }, h('span', {}, 'Stack (top →)'), h('b', { class: 'mono' }, st.stack.join(', ') || 'empty')),
                h('div', { class: 'stat' }, h('span', {}, 'Memory'), h('b', { class: 'mono' }, [...gen.symbols].map(([n, a]) => `${n}=${st.memory[a] ?? '?'}`).join(' ') || '—')));
            log.textContent = st.error ?? st.note;
            log.className = `vm__note${st.error ? ' is-error' : ''}`;
            outEl.textContent = st.output.join('\n') + (st.error ? `\n${st.error}` : st.ins.op === 'HALT' ? '\n[program finished]' : '');
            markLines([], 'is-running');
            if (st.ins.line) markLines([st.ins.line], 'is-running');
        };
        const step = () => { if (at < steps.length - 1) { at++; render(); } else clearInterval(player); };
        runPanel.replaceChildren(h('h3', {}, '5 · Execution on the CPU (virtual machine)'), pcEl, log,
            h('div', { class: 'row' },
                h('button', { type: 'button', class: 'btn', onClick: () => { clearInterval(player); step(); } }, 'Step'),
                h('button', { type: 'button', class: 'btn btn--ghost', onClick: () => { clearInterval(player); player = setInterval(step, 450); } }, 'Run'),
                h('button', { type: 'button', class: 'btn btn--ghost', onClick: () => { clearInterval(player); at = steps.length - 1; render(); } }, 'Run to end')),
            h('small', { class: 'muted' }, 'Output'), outEl);
    };

    const interpret = async (ast, syntaxErrors) => {
        // an interpreter translates and runs one statement at a time
        const env = new Map();
        const output = [];
        const logEl = h('ol', { class: 'interp-log' });
        const outEl = h('pre', { class: 'code vm__out' }, '');
        runPanel.replaceChildren(h('h3', {}, 'Interpreter: translate one line → run it → next line'), logEl, h('small', { class: 'muted' }, 'Output'), outEl);
        const evaluate = (n) => {
            switch (n.type) {
                case 'Number': return n.value;
                case 'Var': if (!env.has(n.name)) throw new CompileError(`"${n.name}" is not defined`, n.line, n.col); return env.get(n.name);
                case 'Negate': return -evaluate(n.value);
                case 'Binary': {
                    const a = evaluate(n.left);
                    const b = evaluate(n.right);
                    if (n.op === '/' && b === 0) throw new CompileError('division by zero', 0, 0);
                    return n.op === '+' ? a + b : n.op === '-' ? a - b : n.op === '*' ? a * b : Math.trunc(a / b);
                }
            }
        };
        const firstBad = syntaxErrors[0]?.line ?? Infinity;
        for (const stmt of ast.body.filter(st => st.line < firstBad)) {
            markLines([stmt.line], 'is-running');
            try {
                const value = evaluate(stmt.value);
                if (stmt.type === 'Print') output.push(value);
                else {
                    if (stmt.type === 'Assign' && !env.has(stmt.name)) throw new CompileError(`"${stmt.name}" is not defined`, stmt.line, 1);
                    env.set(stmt.name, value);
                }
                logEl.append(h('li', {}, h('b', {}, `Line ${stmt.line}: `), stmt.type === 'Print' ? `printed ${value}` : `${stmt.name} = ${value}`));
            } catch (err) {
                logEl.append(h('li', { class: 'is-error' }, h('b', {}, `Line ${stmt.line}: `), `Runtime error: ${err.message}`));
                markLines([stmt.line], 'is-error');
                outEl.textContent = output.join('\n');
                return;
            }
            outEl.textContent = output.join('\n');
            await new Promise(r => setTimeout(r, 350));
        }
        if (syntaxErrors.length) {
            markLines([firstBad], 'is-error');
            logEl.append(h('li', { class: 'is-error' }, h('b', {}, `Line ${firstBad}: `), `stopped. ${syntaxErrors[0].message}`));
            runPanel.append(h('p', { class: 'note note--warn' }, 'Notice: the interpreter already ran (and printed) the lines before the error. A compiler would have refused to run anything.'));
        } else {
            logEl.append(h('li', {}, h('b', {}, 'Done. '), 'Each line was translated and run one at a time.'));
        }
    };

    ['compiler', 'interpreter'].forEach(m => modeSeg.append(h('button', { type: 'button', dataset: { m }, onClick: () => {
        mode = m;
        [...modeSeg.children].forEach(b => b.setAttribute('aria-pressed', b.dataset.m === mode));
        compile();
    } }, m === 'compiler' ? 'Compiler' : 'Interpreter')));
    modeSeg.children[0].setAttribute('aria-pressed', 'true');

    sampleSel.addEventListener('change', () => { editor.value = SAMPLES[sampleSel.value]; syncGutter(); compile(); });
    editor.addEventListener('input', syncGutter);
    editor.addEventListener('scroll', () => { gutter.scrollTop = editor.scrollTop; });
    editor.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); compile(); }
        if (e.key === 'Tab') { e.preventDefault(); editor.setRangeText('    ', editor.selectionStart, editor.selectionEnd, 'end'); }
    });

    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'From source code to machine code'), h('p', {}, 'Write a little program in ByteScript, then translate it like a real compiler does, or run it line by line like an interpreter. Ctrl+Enter translates.'))),
        h('div', { class: 'row' }, sampleSel, modeSeg, h('button', { type: 'button', class: 'btn', onClick: compile }, 'Translate & run')),
        h('div', { class: 'editor' }, gutter, editor),
        stages, runPanel);
    syncGutter();
    compile();
    return { cleanup: () => clearInterval(player) };
}

/* ---------------- levels ---------------- */

function levels(panel) {
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Computer languages'), h('p', {}, 'The same job, "add 5 and 3 and store it", written at three levels.'))),
        h('div', { class: 'grid-3' },
            h('div', { class: 'card' }, h('h3', {}, 'High-level language'), h('pre', { class: 'code' }, 'int a = 5 + 3;'), h('p', { class: 'muted' }, 'C, Python, Java. Close to English, portable, needs a compiler or interpreter.')),
            h('div', { class: 'card' }, h('h3', {}, 'Assembly language'), h('pre', { class: 'code' }, 'MOV AX, 5\nADD AX, 3\nMOV [a], AX'), h('p', { class: 'muted' }, 'Short words (mnemonics) for CPU instructions. Specific to one CPU family. Needs an assembler.')),
            h('div', { class: 'card' }, h('h3', {}, 'Machine language'), h('pre', { class: 'code' }, '10111000 00000101 00000000\n00000101 00000011 00000000\n10100011 00000000 00100000'), h('p', { class: 'muted' }, 'Pure binary. The only thing the CPU actually runs. No translation needed.'))),
        h('h4', {}, 'Comparison'),
        table(['', 'Machine', 'Assembly', 'High-level'], [
            ['Written in', '0s and 1s', 'Mnemonics (MOV, ADD)', 'English-like words'],
            ['Translator', 'None', 'Assembler', 'Compiler or interpreter'],
            ['Speed', 'Fastest', 'Very fast', 'Fast (after compiling)'],
            ['Easy to write and fix?', 'Very hard', 'Hard', 'Easy'],
            ['Portable to other CPUs?', 'No', 'No', 'Yes'],
            ['Generation', '1GL', '2GL', '3GL (and 4GL like SQL)']
        ]),
        h('h4', {}, 'Language translators'),
        table(['Translator', 'Input → output', 'How', 'Examples'], [
            ['Assembler', 'Assembly → machine code', 'One instruction becomes one machine instruction', 'NASM, MASM'],
            ['Compiler', 'High-level → machine code (executable)', 'Translates the WHOLE program first, then you run it. Reports all errors together.', 'gcc (C), javac (Java → bytecode), Rust'],
            ['Interpreter', 'High-level → runs directly', 'Translates and runs ONE line at a time. Stops at the first error.', 'Python, JavaScript, Ruby']
        ]),
        note('Try both modes in the Compiler Lab tab with the "Has a bug on line 4" sample to see the difference for yourself.'));
}

/* ---------------- program development cycle ---------------- */

const CYCLE = [
    ['Problem definition', 'What exactly must the program do? Who will use it?'],
    ['Analysis', 'Inputs, outputs, constraints, and the data needed.'],
    ['Design', 'Write an algorithm and draw a flowchart or pseudocode (see Flowchart Studio).'],
    ['Coding', 'Turn the design into a programming language.'],
    ['Compile and debug', 'Translate the code and fix syntax errors.'],
    ['Testing', 'Run with normal, edge and wrong inputs. Fix logic and runtime errors.'],
    ['Documentation', 'Comments, README and user guide so others can use and maintain it.'],
    ['Deployment and maintenance', 'Release it, then fix bugs and add features over time.']
];

function cycle(panel) {
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Steps in developing a program'), h('p', {}, 'Programs are not just typed out. They go through a cycle, and real projects loop through it many times.'))),
        h('ol', { class: 'cycle-ring' }, CYCLE.map(([name, text], i) => h('li', { style: { '--i': i } }, h('b', {}, name), h('span', {}, text)))),
        h('h4', {}, 'How a C program becomes a running process'),
        h('div', { class: 'pipeline' }, [['hello.c', 'source code'], ['Preprocessor', 'expands #include, #define'], ['hello.i', 'pure C'], ['Compiler', 'checks syntax, optimises'], ['hello.s', 'assembly'], ['Assembler', ''], ['hello.o', 'object code'], ['Linker', 'joins libraries like printf'], ['hello (.exe)', 'executable'], ['Loader', 'OS copies it into RAM'], ['Process', 'running on the CPU']]
            .map(([name, text], i) => h('div', { class: i % 2 ? 'pipe-step' : 'pipe-file' }, h('b', {}, name), text ? h('small', {}, text) : null))),
        h('h4', {}, 'Three kinds of errors'),
        table(['Error', 'When found', 'Example'], [
            ['Syntax error', 'While compiling', 'Missing semicolon: let x = 5'],
            ['Runtime error', 'While running', 'Dividing by zero, file not found'],
            ['Logical error', 'Only by testing', 'Using + instead of * gives a wrong answer but no error message']
        ]));
}

export function mount(body, { args }) {
    const cleanups = [];
    const view = tabs([
        { id: 'lab', label: 'Compiler lab', render: (p) => cleanups.push(lab(p).cleanup) },
        { id: 'levels', label: 'Languages & translators', render: levels },
        { id: 'cycle', label: 'Program development', render: cycle }
    ], { app: 'compiler' });
    body.append(view.el);
    if (args?.tab) view.show(args.tab);
    return { cleanup: () => cleanups.forEach(fn => fn()), onArgs: (a) => a?.tab && view.show(a.tab) };
}
