// Security Center: CIA triad, password cracking, hashing and rainbow tables, real TOTP 2FA,
// phishing, malware, account types and a firewall rule tester.

import { h, s, tabs, table, note } from '../core/ui.js';
import { store } from '../core/store.js';

/* ---------------- CIA ---------------- */

function cia(panel) {
    const PARTS = [
        ['Confidentiality', 'Only the right people can see the data.', 'Data leak, shoulder surfing, stolen password', 'Encryption, passwords, permissions, MFA', '#2f6fed'],
        ['Integrity', 'Data is accurate and has not been secretly changed.', 'Someone edits marks in a database, a file is tampered with in transit', 'Hashing, digital signatures, backups, version control', '#00a389'],
        ['Availability', 'Systems and data are there when needed.', 'DDoS attack floods a website, ransomware locks files, power failure', 'Backups, RAID, redundant servers, DDoS protection', '#ef6c00']
    ];
    const QUIZ = [['A hacker floods the exam portal with fake traffic so students cannot log in.', 'Availability'], ['Someone changes a student\'s grade in the database.', 'Integrity'], ['A list of student phone numbers is posted online.', 'Confidentiality'], ['Ransomware encrypts a hospital\'s records.', 'Availability']];
    let i = 0;
    const box = h('div', { class: 'card' });
    const ask = () => {
        const [text, answer] = QUIZ[i % QUIZ.length];
        box.replaceChildren(h('small', { class: 'muted' }, 'Which part of the CIA triad is attacked?'), h('h3', {}, text),
            ...PARTS.map(([name]) => h('button', { type: 'button', class: 'quiz-option', onClick: e => {
                e.target.classList.add(name === answer ? 'is-right' : 'is-wrong');
                box.querySelectorAll('.quiz-option').forEach(b => { b.disabled = true; if (b.textContent === answer) b.classList.add('is-right'); });
                setTimeout(() => { i++; ask(); }, 1300);
            } }, name)));
    };
    ask();
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'The CIA triad'), h('p', {}, 'Every security measure protects one of three things. Every attack breaks at least one of them.'))),
        h('div', { class: 'grid-3' }, PARTS.map(([name, def, threat, defend, color]) => h('div', { class: 'card cia-card', style: { '--c': color } }, h('h3', {}, name), h('p', {}, def), h('p', { class: 'muted' }, h('b', {}, 'Threats: '), threat), h('p', { class: 'muted' }, h('b', {}, 'Protection: '), defend)))),
        h('h4', {}, 'Common threat vectors'),
        h('div', { class: 'row' }, ['Phishing emails', 'Weak or reused passwords', 'Unpatched software', 'Malicious USB drives', 'Public Wi-Fi', 'Fake apps and downloads', 'Social engineering'].map(t => h('span', { class: 'chip' }, t))),
        h('h4', {}, 'Practice'), box);
}

/* ---------------- passwords ---------------- */

const COMMON = ['123456', 'password', '123456789', '12345678', '12345', 'qwerty', 'abc123', 'password1', '111111', '123123', 'admin', 'letmein', 'welcome', 'monkey', 'dragon', 'football', 'iloveyou', 'sunshine', 'princess', 'master', 'login', 'passw0rd', 'shadow', 'superman', 'trustno1', 'qwerty123', '1q2w3e4r', 'zaq12wsx', 'baseball', 'starwars', 'india', 'india123', 'cricket', 'krishna', 'sachin', 'pokemon', 'naruto', 'computer', 'student', 'college', 'hello', 'freedom', 'whatever', 'ninja', 'mustang', 'secret', 'lovely', 'chocolate', 'samsung', 'google'];
const WORDS = ['river', 'pencil', 'tiger', 'mango', 'orbit', 'castle', 'lantern', 'violet', 'rocket', 'puzzle', 'garden', 'monsoon', 'falcon', 'marble', 'cactus', 'harbor', 'spice', 'thunder', 'kettle', 'saffron', 'glacier', 'bamboo', 'compass', 'meadow'];
const LEET = { '@': 'a', 4: 'a', 3: 'e', 1: 'i', '!': 'i', 0: 'o', $: 's', 5: 's', 7: 't' };

function crackTime(seconds) {
    if (seconds < 1) return 'instantly';
    const units = [['second', 60], ['minute', 60], ['hour', 24], ['day', 365], ['year', 100], ['century', 1e6]];
    let v = seconds;
    for (const [unit, size] of units) {
        if (v < size) return `${Math.round(v)} ${unit}${Math.round(v) === 1 ? '' : 's'}`;
        v /= size;
    }
    return v > 1e3 ? 'longer than the age of the universe' : `${Math.round(v)} million centuries`;
}

