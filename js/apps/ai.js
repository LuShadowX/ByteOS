// AI Studio: AI basics, generative AI and tools, prompt engineering, ethics,
// agentic AI, IoT, a working blockchain, and Web3.

import { h, s, tabs, table, note, sleep } from '../core/ui.js';

/* ---------------- basics ---------------- */

function basics(panel) {
    const rings = s('svg', { viewBox: '0 0 360 300', role: 'img', 'aria-label': 'AI contains machine learning, which contains deep learning, which contains generative AI' },
        ...[['Artificial Intelligence', 140, '#6d4c41'], ['Machine Learning', 104, '#2f6fed'], ['Deep Learning', 70, '#00a389'], ['Generative AI', 38, '#d81b60']].map(([label, r, color], i) => s('g', {},
            s('circle', { cx: 180, cy: 150 + (140 - r) * 0.55, r, fill: color, 'fill-opacity': 0.14 + i * 0.05, stroke: color, 'stroke-width': 2 }),
            s('text', { x: 180, y: 150 + (140 - r) * 0.55 - r + 20, 'text-anchor': 'middle', class: 'ai-ring__label', fill: color }, label))));
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'What is AI?'), h('p', {}, 'Artificial intelligence is getting computers to do things that normally need human intelligence: understanding language, recognising images, making decisions.'))),
        h('div', { class: 'split' }, h('div', { class: 'svg-box' }, rings), h('div', { class: 'stack' },
            h('div', { class: 'card' }, h('h3', {}, 'AI'), h('p', { class: 'muted' }, 'Any technique that makes machines act smart, even simple rules.')),
            h('div', { class: 'card' }, h('h3', {}, 'Machine learning'), h('p', { class: 'muted' }, 'Learns patterns from data instead of being told the rules. Show it 10,000 spam emails and it learns what spam looks like.')),
            h('div', { class: 'card' }, h('h3', {}, 'Deep learning'), h('p', { class: 'muted' }, 'ML with many-layered neural networks. Powers face unlock and speech recognition.')),
            h('div', { class: 'card' }, h('h3', {}, 'Generative AI'), h('p', { class: 'muted' }, 'Deep learning that creates new text, images, audio, video or code.')))),
        h('h4', {}, 'Real-life applications'),
        h('div', { class: 'info-cards' }, [['🏥 Healthcare', 'Reading X-rays and scans, predicting disease risk.'], ['🌾 Agriculture', 'Detecting crop disease from a phone photo, predicting yield.'], ['🏦 Banking', 'Spotting fraud in UPI and card transactions in real time.'], ['🚗 Transport', 'Google Maps traffic predictions, self-driving features.'], ['🎓 Education', 'Personal tutors, auto-grading, translating lectures.'], ['🎬 Entertainment', 'Netflix and YouTube recommendations, game NPCs.'], ['🗣️ Language', 'Translation, voice assistants, chatbots.'], ['🏭 Industry', 'Predicting machine failure, quality checks on assembly lines.']].map(([t, p]) => h('div', { class: 'info-card' }, h('h4', {}, t), h('p', {}, p)))),
        table(['', 'Narrow AI (today)', 'General AI (goal)'], [['Can do', 'One task very well', 'Any intellectual task a human can'], ['Examples', 'Chess engines, face unlock, ChatGPT', 'Does not exist yet']]));
}

/* ---------------- generative AI ---------------- */

