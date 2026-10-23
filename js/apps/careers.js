// Career Compass: cohorts, pathways, MOOCs, hackathons, technical profiles and a cohort-finder quiz.

import { h, tabs, table, note } from '../core/ui.js';
import { store } from '../core/store.js';

const COHORTS = {
    cloud: { name: 'Cloud Computing', icon: '☁️', skills: ['Linux and networking', 'Virtualization', 'AWS / Azure / GCP', 'Docker and Kubernetes', 'Infrastructure as code'], tools: ['AWS', 'Terraform', 'Docker', 'Kubernetes', 'Jenkins'], roles: ['Cloud Engineer', 'DevOps Engineer', 'Site Reliability Engineer', 'Solutions Architect'], start: 'AWS Cloud Practitioner, then build and deploy a small app on a VM.' },
    data: { name: 'Data Science', icon: '📊', skills: ['Statistics and probability', 'Python (pandas, NumPy)', 'SQL', 'Data visualisation', 'Storytelling with data'], tools: ['Jupyter', 'pandas', 'Power BI / Tableau', 'Excel', 'SQL'], roles: ['Data Analyst', 'Data Scientist', 'Business Analyst', 'Data Engineer'], start: 'Analyse a public dataset (e.g. from Kaggle) and publish a notebook.' },
    ml: { name: 'Machine Learning', icon: '🤖', skills: ['Linear algebra and calculus', 'Python', 'Supervised and unsupervised learning', 'Deep learning', 'Model evaluation'], tools: ['scikit-learn', 'PyTorch', 'TensorFlow', 'Hugging Face', 'Kaggle'], roles: ['ML Engineer', 'AI Engineer', 'Research Scientist', 'MLOps Engineer'], start: 'Andrew Ng\'s ML course, then a Kaggle competition.' },
    software: { name: 'Software Development', icon: '💻', skills: ['Data structures and algorithms', 'OOP', 'One language deeply (C++/Java/Python)', 'Git', 'Debugging and testing'], tools: ['VS Code / IntelliJ', 'Git and GitHub', 'LeetCode', 'Linux'], roles: ['Software Engineer', 'Backend Developer', 'Mobile Developer', 'Systems Programmer'], start: 'Daily DSA practice and two solid projects on GitHub.' },
    fullstack: { name: 'Full Stack Web Development', icon: '🌐', skills: ['HTML, CSS, JavaScript', 'A frontend framework (React)', 'Backend (Node.js / Django)', 'Databases (SQL and NoSQL)', 'APIs and deployment'], tools: ['React', 'Node.js / Express', 'MongoDB / PostgreSQL', 'Git', 'Vercel / Netlify'], roles: ['Full Stack Developer', 'Frontend Developer', 'Backend Developer', 'Web Developer'], start: 'Build and deploy a full CRUD app with login.' },
    testing: { name: 'Software Methodologies & Testing', icon: '🧪', skills: ['SDLC and Agile/Scrum', 'Manual testing and test cases', 'Automation testing', 'Bug tracking', 'Performance testing'], tools: ['Selenium', 'Postman', 'JIRA', 'JUnit / PyTest', 'JMeter'], roles: ['QA Engineer', 'SDET', 'Automation Tester', 'Scrum Master'], start: 'Write test cases for an app you use, then automate them with Selenium.' },
    research: { name: 'Teaching & Research', icon: '🎓', skills: ['Deep subject knowledge', 'Reading and writing papers', 'Research methods', 'Presenting and teaching', 'Patience and curiosity'], tools: ['Google Scholar', 'LaTeX / Overleaf', 'Zotero', 'Python / MATLAB'], roles: ['Professor', 'Research Scientist', 'Teaching Assistant', 'PhD Scholar'], start: 'Assist a faculty member\'s project and aim for GATE / NET.' },
    security: { name: 'Cyber Security', icon: '🛡️', skills: ['Networking (TCP/IP)', 'Linux', 'Cryptography basics', 'Ethical hacking', 'Security monitoring'], tools: ['Kali Linux', 'Wireshark', 'Nmap', 'Burp Suite', 'Metasploit'], roles: ['Security Analyst', 'Penetration Tester', 'SOC Analyst', 'Security Engineer'], start: 'TryHackMe or Hack The Box rooms, then CompTIA Security+.' }
};