export function analyse(pw) {
    const pool = (/[a-z]/.test(pw) ? 26 : 0) + (/[A-Z]/.test(pw) ? 26 : 0) + (/\d/.test(pw) ? 10 : 0) + (/[^a-zA-Z\d]/.test(pw) ? 33 : 0);
    let bits = pw.length * Math.log2(pool || 1);
    const issues = [];
    const lower = pw.toLowerCase();
    const unleet = [...lower].map(c => LEET[c] ?? c).join('');
    // strip a trailing number/symbol suffix first ("password123!"), then undo leetspeak
    const stem = [...lower.replace(/[\d!@#$%^&*]+$/, '')].map(c => LEET[c] ?? c).join('');
    let attack = 'brute force (trying every combination)';
    if (COMMON.includes(lower)) { bits = Math.min(bits, 4); issues.push('It is in the list of the most common passwords. Attackers try these first.'); attack = 'dictionary attack'; }
    else if (COMMON.includes(unleet) || COMMON.includes(stem) || WORDS.includes(stem)) { bits = Math.min(bits, 14); issues.push('It is a common word with simple changes (like @ for a or 123 at the end). Cracking tools try these "mangling rules" automatically.'); attack = 'dictionary attack with rules'; }
    if (/(.)\1{2,}/.test(pw)) { bits -= 6; issues.push('Repeated characters (like "aaa") add almost nothing.'); }
    if (/(0123|1234|2345|3456|4567|5678|6789|abcd|qwer|asdf|zxcv)/i.test(pw)) { bits -= 10; issues.push('Keyboard or number sequences are among the first patterns tried.'); }
    if (/(19|20)\d{2}/.test(pw)) { bits -= 4; issues.push('A year (like a birth year) is easy to guess.'); }
    if (pw.length < 8) issues.push('Shorter than 8 characters.');
    bits = Math.max(0, bits);
    const guesses = 2 ** bits / 2;
    const score = bits < 28 ? 0 : bits < 36 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
    return { pool, bits, offline: guesses / 1e10, online: guesses / 100, score, issues, attack };
}

function passwords(panel) {
    const input = h('input', { class: 'input big-input', type: 'password', value: 'Lpu@2024', 'aria-label': 'Password to test', autocomplete: 'off' });
    const show = h('input', { type: 'checkbox', onChange: e => { input.type = e.target.checked ? 'text' : 'password'; } });
    const out = h('div');
    const LABELS = [['Very weak', '#d93a3a'], ['Weak', '#ef6c00'], ['Fair', '#c77700'], ['Strong', '#1f9d55'], ['Very strong', '#0f7a40']];
    const render = () => {
        const pw = input.value;
        if (!pw) { out.replaceChildren(); return; }
        const r = analyse(pw);
        const [label, color] = LABELS[r.score];
        const checks = [[pw.length >= 12, '12+ characters'], [/[a-z]/.test(pw) && /[A-Z]/.test(pw), 'upper and lower case'], [/\d/.test(pw), 'a number'], [/[^a-zA-Z\d]/.test(pw), 'a symbol'], [!r.issues.some(i => i.includes('common') || i.includes('word')), 'not a common word']];
        out.replaceChildren(
            h('div', { class: 'row' }, h('div', { class: 'meter', style: { flex: 1, height: '12px' } }, h('span', { style: { '--v': `${(r.score + 1) * 20}%`, '--c': color } })), h('b', { style: { color } }, label)),
            h('div', { class: 'grid-4', style: { marginTop: '12px' } },
                h('div', { class: 'stat' }, h('span', {}, 'Characters to choose from'), h('b', {}, r.pool)),
                h('div', { class: 'stat' }, h('span', {}, 'Entropy'), h('b', {}, `${Math.round(r.bits)} bits`)),
                h('div', { class: 'stat' }, h('span', {}, 'Offline attack (10 billion guesses/s)'), h('b', { style: { fontSize: '17px' } }, crackTime(r.offline))),
                h('div', { class: 'stat' }, h('span', {}, 'Online attack (100 guesses/s)'), h('b', { style: { fontSize: '17px' } }, crackTime(r.online)))),
            h('p', {}, h('b', {}, 'Fastest way to crack it: '), r.attack),
            r.issues.length ? h('ul', { class: 'issues' }, r.issues.map(i => h('li', {}, i))) : h('p', { class: 'note note--good' }, 'No obvious patterns found.'),
            h('div', { class: 'row' }, checks.map(([ok, text]) => h('span', { class: `chip ${ok ? 'chip--ok' : ''}` }, ok ? '✓ ' : '○ ', text))));
    };
    input.addEventListener('input', render);

    const phrase = h('code', { class: 'phrase' });
    const makePhrase = () => {
        const rnd = new Uint32Array(5);
        crypto.getRandomValues(rnd);
        const words = [...rnd].slice(0, 4).map(n => WORDS[n % WORDS.length]);
        const pw = `${words.map(w => w[0].toUpperCase() + w.slice(1)).join('-')}-${rnd[4] % 90 + 10}`;
        phrase.textContent = pw;
        return pw;
    };
    makePhrase();

    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'How fast can your password be cracked?'), h('p', {}, 'Everything runs inside your browser. Nothing you type is sent or saved.'))),
        h('div', { class: 'row' }, h('div', { style: { flex: 1 } }, input), h('label', { class: 'row' }, show, 'Show')), out,
        h('h4', {}, 'Three ways passwords get cracked'),
        h('div', { class: 'grid-3' },
            h('div', { class: 'card' }, h('h3', {}, 'Brute force'), h('p', { class: 'muted' }, 'Try every possible combination: aaaa, aaab, aaac… Unstoppable against short passwords. Every extra character multiplies the work.')),
            h('div', { class: 'card' }, h('h3', {}, 'Dictionary'), h('p', { class: 'muted' }, 'Try leaked passwords and dictionary words first, with tweaks like P@ssw0rd and adding 123. Cracks most human-made passwords.')),
            h('div', { class: 'card' }, h('h3', {}, 'Rainbow table'), h('p', { class: 'muted' }, 'Look the stolen hash up in a giant pre-computed table of hashes. Defeated by salting (see the Hashing tab).'))),
        h('div', { class: 'card', style: { marginTop: '14px' } }, h('h3', {}, 'Better: a passphrase'), h('p', {}, 'Four random words are easy to remember and very hard to crack. '), h('div', { class: 'row' }, phrase, h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onClick: makePhrase }, 'New one'), h('button', { type: 'button', class: 'btn btn--sm', onClick: () => { input.value = phrase.textContent; render(); } }, 'Test it'))),
        note('Best practice: a unique password for every account, kept in a password manager, plus multi-factor authentication.'));
    render();
}