function genai(panel) {
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Generative AI'), h('p', {}, 'Models trained on huge amounts of data that generate new content. Large language models predict the next word, again and again, very well.'))),
        h('h4', {}, 'Types of generative models'),
        table(['Model type', 'How it works (simply)', 'Used for'], [
            ['Transformers / LLMs', 'Predict the next token using attention over the whole context', 'Chatbots, writing, code'],
            ['Diffusion models', 'Start from noise and remove it step by step until an image appears', 'Image and video generation'],
            ['GANs', 'A generator and a discriminator compete until fakes look real', 'Faces, image upscaling, deepfakes'],
            ['VAEs', 'Compress data to a small code and generate variations from it', 'Image variations, anomaly detection']
        ]),
        h('h4', {}, 'Tools by category'),
        h('div', { class: 'grid-2' },
            ...[['✍️ Text generation', [['ChatGPT', 'OpenAI'], ['Gemini', 'Google'], ['Microsoft Copilot', 'Microsoft']]],
                ['🎨 Image generation', [['DALL·E', 'OpenAI'], ['Midjourney', 'Midjourney'], ['Adobe Firefly', 'Adobe'], ['Stable Diffusion', 'open source']]],
                ['🎬 Video and animation', [['Runway', 'text/image to video'], ['Sora', 'OpenAI'], ['Synthesia', 'AI presenters'], ['Pika', 'short clips']]],
                ['🔎 Research tools', [['Perplexity AI', 'answers with cited sources'], ['NotebookLM', 'chat with your own notes and PDFs'], ['Jenni AI', 'academic writing help with citations'], ['Elicit', 'finds and summarises papers']]]]
                .map(([title, tools]) => h('div', { class: 'card' }, h('h3', {}, title), h('ul', { class: 'tool-list' }, tools.map(([n, d]) => h('li', {}, h('b', {}, n), h('span', { class: 'muted' }, ` · ${d}`))))))),
        note('Generative AI can "hallucinate": produce confident, fluent text that is simply wrong. Always check facts, numbers and citations.'));
}

/* ---------------- prompt engineering ---------------- */

const CRITERIA = [
    ['Character (role)', /\b(you are|act as|as an? |pretend|role)\b/i, 'Give the AI a role: "You are a patient CS tutor…"'],
    ['Request (clear task)', /\b(explain|write|list|summari[sz]e|compare|create|generate|give|suggest|translate|make|draft|plan|teach|describe|design)\b/i, 'Start with a clear action verb: explain, compare, list…'],
    ['Examples', /\b(for example|e\.g\.|such as|like this|example)\b/i, 'Show an example of what you want.'],
    ['Adjustments (constraints)', /\b(\d+\s*(words|lines|points|bullets|sentences|steps|marks)|under|at most|no more than|avoid|don't|do not|only|simple|beginner)\b/i, 'Add limits: length, level, things to avoid.'],
    ['Type of output (format)', /\b(table|bullet|list|steps|json|code|paragraph|outline|flowchart|markdown|csv|email|essay)\b/i, 'Say what format you want: a table, bullets, steps…'],
    ['Extras (context, audience)', /\b(because|for (a|my|an)|audience|student|beginner|context|i am|i'm|semester|exam|class)\b/i, 'Add context: who it is for and why.']
];

const POOR = 'tell me about computers';
const GOOD = 'You are a friendly CS tutor. Explain the difference between RAM and ROM for a first-year B.Tech student preparing for an exam. Use a table with 5 rows and one real-life example for each, such as a laptop or a calculator. Keep it under 150 words and avoid jargon.';

function prompts(panel) {
    const input = h('textarea', { class: 'input', rows: 5, 'aria-label': 'Your prompt' });
    input.value = POOR;
    const out = h('div');
    const render = () => {
        const text = input.value;
        const hits = CRITERIA.map(([name, re, tip]) => [name, re.test(text), tip]);
        const score = hits.filter(([, ok]) => ok).length + (text.split(/\s+/).filter(Boolean).length >= 20 ? 0 : -1);
        const final = Math.max(0, Math.min(6, score));
        const color = final >= 5 ? 'var(--good)' : final >= 3 ? 'var(--warn)' : 'var(--bad)';
        out.replaceChildren(
            h('div', { class: 'row' }, h('div', { class: 'meter', style: { flex: 1, height: '12px' } }, h('span', { style: { '--v': `${(final / 6) * 100}%`, '--c': color } })), h('b', {}, `${final} / 6`)),
            h('ul', { class: 'criteria' }, hits.map(([name, ok, tip]) => h('li', { class: ok ? 'is-ok' : '' }, h('b', {}, `${ok ? '✓' : '○'} ${name}`), ok ? null : h('span', { class: 'muted' }, ` · ${tip}`)))),
            text.split(/\s+/).filter(Boolean).length < 20 ? h('p', { class: 'note note--warn' }, 'Very short prompts leave the AI guessing. Add detail.') : '');
    };
    input.addEventListener('input', render);
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Prompt engineering'), h('p', {}, 'The way you ask decides what you get. Type a prompt and it is checked against the CREATE framework (runs in your browser, no AI involved).'))),
        input,
        h('div', { class: 'row', style: { margin: '8px 0' } }, h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onClick: () => { input.value = POOR; render(); } }, 'Load a poor prompt'), h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onClick: () => { input.value = GOOD; render(); } }, 'Load a good prompt')),
        out,
        h('h4', {}, 'Poor vs good'),
        table(['Poor prompt', 'Why it fails', 'Better prompt'], [
            ['"tell me about computers"', 'Too vague: no topic, level, length or format', '"Explain the 5 functional units of a computer for a beginner, as a numbered list, under 100 words."'],
            ['"write code"', 'No language, no task', '"Write a Python function that checks if a number is prime. Add comments and 3 test cases."'],
            ['"make it better"', 'Better how?', '"Rewrite this paragraph to be more formal and half as long. Keep the technical terms."']
        ]),
        note('Tips: be specific, give context, ask for a format, show an example, and refine in follow-up messages. Treat the first answer as a draft.'));
    render();
}