function cohorts(panel) {
    const detail = h('div', { class: 'card' });
    const cards = h('div', { class: 'info-cards' });
    const show = (id) => {
        const c = COHORTS[id];
        [...cards.children].forEach(el => el.classList.toggle('is-on', el.dataset.id === id));
        detail.replaceChildren(h('h3', {}, `${c.icon} ${c.name}`),
            h('div', { class: 'grid-3' },
                h('div', {}, h('h4', {}, 'Key skills'), h('ul', {}, c.skills.map(x => h('li', {}, x)))),
                h('div', {}, h('h4', {}, 'Tools'), h('div', { class: 'row' }, c.tools.map(x => h('span', { class: 'chip' }, x)))),
                h('div', {}, h('h4', {}, 'Job roles'), h('ul', {}, c.roles.map(x => h('li', {}, x))))),
            h('p', { class: 'note' }, h('b', {}, 'Start here: '), c.start));
    };
    Object.entries(COHORTS).forEach(([id, c]) => cards.append(h('button', { type: 'button', class: 'info-card', dataset: { id }, onClick: () => show(id) }, h('h4', {}, `${c.icon} ${c.name}`), h('p', {}, c.roles.slice(0, 2).join(', ')))));
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Cohorts'), h('p', {}, 'A cohort is a group of students on the same technology track, learning the same skills together toward the same kind of job. Companies hire from cohorts because their skills are predictable.'))),
        cards, h('div', { style: { marginTop: '14px' } }, detail));
    show('software');
}

function pathways(panel) {
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Career pathways after B.Tech'), h('p', {}, 'A pathway is the route you take after graduating. None is "best". They suit different goals.'))),
        table(['Pathway', 'Examples', 'How you get in', 'Good for'], [
            ['Product-based company', 'Google, Microsoft, Adobe, Flipkart, Zomato', 'Strong DSA, projects, multiple interview rounds', 'Building your own products, high pay, fast learning'],
            ['Service-based company', 'TCS, Infosys, Wipro, Accenture, Cognizant', 'Aptitude test + technical and HR interviews, mass campus hiring', 'Stable start, training, working with many clients'],
            ['Government', 'ISRO, DRDO, BHEL, NTPC (PSUs), banks', 'GATE score for PSUs, or exams like SSC/UPSC', 'Job security, work-life balance, public service'],
            ['Higher studies', 'M.Tech (IITs), MS abroad, MBA', 'GATE (M.Tech), GRE + TOEFL/IELTS (MS), CAT (MBA)', 'Research, specialisation, career switch'],
            ['Entrepreneurship', 'Your own startup', 'An idea, a team, incubators (college, Startup India)', 'Freedom and impact, with higher risk']
        ]),
        h('h4', {}, 'MAANG'),
        h('div', { class: 'row' }, ['Meta', 'Apple', 'Amazon', 'Netflix', 'Google'].map(c => h('span', { class: 'chip' }, c))),
        h('p', {}, 'The five big tech companies people aim for. Studying how they hire is useful even if you never apply: they test problem solving (DSA), system design and how clearly you think and communicate.'),
        note('Whatever the pathway: projects on GitHub, a clean resume, communication skills and consistent practice matter more than the college tag.'));
}

function learn(panel) {
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'MOOCs: Massive Open Online Courses'), h('p', {}, 'Online courses anyone can join, often free, from top universities and companies.'))),
        h('div', { class: 'info-cards' }, [['Self-paced', 'Start any time, learn at your speed.'], ['Cohort-based', 'Fixed dates with a batch, deadlines and discussion.'], ['xMOOC', 'Structured like a university course: lectures, quizzes, exams.'], ['cMOOC', 'Connectivist: learners teach each other through discussion.']].map(([t, p]) => h('div', { class: 'info-card' }, h('h4', {}, t), h('p', {}, p)))),
        h('h4', {}, 'Platforms'),
        table(['Platform', 'From', 'Known for'], [
            ['NPTEL / SWAYAM', 'IITs, IISc (Govt. of India)', 'Free courses with certification exams, accepted for credit transfer in many colleges'],
            ['Coursera', 'Stanford, Google, IBM, DeepLearning.AI', 'Professional certificates, ML and data courses'],
            ['edX', 'Harvard, MIT', 'CS50 and university-level courses'],
            ['Udemy', 'Individual instructors', 'Practical, low-cost skill courses'],
            ['freeCodeCamp', 'Non-profit', 'Free web development and data certifications'],
            ['Khan Academy', 'Non-profit', 'Maths and CS fundamentals'],
            ['Google / Microsoft / AWS learning', 'The companies themselves', 'Cloud and AI skills tied to their certifications']
        ]),
        h('h4', {}, 'Why take MOOCs?'),
        h('div', { class: 'row' }, ['Learn from top teachers for free', 'Fill gaps your syllabus skips', 'Certificates for your resume and LinkedIn', 'Learn at your own pace', 'Credit transfer (NPTEL)'].map(t => h('span', { class: 'chip chip--ok' }, '✓ ', t))));
}