/* ---------------- hashing ---------------- */

async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function hashing(panel) {
    const input = h('input', { class: 'input', value: 'iloveyou', 'aria-label': 'Password to hash' });
    const salted = h('input', { type: 'checkbox' });
    let salt = store.get('salt') ?? [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join('');
    store.set('salt', salt);
    const hashEl = h('code', { class: 'hash' });
    const saltEl = h('code', {}, salt);
    const verdict = h('div');
    const rainbowBody = h('tbody');
    const RAINBOW = ['123456', 'password', 'qwerty', 'iloveyou', 'admin', 'letmein', 'monkey', 'dragon', 'cricket', 'india123'];
    let rainbow = [];

    const render = async () => {
        const pw = input.value;
        const value = salted.checked ? salt + pw : pw;
        const digest = await sha256(value);
        hashEl.textContent = digest;
        const hit = rainbow.find(([, hsh]) => hsh === digest);
        rainbowBody.querySelectorAll('tr').forEach(tr => tr.classList.toggle('is-hit', tr.dataset.hash === digest));
        verdict.replaceChildren(h('p', { class: `note ${hit ? 'note--bad' : 'note--good'}` }, hit
            ? `Cracked instantly: this hash is in the rainbow table, so the attacker knows the password is "${hit[0]}".`
            : salted.checked ? 'Not in the table. Because of the random salt, the attacker would need a separate table for every salt, which is impractical.' : 'Not in this table, but a real rainbow table holds billions of hashes. Add a salt to be safe.'));
    };

    (async () => {
        rainbow = await Promise.all(RAINBOW.map(async pw => [pw, await sha256(pw)]));
        rainbowBody.replaceChildren(...rainbow.map(([pw, hsh]) => h('tr', { dataset: { hash: hsh } }, h('td', { class: 'mono' }, hsh.slice(0, 24) + '…'), h('th', { scope: 'row' }, pw))));
        render();
    })();
    input.addEventListener('input', render);
    salted.addEventListener('change', render);

    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Hashing, salting and rainbow tables'), h('p', {}, 'Websites should never store your password, only its hash: a one-way fingerprint. This uses your browser\'s real SHA-256.'))),
        h('div', { class: 'row' }, h('label', { class: 'field', style: { flex: 1 } }, h('span', {}, 'Password'), input), h('label', { class: 'row' }, salted, 'Add salt ', saltEl)),
        h('p', {}, h('b', {}, 'SHA-256 hash: '), hashEl),
        h('p', { class: 'muted' }, 'Change a single letter and the whole hash changes (the avalanche effect). You cannot turn the hash back into the password.'),
        verdict,
        h('div', { class: 'split' },
            h('div', {}, h('h4', {}, 'The attacker\'s rainbow table'), h('table', { class: 'data' }, h('thead', {}, h('tr', {}, h('th', {}, 'Hash'), h('th', {}, 'Password'))), rainbowBody)),
            h('div', { class: 'card' }, h('h3', {}, 'How salting helps'), h('ol', { class: 'steps' },
                h('li', {}, 'The site makes a random salt for each user.'),
                h('li', {}, 'It stores salt + hash(salt + password).'),
                h('li', {}, 'Two users with the same password get different hashes.'),
                h('li', {}, 'Pre-computed tables become useless: the attacker must brute-force each user separately.')),
                h('p', { class: 'muted' }, 'Real sites also use deliberately slow hashes (bcrypt, Argon2) so each guess takes time.'))));
}