/* ---------------- ethics ---------------- */

const SCENARIOS = [
    ['Using ChatGPT to understand a topic you found confusing, then writing the assignment yourself.', true, 'Fine: AI as a tutor. The work and the understanding are yours.'],
    ['Pasting the whole assignment question and submitting the AI\'s answer as your own.', false, 'Academic dishonesty. It also skips the learning the assignment was for.'],
    ['Pasting a friend\'s private chat or your company\'s source code into a public AI tool.', false, 'Privacy and confidentiality risk: what you paste may be stored and used.'],
    ['Using AI to generate an image for your presentation and saying it is AI-generated.', true, 'Fine, and being transparent is good practice.'],
    ['Citing a research paper that an AI suggested without checking it exists.', false, 'AI often invents realistic-looking citations. Always verify sources.'],
    ['Making a realistic fake video of a classmate as a joke.', false, 'Deepfakes of real people can be harassment and may be illegal.']
];

function ethics(panel) {
    const list = h('div', { class: 'stack' });
    SCENARIOS.forEach(([text, ok, why]) => {
        const result = h('p');
        const card = h('div', { class: 'card ethic' }, h('p', {}, text),
            h('div', { class: 'row' },
                h('button', { type: 'button', class: 'btn btn--sm', onClick: () => answer(true) }, '👍 Acceptable'),
                h('button', { type: 'button', class: 'btn btn--sm btn--danger', onClick: () => answer(false) }, '👎 Not okay')), result);
        const answer = (choice) => {
            card.querySelectorAll('button').forEach(b => { b.disabled = true; });
            result.className = `note ${choice === ok ? 'note--good' : 'note--bad'}`;
            result.textContent = `${choice === ok ? 'Right. ' : 'Think again. '}${why}`;
        };
        list.append(card);
    });
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Using AI ethically'), h('p', {}, 'AI tools are powerful. Using them well means being honest, careful and fair.'))),
        h('div', { class: 'info-cards' }, [['Verify', 'Check facts, numbers and sources. AI can be confidently wrong.'], ['Protect privacy', 'Never paste passwords, personal data or confidential code.'], ['Be honest', 'Follow your college\'s rules and say when you used AI.'], ['Watch for bias', 'Models learn from human data and can repeat its biases.'], ['Respect copyright', 'Generated content can resemble others\' work.'], ['No harm', 'No deepfakes, scams or harassment.']].map(([t, p]) => h('div', { class: 'info-card' }, h('h4', {}, t), h('p', {}, p)))),
        h('h4', {}, 'Acceptable or not?'), list);
}

/* ---------------- agentic AI ---------------- */