function hackathons(panel) {
    const saved = store.get('hack-prep', []);
    const items = ['Form a team of 3–4 with mixed skills (frontend, backend, design, pitch)', 'Pick one problem statement and define the core feature', 'Build a working demo, not a perfect product', 'Use Git from minute one, commit often', 'Prepare a 2-minute pitch: problem, solution, demo, impact', 'Make slides with screenshots in case the live demo fails'];
    const list = h('ul', { class: 'checklist' });
    const render = () => list.replaceChildren(...items.map((text, i) => h('li', {}, h('label', {}, h('input', { type: 'checkbox', checked: saved.includes(i), onChange: e => { e.target.checked ? saved.push(i) : saved.splice(saved.indexOf(i), 1); store.set('hack-prep', saved); } }), text))));
    render();
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Hackathons and competitions'), h('p', {}, 'A hackathon is a 24–48 hour event where teams build a working solution to a problem. They are the fastest way to learn, build a portfolio and get noticed by recruiters.'))),
        table(['Event', 'Type', 'Who runs it'], [
            ['Smart India Hackathon (SIH)', 'National hackathon on real government and industry problems', 'Government of India'],
            ['Google Summer of Code', 'Paid summer contributions to open-source projects', 'Google'],
            ['Hacktoberfest', 'Month-long open-source contribution event every October', 'DigitalOcean'],
            ['MLH hackathons', 'Student hackathons all over the world, many online', 'Major League Hacking'],
            ['ICPC', 'Team competitive programming contest', 'ICPC Foundation'],
            ['Meta Hacker Cup', 'Individual competitive programming', 'Meta'],
            ['Kaggle competitions', 'Data science and ML challenges with real datasets', 'Google (Kaggle)'],
            ['Flipkart GRiD, HackerEarth challenges', 'Company-run coding and building contests', 'Companies and platforms']
        ]),
        h('h4', {}, 'Your hackathon prep checklist'), list);
}

const PLATFORMS = [
    ['GitHub', 'Code hosting and portfolio', /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9-]{1,39}\/?$/, 'https://github.com/username', ['Profile README', 'Pinned projects with descriptions', 'Regular commits']],
    ['LeetCode', 'Coding practice (DSA)', /^https:\/\/(www\.)?leetcode\.com\/(u\/)?[\w-]+\/?$/, 'https://leetcode.com/u/username', ['Solve daily', 'Contest rating']],
    ['HackerRank', 'Coding practice and certificates', /^https:\/\/(www\.)?hackerrank\.com\/(profile\/)?[\w-]+\/?$/, 'https://www.hackerrank.com/profile/username', ['Skill badges', 'Certifications']],
    ['HackerEarth', 'Challenges and hackathons', /^https:\/\/(www\.)?hackerearth\.com\/@[\w-]+\/?$/, 'https://www.hackerearth.com/@username', ['Join a challenge']],
    ['GeeksforGeeks', 'Learning and practice', /^https:\/\/(www\.)?(auth\.)?geeksforgeeks\.org\/user\/[\w-]+\/?$/, 'https://www.geeksforgeeks.org/user/username', ['POTD streak', 'Articles']],
    ['Stack Overflow', 'Knowledge sharing (Q&A)', /^https:\/\/(www\.)?stackoverflow\.com\/users\/\d+(\/[\w-]+)?\/?$/, 'https://stackoverflow.com/users/123456/name', ['Answer questions', 'Reputation']],
    ['Figma', 'Design and collaboration', /^https:\/\/(www\.)?figma\.com\/@[\w-]+\/?$/, 'https://www.figma.com/@username', ['Publish a design to Community']]
];