/* ---------------- MFA (real TOTP, RFC 6238) ---------------- */

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const base32 = (bytes) => {
    let bits = '';
    bytes.forEach(b => { bits += b.toString(2).padStart(8, '0'); });
    return bits.match(/.{1,5}/g).map(chunk => B32[parseInt(chunk.padEnd(5, '0'), 2)]).join('');
};
const unbase32 = (text) => {
    const bits = [...text.replace(/=+$/, '').toUpperCase()].map(c => B32.indexOf(c).toString(2).padStart(5, '0')).join('');
    return new Uint8Array(bits.match(/.{8}/g).map(b => parseInt(b, 2)));
};

export async function totp(secretBytes, time = Date.now(), step = 30, digits = 6) {
    const counter = Math.floor(time / 1000 / step);
    const msg = new ArrayBuffer(8);
    const view = new DataView(msg);
    view.setUint32(0, Math.floor(counter / 2 ** 32));
    view.setUint32(4, counter >>> 0);
    const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
    const offset = sig[sig.length - 1] & 0x0f;
    const code = (((sig[offset] & 0x7f) << 24) | (sig[offset + 1] << 16) | (sig[offset + 2] << 8) | sig[offset + 3]) % 10 ** digits;
    return String(code).padStart(digits, '0');
}

function mfa(panel) {
    let secret = store.get('totp-secret');
    if (!secret) { secret = base32(crypto.getRandomValues(new Uint8Array(20))); store.set('totp-secret', secret); }
    const key = unbase32(secret);
    const codeEl = h('b', { class: 'totp-code' }, '------');
    const ring = s('circle', { cx: 22, cy: 22, r: 18, class: 'totp-ring__bar' });
    const left = h('span', { class: 'totp-left' });
    const result = h('div');
    const codeIn = h('input', { class: 'input mono big-input', inputmode: 'numeric', maxlength: 6, placeholder: '6-digit code', 'aria-label': 'Code from your phone' });
    const pass = h('input', { class: 'input', type: 'password', value: 'correct horse', 'aria-label': 'Password' });
    let timer;

    const tick = async () => {
        const now = Date.now();
        const remaining = 30 - Math.floor((now / 1000) % 30);
        left.textContent = `${remaining}s`;
        ring.style.strokeDashoffset = String(113 * (1 - remaining / 30));
        const code = await totp(key, now);
        codeEl.textContent = `${code.slice(0, 3)} ${code.slice(3)}`;
    };

    const verify = async () => {
        const entered = codeIn.value.replace(/\s/g, '');
        if (!pass.value) { result.replaceChildren(h('p', { class: 'note note--bad' }, 'Factor 1 missing: enter the password.')); return; }
        if (!/^\d{6}$/.test(entered)) { result.replaceChildren(h('p', { class: 'note note--bad' }, 'The code must be exactly 6 digits.')); return; }
        const now = Date.now();
        // allow one 30-second step either side for clock drift, like real servers
        const valid = (await Promise.all([-1, 0, 1].map(w => totp(key, now + w * 30000)))).includes(entered);
        result.replaceChildren(h('p', { class: `note ${valid ? 'note--good' : 'note--bad'}` }, valid
            ? 'Logged in! Password (something you know) + code (something you have) both checked out.'
            : 'Wrong or expired code. Even with the right password, the login is refused. That is the whole point of MFA.'));
    };
    codeIn.addEventListener('keydown', e => { if (e.key === 'Enter') verify(); });

    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Multi-factor authentication'), h('p', {}, 'Logging in with two or more different kinds of proof. Even if your password leaks, the attacker still needs your phone.'))),
        h('div', { class: 'grid-3' },
            h('div', { class: 'card' }, h('h3', {}, '1 · Something you know'), h('p', { class: 'muted' }, 'Password, PIN, security question')),
            h('div', { class: 'card' }, h('h3', {}, '2 · Something you have'), h('p', { class: 'muted' }, 'Phone with an authenticator app, OTP SMS, security key')),
            h('div', { class: 'card' }, h('h3', {}, '3 · Something you are'), h('p', { class: 'muted' }, 'Fingerprint, face, iris (biometrics)'))),
        h('div', { class: 'grid-2', style: { marginTop: '14px' } },
            h('div', { class: 'card phone' }, h('h3', {}, '📱 Authenticator app'),
                h('div', { class: 'row' }, codeEl, h('div', { class: 'totp-ring' }, s('svg', { viewBox: '0 0 44 44' }, s('circle', { cx: 22, cy: 22, r: 18, class: 'totp-ring__bg' }), ring), left)),
                h('p', { class: 'muted' }, 'A new code every 30 seconds, calculated from a shared secret and the current time (TOTP).'),
                h('small', { class: 'muted' }, 'Setup key (you can type it into Google Authenticator and see the same codes):'),
                h('code', { class: 'secret' }, secret.match(/.{1,4}/g).join(' '))),
            h('div', { class: 'card' }, h('h3', {}, '🔐 ByteOS login'),
                h('label', { class: 'field' }, h('span', {}, 'Username'), h('input', { class: 'input', value: 'lukshya', disabled: true })),
                h('label', { class: 'field' }, h('span', {}, 'Password'), pass),
                h('label', { class: 'field' }, h('span', {}, 'Code from your authenticator'), codeIn),
                h('button', { type: 'button', class: 'btn', style: { marginTop: '10px' }, onClick: verify }, 'Log in'), result)),
        note('TOTP = HMAC-SHA1(secret, current 30-second window), then shortened to 6 digits. The server does the same calculation and compares.'));
    tick();
    timer = setInterval(tick, 1000);
    return { cleanup: () => clearInterval(timer) };
}