function agentic(panel) {
    const steps = [
        ['Perceive', 'Goal received: "Book the cheapest train from New Delhi to Jalandhar for tomorrow morning."'],
        ['Plan', 'Break it down: 1) search trains, 2) filter morning departures, 3) compare fares, 4) ask the user before paying.'],
        ['Act', 'Tool call → search_trains(from="NDLS", to="JUC", date=tomorrow)'],
        ['Observe', 'Got 9 trains, 4 leave before noon. Cheapest: 07:15 Express, Sleeper, ₹385 (the 06:40 Shatabdi only has chair car at ₹845).'],
        ['Plan', 'Best option found. Paying needs permission, so pause and confirm.'],
        ['Act', 'Message user: "07:15 Express, Sleeper, ₹385, 4h 50m. Shall I book it?"'],
        ['Observe', 'User replied: "Yes, book it."'],
        ['Act', 'Tool call → book_ticket(train="07:15 Express", class="SL")  ✓ PNR 4521938871'],
        ['Done', 'Goal complete. Reported the PNR and added the journey to the calendar.']
    ];
    const list = h('ol', { class: 'agent-steps' });
    const loop = h('div', { class: 'agent-loop' }, ['Perceive', 'Plan', 'Act', 'Observe'].map(p => h('span', { dataset: { p } }, p)));
    let running = false;
    const run = async () => {
        if (running) return;
        running = true;
        list.replaceChildren();
        for (const [phase, text] of steps) {
            loop.querySelectorAll('span').forEach(el => el.classList.toggle('is-on', el.dataset.p === phase));
            list.append(h('li', { class: `agent-${phase.toLowerCase()}` }, h('b', {}, phase), ' ', text));
            await sleep(900);
        }
        loop.querySelectorAll('span').forEach(el => el.classList.remove('is-on'));
        running = false;
    };
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Agentic AI'), h('p', {}, 'A chatbot answers. An agent acts: it takes a goal, plans steps, uses tools (search, apps, APIs), checks the results and keeps going until the goal is done.'))),
        h('div', { class: 'split' }, h('div', {}, loop, h('button', { type: 'button', class: 'btn', onClick: run, style: { marginTop: '12px' } }, 'Run the travel agent'), list),
            h('div', { class: 'card' }, h('h3', {}, 'Chatbot vs agent'), table(['', 'Chatbot', 'AI agent'], [['Input', 'A question', 'A goal'], ['Output', 'Text', 'Actions + results'], ['Uses tools?', 'Rarely', 'Yes: search, code, apps, APIs'], ['Steps', 'One reply', 'Many, in a loop'], ['Risk', 'Wrong answer', 'Wrong action, so it needs limits and human approval']]))),
        note('Notice step 5: a well-designed agent asks a human before doing anything costly or irreversible.'));
}

/* ---------------- IoT ---------------- */

function iot(panel) {
    const state = { temp: 31, motion: true, light: 20, auto: true };
    const devices = h('div', { class: 'grid-3' });
    const rulesEl = h('ul', { class: 'iot-rules' });
    const slider = (label, key, min, max, unit) => {
        const out = h('b', {}, `${state[key]}${unit}`);
        return h('label', { class: 'field' }, h('span', {}, label, ' ', out), h('input', { type: 'range', min, max, value: state[key], onInput: e => { state[key] = Number(e.target.value); out.textContent = `${state[key]}${unit}`; render(); } }));
    };
    const render = () => {
        const fan = state.auto && state.temp > 28;
        const lamp = state.auto && state.motion && state.light < 40;
        const ac = state.auto && state.temp > 33;
        const alert = !state.auto ? false : state.motion && new Date().getHours() < 5;
        devices.replaceChildren(
            h('div', { class: `stat iot-dev${fan ? ' is-on' : ''}` }, h('span', {}, '🌀 Ceiling fan'), h('b', {}, fan ? 'ON' : 'off')),
            h('div', { class: `stat iot-dev${lamp ? ' is-on' : ''}` }, h('span', {}, '💡 Smart bulb'), h('b', {}, lamp ? 'ON' : 'off')),
            h('div', { class: `stat iot-dev${ac ? ' is-on' : ''}` }, h('span', {}, '❄️ Air conditioner'), h('b', {}, ac ? 'ON' : 'off')));
        rulesEl.replaceChildren(
            h('li', { class: fan ? 'is-fired' : '' }, 'IF temperature > 28 °C THEN fan ON'),
            h('li', { class: ac ? 'is-fired' : '' }, 'IF temperature > 33 °C THEN AC ON'),
            h('li', { class: lamp ? 'is-fired' : '' }, 'IF motion AND light < 40% THEN bulb ON'),
            h('li', { class: alert ? 'is-fired' : '' }, 'IF motion between 00:00 and 05:00 THEN phone alert'));
    };
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Internet of Things (IoT)'), h('p', {}, 'Everyday objects with sensors and internet connections that collect data and act on it. Move the sensors and watch the smart room react.'))),
        h('div', { class: 'split' },
            h('div', { class: 'card' }, h('h3', {}, 'Sensors'), slider('🌡️ Temperature', 'temp', 15, 40, ' °C'), slider('☀️ Light level', 'light', 0, 100, '%'),
                h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: state.motion, onChange: e => { state.motion = e.target.checked; render(); } }), '🚶 Motion detected'),
                h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: state.auto, onChange: e => { state.auto = e.target.checked; render(); } }), 'Automation rules enabled')),
            h('div', {}, h('h4', { style: { marginTop: 0 } }, 'Actuators'), devices, h('h4', {}, 'Rules (highlighted = firing)'), rulesEl)),
        h('h4', {}, 'IoT architecture'),
        h('div', { class: 'comm-flow' }, [['Sensors & devices', 'temperature, motion, GPS'], ['Gateway', 'Wi-Fi router or hub'], ['Cloud', 'stores data, runs rules and AI'], ['App', 'your phone dashboard'], ['Actuators', 'fan, lock, motor']].map(([a, b]) => h('div', {}, h('b', {}, a), h('small', {}, b)))),
        h('div', { class: 'row', style: { marginTop: '10px' } }, ['Smart homes', 'Fitness bands', 'Smart farming (soil sensors)', 'FASTag tolls', 'Smart city traffic lights', 'Industrial machines'].map(t => h('span', { class: 'chip' }, t))),
        note('Security matters: many IoT devices ship with default passwords. Always change them and keep firmware updated.'));
    render();
}