function profiles(panel) {
    const saved = store.get('profiles', {});
    const meter = h('div');
    const rows = h('div', { class: 'profile-list' });
    const render = () => {
        const done = PLATFORMS.filter(([name, , re]) => re.test(saved[name] ?? '')).length;
        meter.replaceChildren(h('div', { class: 'row' }, h('div', { class: 'meter', style: { flex: 1 } }, h('span', { style: { '--v': `${(done / PLATFORMS.length) * 100}%`, '--c': 'var(--good)' } })), h('b', {}, `${done} / ${PLATFORMS.length} profiles linked`)));
    };
    for (const [name, what, re, example, tips] of PLATFORMS) {
        const input = h('input', { class: 'input mono', placeholder: example, value: saved[name] ?? '', 'aria-label': `${name} profile URL` });
        const state = h('span');
        const check = () => {
            const v = input.value.trim();
            const ok = re.test(v);
            input.classList.toggle('is-bad', Boolean(v) && !ok);
            state.replaceChildren(!v ? h('span', { class: 'badge badge--warn' }, 'not added') : ok ? h('a', { class: 'badge badge--good', href: v, target: '_blank', rel: 'noopener' }, 'linked ↗') : h('span', { class: 'badge badge--bad' }, 'not a valid profile URL'));
            if (ok || !v) { saved[name] = v; store.set('profiles', saved); render(); }
        };
        input.addEventListener('input', check);
        rows.append(h('div', { class: 'profile-row' }, h('div', {}, h('b', {}, name), h('small', { class: 'muted' }, what)), input, state, h('small', { class: 'muted' }, tips.join(' · '))));
        check();
    }
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Your technical profiles'), h('p', {}, 'Recruiters look you up online. Each platform shows a different strength. Paste your profile links: they are checked with regular expressions and saved only in this browser.'))),
        meter, rows,
        h('h4', {}, 'Keep your digital profile safe and professional'),
        h('div', { class: 'row' }, ['Use the same professional photo and name everywhere', 'Turn on 2FA on GitHub and email', 'Never post API keys or passwords in public repos', 'Do not share your phone number or address publicly', 'Write clear READMEs for every project'].map(t => h('span', { class: 'chip chip--ok' }, '✓ ', t))));
    render();
}

const QUIZ = [
    ['What sounds most fun?', [['Building an app people use every day', ['fullstack', 'software']], ['Finding hidden patterns in data', ['data', 'ml']], ['Keeping systems running at huge scale', ['cloud']], ['Breaking into systems (legally) to protect them', ['security']]]],
    ['Which subject do you enjoy most?', [['Programming and logic', ['software', 'fullstack']], ['Maths and statistics', ['ml', 'data']], ['Networks and operating systems', ['cloud', 'security']], ['Explaining things to others', ['research', 'testing']]]],
    ['Your ideal workday includes…', [['Designing screens and features', ['fullstack']], ['Training and tuning models', ['ml']], ['Automating servers and pipelines', ['cloud']], ['Finding bugs before users do', ['testing']]]],
    ['Pick a tool to master', [['React', ['fullstack']], ['PyTorch', ['ml']], ['Wireshark', ['security']], ['SQL and Power BI', ['data']]]],
    ['How do you like to solve problems?', [['Step by step until it is perfect', ['testing', 'software']], ['By experimenting', ['ml', 'data']], ['By reading deeply first', ['research']], ['Fast, then improve', ['fullstack', 'cloud']]]]
];

function quiz(panel) {
    let i = 0;
    const score = {};
    const box = h('div', { class: 'card' });
    const ask = () => {
        if (i >= QUIZ.length) {
            const [best] = Object.entries(score).sort((a, b) => b[1] - a[1]);
            const c = COHORTS[best[0]];
            store.set('cohort-result', best[0]);
            box.replaceChildren(h('small', { class: 'muted' }, 'Your best match'), h('h3', {}, `${c.icon} ${c.name}`),
                h('p', {}, 'A 3-step roadmap for this semester:'),
                h('ol', {}, h('li', {}, `Learn: ${c.skills.slice(0, 2).join(' and ')}.`), h('li', {}, `Practise with: ${c.tools.slice(0, 2).join(', ')}.`), h('li', {}, c.start)),
                h('p', { class: 'muted' }, `Roles to aim for: ${c.roles.join(', ')}.`),
                h('button', { type: 'button', class: 'btn btn--ghost', onClick: () => { i = 0; Object.keys(score).forEach(k => delete score[k]); ask(); } }, 'Retake'));
            return;
        }
        const [q, options] = QUIZ[i];
        box.replaceChildren(h('small', { class: 'muted' }, `Question ${i + 1} of ${QUIZ.length}`), h('h3', {}, q),
            ...options.map(([text, ids]) => h('button', { type: 'button', class: 'quiz-option', onClick: () => { ids.forEach(id => { score[id] = (score[id] ?? 0) + (ids.length === 1 ? 2 : 1); }); i++; ask(); } }, text)));
    };
    ask();
    panel.append(h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Find your cohort'), h('p', {}, 'Five quick questions. There are no wrong answers.'))), box);
}

export function mount(body, { args }) {
    const view = tabs([
        { id: 'cohorts', label: 'Cohorts', render: cohorts },
        { id: 'pathways', label: 'Pathways', render: pathways },
        { id: 'learn', label: 'MOOCs', render: learn },
        { id: 'hackathons', label: 'Hackathons', render: hackathons },
        { id: 'profiles', label: 'Profiles', render: profiles },
        { id: 'quiz', label: 'Find your cohort', render: quiz }
    ], { app: 'careers' });
    body.append(view.el);
    if (args?.tab) view.show(args.tab);
    return { onArgs: (a) => a?.tab && view.show(a.tab) };
}