/* ---------------- phishing ---------------- */

const EMAILS = [
    {
        from: 'LPU Accounts', addr: 'fees-update@lpu-verify-portal.com', subject: 'URGENT: Your UMS account will be suspended in 24 hours', verdict: 'phishing',
        parts: [['Dear Student,', null], ['\n\nWe noticed unusual activity. ', null], ['Your account will be permanently suspended in 24 hours', 'Urgency and threats are designed to make you panic and act without thinking.'], [' unless you verify your fee payment.\n\n', null], ['Click here to verify: http://lpu-verify-portal.com/login', 'The link goes to a look-alike domain, not lpu.in. Hover over links before clicking.'], ['\n\nPlease also ', null], ['reply with your UMS password', 'No real organisation ever asks for your password by email.'], [' for faster processing.\n\nRegards,\nAccounts Team', null]],
        fromFlag: 'The sender domain is lpu-verify-portal.com, not lpu.in.'
    },
    {
        from: 'GitHub', addr: 'noreply@github.com', subject: '[GitHub] A new SSH key was added to your account', verdict: 'legit',
        parts: [['Hey LuShadowX!\n\nA new public key was added to your account from a device you used today.\n\nIf you did this, you can ignore this email. If not, review your keys at github.com/settings/keys and change your password.\n\nThanks,\nThe GitHub Team', null]],
        fromFlag: null
    },
    {
        from: 'Amaz0n Rewards', addr: 'gift@amaz0n-prizes.net', subject: 'Congratulations!! You won a ₹50,000 gift card 🎁', verdict: 'phishing',
        parts: [['Congratulations!! You have been ', null], ['randomly selected as our lucky winner', 'Prizes you never entered for are a classic bait.'], ['!\n\nTo claim, just pay a small ', null], ['processing fee of ₹99', 'Real prizes never ask you to pay first.'], [' and enter your ', null], ['card number and OTP', 'Never share card details or an OTP. The OTP lets them complete a payment.'], [' at our secure page.\n\n', null], ['Offer valid for 10 minutes only!!!', 'Artificial deadlines plus lots of exclamation marks.']],
        fromFlag: 'Amaz0n with a zero, on an unrelated domain.'
    }
];