/* ---------------- blockchain ---------------- */

async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function blockchain(panel) {
    const DIFFICULTY = '000';
    const chain = [
        { data: 'Genesis block', nonce: 0, hash: '' },
        { data: 'Asha pays Ravi 50 coins', nonce: 0, hash: '' },
        { data: 'Ravi pays Meera 20 coins', nonce: 0, hash: '' }
    ];
    const list = h('div', { class: 'chain' });
    const status = h('p');
    let mining = false;

    const blockHash = (b, i, prev) => sha256(`${i}|${b.data}|${prev}|${b.nonce}`);
    const mine = async (i) => {
        const prev = i ? chain[i - 1].hash : '0'.repeat(64);
        const b = chain[i];
        b.nonce = 0;
        while (true) {
            b.hash = await blockHash(b, i, prev);
            if (b.hash.startsWith(DIFFICULTY)) return;
            b.nonce++;
            if (b.nonce % 400 === 0) { status.textContent = `Mining block ${i}… tried ${b.nonce} nonces`; await sleep(0); }
        }
    };
    const render = async () => {
        let valid = true;
        const cards = [];
        // each block is checked against the REAL current hash of the block before it,
        // so one edited block breaks every block after it
        let prevActual = '0'.repeat(64);
        for (let i = 0; i < chain.length; i++) {
            const b = chain[i];
            const prev = prevActual;
            const actual = await blockHash(b, i, prev);
            prevActual = actual;
            const ok = actual === b.hash && actual.startsWith(DIFFICULTY);
            if (!ok) valid = false;
            const data = h('textarea', { class: 'input', rows: 2, 'aria-label': `Block ${i} data` });
            data.value = b.data;
            data.addEventListener('input', () => { b.data = data.value; render(); });
            cards.push(h('div', { class: `block${ok ? '' : ' is-broken'}` },
                h('div', { class: 'row' }, h('b', {}, `Block #${i}`), h('span', { class: `badge ${ok ? 'badge--good' : 'badge--bad'}` }, ok ? 'valid' : 'invalid'), h('button', { type: 'button', class: 'btn btn--sm btn--ghost', style: { marginLeft: 'auto' }, onClick: async () => { if (mining) return; mining = true; for (let k = i; k < chain.length; k++) await mine(k); mining = false; render(); } }, 'Mine')),
                h('label', { class: 'field' }, h('span', {}, 'Data'), data),
                h('p', { class: 'mono hashline' }, h('span', {}, 'Nonce '), String(b.nonce)),
                h('p', { class: 'mono hashline' }, h('span', {}, 'Prev  '), prev.slice(0, 22) + '…'),
                h('p', { class: `mono hashline${ok ? '' : ' bad-text'}` }, h('span', {}, 'Hash  '), actual.slice(0, 22) + '…')));
        }
        list.replaceChildren(...cards);
        status.className = `note ${valid ? 'note--good' : 'note--bad'}`;
        status.textContent = valid ? `Chain is valid: every hash starts with "${DIFFICULTY}" and every block points to the one before it.` : 'Chain broken! A block was changed, so its hash no longer matches and every block after it is invalid too. Re-mine to fix it, which is exactly the work an attacker would have to redo faster than everyone else.';
    };
    const init = async () => {
        status.textContent = 'Mining the starting blocks…';
        mining = true;
        for (let i = 0; i < chain.length; i++) await mine(i);
        mining = false;
        render();
    };
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Blockchain'), h('p', {}, 'A chain of blocks where each block stores the hash of the one before it. Change any old block and the chain visibly breaks. This one uses real SHA-256 and proof-of-work mining.'))),
        h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', onClick: async () => { if (mining) return; chain.push({ data: 'New transaction', nonce: 0, hash: '' }); mining = true; await mine(chain.length - 1); mining = false; render(); } }, '+ Add and mine a block'), h('span', { class: 'muted' }, 'Try editing Block #1\'s data.')),
        status, list,
        table(['Idea', 'Meaning'], [['Hash', 'A fingerprint of the block\'s contents (SHA-256)'], ['Nonce', 'A number the miner changes until the hash starts with enough zeros'], ['Proof of work', 'Finding that nonce takes effort, so rewriting history is expensive'], ['Decentralised', 'Thousands of computers keep a copy and reject a chain that does not add up']]));
    init();
}