function phishing(panel) {
    let i = 0;
    let score = 0;
    const box = h('div');
    const show = () => {
        if (i >= EMAILS.length) {
            box.replaceChildren(h('div', { class: 'card' }, h('h3', {}, `You judged ${score} of ${EMAILS.length} emails correctly.`), h('button', { type: 'button', class: 'btn', onClick: () => { i = 0; score = 0; show(); } }, 'Start again')));
            return;
        }
        const mail = EMAILS[i];
        const bodyEl = h('div', { class: 'mail__body' }, mail.parts.map(([text, flag]) => (flag ? h('mark', { class: 'flag', dataset: { flag } }, text) : text)));
        const fromEl = h('span', { class: 'mail__addr' }, `<${mail.addr}>`);
        const reveal = h('div');
        const decide = (choice) => {
            const right = choice === mail.verdict;
            if (right) score++;
            box.querySelectorAll('.mail-actions button').forEach(b => { b.disabled = true; });
            box.querySelector('.mail').classList.add('is-revealed');
            if (mail.fromFlag) fromEl.classList.add('flag-on');
            const flags = mail.parts.filter(([, f]) => f).map(([, f]) => f);
            reveal.replaceChildren(h('div', { class: `note ${right ? 'note--good' : 'note--bad'}` },
                h('strong', {}, right ? 'Correct! ' : 'Not quite. '), mail.verdict === 'phishing' ? 'This is phishing. Red flags:' : 'This one is genuine: correct domain, no request for secrets, and it tells you to go to the site yourself.',
                flags.length || mail.fromFlag ? h('ul', {}, [mail.fromFlag, ...flags].filter(Boolean).map(f => h('li', {}, f))) : null),
                h('button', { type: 'button', class: 'btn', onClick: () => { i++; show(); } }, i < EMAILS.length - 1 ? 'Next email' : 'See score'));
        };
        box.replaceChildren(
            h('article', { class: 'mail' },
                h('header', {}, h('b', {}, mail.from), ' ', fromEl, h('h4', {}, mail.subject)),
                bodyEl),
            h('div', { class: 'row mail-actions' }, h('button', { type: 'button', class: 'btn btn--danger', onClick: () => decide('phishing') }, '🎣 Phishing'), h('button', { type: 'button', class: 'btn', onClick: () => decide('legit') }, '✓ Looks genuine'), h('span', { class: 'muted' }, `Email ${i + 1} of ${EMAILS.length}`)),
            reveal);
    };
    show();
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Spot the phish'), h('p', {}, 'Phishing tricks you into giving away passwords, OTPs or money by pretending to be someone you trust. Decide for each email.'))),
        box,
        h('h4', {}, 'Types of phishing'),
        h('div', { class: 'info-cards' }, [['Spear phishing', 'Targeted at one person, using details about them (your name, college, course).'], ['Whaling', 'Spear phishing aimed at top executives ("the big fish"), often fake invoices or legal threats.'], ['Vishing', 'Voice phishing: a phone call pretending to be your bank or customer care.'], ['Smishing', 'SMS phishing: "Your parcel is held, pay ₹25 here".']].map(([t, p]) => h('div', { class: 'info-card' }, h('h4', {}, t), h('p', {}, p)))));
}

/* ---------------- malware ---------------- */

const MALWARE = [
    ['Virus', 'Attaches to a program or file and spreads when you run or share it.', 'Needs you to run it', 'ILOVEYOU (2000)'],
    ['Worm', 'Copies itself across networks automatically, without anyone running it.', 'Spreads on its own', 'WannaCry used a worm to spread (2017)'],
    ['Trojan horse', 'Looks like useful software (a free game, a cracked app) but hides something harmful.', 'You install it yourself', 'Zeus banking trojan'],
    ['Spyware', 'Secretly watches what you do and sends it to someone else.', 'Hidden in apps and downloads', 'Pegasus phone spyware'],
    ['Ransomware', 'Encrypts your files and demands payment for the key.', 'Phishing emails, worms', 'WannaCry hit hospitals in 150 countries'],
    ['Keylogger', 'Records every key you press, including passwords.', 'Trojans, infected USBs', 'Often bundled inside trojans'],
    ['Adware', 'Floods you with ads and redirects your browser.', 'Bundled with free software', 'Fake "speed up your PC" tools'],
    ['Rootkit', 'Hides deep in the OS (even the kernel) so antivirus cannot see it.', 'Installed by other malware', 'Sony BMG CD rootkit (2005)']
];

function malware(panel) {
    let i = 0;
    let score = 0;
    const order = [...MALWARE.keys()].sort(() => Math.random() - 0.5).slice(0, 5);
    const box = h('div', { class: 'card' });
    const ask = () => {
        if (i >= order.length) { box.replaceChildren(h('h3', {}, `Score: ${score} / ${order.length}`), h('button', { type: 'button', class: 'btn', onClick: () => { i = 0; score = 0; ask(); } }, 'Again')); return; }
        const [name, how] = MALWARE[order[i]];
        const options = [name, ...MALWARE.map(m => m[0]).filter(n => n !== name).sort(() => Math.random() - 0.5).slice(0, 3)].sort();
        box.replaceChildren(h('small', { class: 'muted' }, `Question ${i + 1} of ${order.length}`), h('h3', {}, how),
            ...options.map(opt => h('button', { type: 'button', class: 'quiz-option', onClick: e => {
                if (opt === name) score++;
                e.target.classList.add(opt === name ? 'is-right' : 'is-wrong');
                box.querySelectorAll('.quiz-option').forEach(b => { b.disabled = true; if (b.textContent === name) b.classList.add('is-right'); });
                setTimeout(() => { i++; ask(); }, 1300);
            } }, opt)));
    };
    ask();
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Malware and its types'), h('p', {}, 'Malware = malicious software: any program written to damage, spy on, or take control of a computer.'))),
        table(['Type', 'What it does', 'How it spreads', 'Real example'], MALWARE),
        h('h4', {}, 'Name that malware'), box,
        h('h4', {}, 'Staying safe'),
        h('div', { class: 'row' }, ['Keep the OS and apps updated', 'Install apps only from official stores', 'Do not open unknown attachments', 'Use antivirus', 'Back up important files (3-2-1 rule)', 'Never plug in unknown USB drives'].map(t => h('span', { class: 'chip chip--ok' }, '✓ ', t))));
}

/* ---------------- accounts ---------------- */

function accounts(panel, { open }) {
    const yes = h('span', { class: 'badge badge--good' }, 'Yes');
    const no = () => h('span', { class: 'badge badge--bad' }, 'No');
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'User account types and privileges'), h('p', {}, 'Every process runs as some user, and the OS only lets it do what that user is allowed to do. ByteOS really works this way.'))),
        table(['Can the account…', 'Administrator / root', 'Standard user', 'Guest'], [
            ['Use the computer and run apps', yes.cloneNode(true), yes.cloneNode(true), yes.cloneNode(true)],
            ['Create files in its own home folder', yes.cloneNode(true), yes.cloneNode(true), h('span', { class: 'badge badge--warn' }, 'Only temporary')],
            ['Install software, change system settings (/etc)', yes.cloneNode(true), h('span', { class: 'badge badge--warn' }, 'Only with sudo'), no()],
            ['Read other users\' private files', yes.cloneNode(true), no(), no()],
            ['Use sudo', '—', h('span', { class: 'badge badge--good' }, 'If in sudo group'), no()]
        ]),
        h('h4', {}, 'Try it in the Terminal'),
        h('div', { class: 'grid-3' },
            ...[['As your normal user', 'cat /etc/shadow', 'Permission denied: only root can read password hashes.'],
                ['With sudo', 'sudo cat /etc/shadow', 'Works: sudo runs ONE command as root.'],
                ['As the guest', 'su guest && sudo ls /root', 'Refused: guest is not in the sudoers file.']]
                .map(([title, cmd, text]) => h('div', { class: 'card' }, h('h3', {}, title), h('code', {}, cmd), h('p', { class: 'muted' }, text), h('button', { type: 'button', class: 'btn btn--sm', onClick: () => open('terminal', { run: cmd }) }, 'Run in Terminal')))),
        note('Principle of least privilege: use a standard account every day and become root only when you must. Malware you accidentally run can then only damage your own files, not the whole system.'));
}

/* ---------------- firewall ---------------- */

const SERVICES = { 22: 'SSH (remote login)', 23: 'Telnet (old, unencrypted)', 53: 'DNS', 80: 'HTTP (web)', 443: 'HTTPS (secure web)', 3306: 'MySQL database', 3389: 'Remote Desktop' };