/* ---------------- Web3 ---------------- */

function web3(panel) {
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Web1 → Web2 → Web3'), h('p', {}, 'How the web has changed, and the idea of a web owned by its users.'))),
        table(['', 'Web1 (1990s)', 'Web2 (2005–today)', 'Web3 (emerging)'], [
            ['In one line', 'Read', 'Read + write', 'Read + write + own'],
            ['You could', 'Read static pages', 'Post, share, comment', 'Own data and digital assets'],
            ['Who controls it', 'Site owners', 'Big platforms (Google, Meta)', 'Users, through blockchains'],
            ['Login', 'None', 'Email / Google account', 'Crypto wallet'],
            ['Examples', 'Early Yahoo, personal homepages', 'YouTube, Instagram, Wikipedia', 'Ethereum apps, DAOs, NFTs']
        ]),
        h('h4', {}, 'Building blocks'),
        h('div', { class: 'info-cards' }, [['Wallet', 'An app holding the keys that prove you own your assets (e.g. MetaMask).'], ['Smart contract', 'Code on a blockchain that runs exactly as written, e.g. releasing payment when goods arrive.'], ['dApp', 'An app whose backend is smart contracts instead of a company server.'], ['Token / NFT', 'Digital assets: tokens are interchangeable, NFTs are unique.'], ['DAO', 'A group run by votes recorded on a blockchain instead of a manager.']].map(([t, p]) => h('div', { class: 'info-card' }, h('h4', {}, t), h('p', {}, p)))),
        note('Be careful: Web3 is full of scams and hype. If you lose your wallet keys, nobody can recover them, and nobody can reverse a fraudulent transaction.'));
}

export function mount(body, { args }) {
    const view = tabs([
        { id: 'basics', label: 'AI basics', render: basics },
        { id: 'genai', label: 'Generative AI & tools', render: genai },
        { id: 'prompts', label: 'Prompt lab', render: prompts },
        { id: 'ethics', label: 'Ethics', render: ethics },
        { id: 'agentic', label: 'Agentic AI', render: agentic },
        { id: 'iot', label: 'IoT', render: iot },
        { id: 'blockchain', label: 'Blockchain', render: blockchain },
        { id: 'web3', label: 'Web3', render: web3 }
    ], { app: 'ai' });
    body.append(view.el);
    if (args?.tab) view.show(args.tab);
    return { onArgs: (a) => a?.tab && view.show(a.tab) };
}