function firewall(panel) {
    let rules = store.get('fw-rules', [
        { action: 'allow', port: '443', source: 'any' },
        { action: 'allow', port: '80', source: 'any' },
        { action: 'allow', port: '22', source: '192.168.1.0/24' },
        { action: 'deny', port: '23', source: 'any' }
    ]);
    const packets = [
        ['Visitor opens your website', '203.0.113.9', 443], ['Old browser uses plain HTTP', '198.51.100.4', 80],
        ['Admin SSH from the lab LAN', '192.168.1.20', 22], ['Unknown SSH from the internet', '45.83.12.7', 22],
        ['Telnet login attempt', '45.83.12.7', 23], ['Someone probes the database', '91.240.118.2', 3306], ['Remote Desktop scan', '185.220.101.3', 3389]
    ];
    const rulesBody = h('tbody');
    const results = h('tbody');
    const inNet = (ip, cidr) => {
        if (cidr === 'any') return true;
        if (!cidr.includes('/')) return ip === cidr;
        const [net, bits] = cidr.split('/');
        const toInt = (a) => a.split('.').reduce((acc, o) => ((acc << 8) + Number(o)) >>> 0, 0);
        const mask = Number(bits) === 0 ? 0 : (~0 << (32 - Number(bits))) >>> 0;
        return ((toInt(ip) & mask) >>> 0) === ((toInt(net) & mask) >>> 0);
    };
    const evaluate = (ip, port) => {
        const index = rules.findIndex(r => (r.port === 'any' || Number(r.port) === port) && inNet(ip, r.source));
        return index === -1 ? { action: 'deny', rule: 'default policy (deny all incoming)' } : { action: rules[index].action, rule: `rule ${index + 1}` };
    };
    const render = () => {
        store.set('fw-rules', rules);
        rulesBody.replaceChildren(...rules.map((r, i) => h('tr', {},
            h('th', { scope: 'row' }, i + 1),
            h('td', {}, h('select', { class: 'select', 'aria-label': 'Action', onChange: e => { r.action = e.target.value; render(); } }, ['allow', 'deny'].map(a => h('option', { selected: r.action === a }, a)))),
            h('td', {}, h('input', { class: 'input mono', value: r.port, 'aria-label': 'Port', onChange: e => { r.port = /^\d+$/.test(e.target.value) ? e.target.value : 'any'; render(); } })),
            h('td', {}, h('input', { class: 'input mono', value: r.source, 'aria-label': 'Source', onChange: e => { r.source = e.target.value.trim() || 'any'; render(); } })),
            h('td', { class: 'row' },
                h('button', { type: 'button', class: 'btn btn--sm btn--ghost', disabled: i === 0, 'aria-label': 'Move up', onClick: () => { [rules[i - 1], rules[i]] = [rules[i], rules[i - 1]]; render(); } }, '↑'),
                h('button', { type: 'button', class: 'btn btn--sm btn--ghost', 'aria-label': 'Delete rule', onClick: () => { rules.splice(i, 1); render(); } }, '✕')))));
        results.replaceChildren(...packets.map(([what, ip, port]) => {
            const r = evaluate(ip, port);
            return h('tr', {}, h('th', { scope: 'row' }, what), h('td', { class: 'mono' }, ip), h('td', {}, `${port} · ${SERVICES[port] ?? ''}`),
                h('td', {}, h('span', { class: `badge ${r.action === 'allow' ? 'badge--good' : 'badge--bad'}` }, r.action === 'allow' ? 'ALLOWED' : 'BLOCKED')), h('td', { class: 'muted' }, r.rule));
        }));
    };
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Firewall'), h('p', {}, 'A firewall checks every incoming connection against a list of rules, top to bottom. The first rule that matches decides. If none match, the default policy blocks it.'))),
        h('div', { class: 'split' },
            h('div', {}, h('h4', {}, 'Rules (edit them!)'), h('table', { class: 'data fw-rules' }, h('thead', {}, h('tr', {}, ['#', 'Action', 'Port', 'From (IP or network)', ''].map(t => h('th', {}, t)))), rulesBody),
                h('button', { type: 'button', class: 'btn btn--ghost btn--sm', style: { marginTop: '8px' }, onClick: () => { rules.push({ action: 'allow', port: '3306', source: '192.168.1.0/24' }); render(); } }, '+ Add rule')),
            h('div', { class: 'card' }, h('h3', {}, 'Types of firewall'), h('p', {}, h('b', {}, 'Host-based: '), 'software on one computer (Windows Defender Firewall, ufw on Linux).'), h('p', {}, h('b', {}, 'Network-based: '), 'a device protecting a whole network (in the router, or a dedicated appliance).'), h('p', { class: 'muted' }, 'Modern firewalls are stateful: replies to connections you started are allowed back in automatically.'))),
        h('h4', {}, 'Incoming traffic'),
        h('table', { class: 'data' }, h('thead', {}, h('tr', {}, ['Packet', 'From', 'Port · service', 'Result', 'Decided by'].map(t => h('th', {}, t)))), results),
        note('Try it: delete rule 3 and the admin\'s SSH gets blocked. Add "allow · any · any" at the top and everything gets in, which is why order matters.'));
    render();
}

export function mount(body, { args, open }) {
    const cleanups = [];
    const view = tabs([
        { id: 'cia', label: 'CIA triad', render: cia },
        { id: 'passwords', label: 'Passwords', render: passwords },
        { id: 'hashing', label: 'Hashing', render: hashing },
        { id: 'mfa', label: '2FA / MFA', render: (p) => cleanups.push(mfa(p).cleanup) },
        { id: 'phishing', label: 'Phishing', render: phishing },
        { id: 'malware', label: 'Malware', render: malware },
        { id: 'accounts', label: 'Accounts', render: (p) => accounts(p, { open }) },
        { id: 'firewall', label: 'Firewall', render: firewall }
    ], { app: 'security' });
    body.append(view.el);
    if (args?.tab) view.show(args.tab);
    return { cleanup: () => cleanups.forEach(fn => fn()), onArgs: (a) => a?.tab && view.show(a.tab) };
}
