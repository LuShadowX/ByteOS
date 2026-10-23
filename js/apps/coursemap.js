// Course Map: every CSE111 topic, linked to the app and tab that teaches it.

import { h, tabs, track } from '../core/ui.js';
import { store, bus } from '../core/store.js';
import { appById } from './index.js';

// [topic, app, tab, what you do there]
const OLD_SYLLABUS = [
    ['Unit 1 · Computer System', [
        ['Basic structure of a computer and its components', 'hardware', 'block', 'Click each unit of the block diagram and run a fetch–decode–execute cycle'],
        ['Memories and its types (RAM, ROM)', 'hardware', 'memory', 'Explore the memory hierarchy and RAM/ROM families'],
        ['Secondary storage devices, SSD vs HDD', 'hardware', 'storage', 'Race an SSD against an HDD on random reads'],
        ['Processors and GPU', 'hardware', 'cpugpu', 'Watch 8 CPU cores and 256 GPU cores paint the same image'],
        ['PC connection interfaces', 'hardware', 'ports', 'Wired and wireless ports with speeds and uses'],
        ['Introduction to RAID and RAID levels', 'hardware', 'raid', 'Build RAID 0/1/5/6/10 arrays, fail disks, rebuild data']
    ]],
    ['Unit 2 · Operating System', [
        ['Operating system and its architecture', 'monitor', 'kernel', 'Layers from hardware to apps'],
        ['Kernel and types of kernels', 'monitor', 'kernel', 'Monolithic, micro, hybrid and exokernel diagrams'],
        ['The bootloader', 'monitor', 'boot', 'Every boot stage explained (ByteOS really boots this way)'],
        ['Functions of operating system', 'monitor', 'functions', 'Process, memory, file and device management, CPU scheduling'],
        ['Types of operating systems', 'monitor', 'ostypes', 'Batch, time-sharing, distributed, network and real-time OS'],
        ['Directory hierarchy', 'files', 'browser', 'Browse the Linux tree and read what each folder is for'],
        ['Computer languages (machine, assembly, high-level)', 'compiler', 'levels', 'The same program at all three levels'],
        ['Language translators (assembler, compiler, interpreter)', 'compiler', 'lab', 'Compile or interpret a program and compare'],
        ['Steps in development of a program', 'compiler', 'cycle', 'The program development cycle'],
        ['Compilation and execution process', 'compiler', 'lab', 'Tokens → syntax tree → assembly → machine code → run']
    ]],
    ['Unit 3 · Linux Operating System', [
        ['Linux overview, architecture and features', 'vms', 'compare', 'Kernel, shell and user space, and why Linux is open source'],
        ['Linux distributions', 'vms', 'distros', 'Ubuntu, Fedora, Debian, Arch, Kali, Mint and who uses them'],
        ['Shell commands', 'terminal', null, 'A working shell: files, processes, pipes, redirection'],
        ['Permissions (chmod)', 'terminal', null, 'Real rwx permissions, chmod 755, users, su and sudo'],
        ['Windows vs Linux', 'vms', 'compare', 'Side-by-side comparison'],
        ['Virtual machines and hypervisors', 'vms', 'hyper', 'Create VMs and share the host\'s CPU, RAM and disk'],
        ['File system basics and types (FAT, NTFS, ext, HFS+, UDF)', 'files', 'fstypes', 'Compare file systems and pick one for a job']
    ]],
    ['Unit 4 · Cohorts and Skill Sets', [
        ['Cohorts and their skills, tools and job roles', 'careers', 'cohorts', 'All 8 cohorts with skills, tools and roles'],
        ['Pathways (product, service, government, higher studies, startups)', 'careers', 'pathways', 'Compare the five career paths and MAANG'],
        ['MOOCs', 'careers', 'learn', 'Platforms, types and benefits'],
        ['Hackathons and competitions', 'careers', 'hackathons', 'Recognised events and how to prepare'],
        ['Find your cohort', 'careers', 'quiz', 'Short quiz that suggests a cohort and a roadmap']
    ]],
    ['Unit 5 · Computer Network and Communication', [
        ['Computer networks and types (PAN, LAN, MAN, WAN)', 'network', 'types', 'Network sizes with real examples'],
        ['Network topologies', 'network', 'topology', 'Build bus, star, ring, mesh and tree networks and break links'],
        ['Network devices (hub, switch, router, modem, access point)', 'network', 'devices', 'Send frames through a hub vs a switch vs a router'],
        ['Client–server model', 'network', 'clientserver', 'Follow a web request from DNS to response'],
        ['Basic security threats and the CIA triad', 'security', 'cia', 'Confidentiality, integrity and availability with attacks on each'],
        ['Malware and its types', 'security', 'malware', 'Virus, worm, trojan, spyware, ransomware + quiz'],
        ['Phishing', 'security', 'phishing', 'Spot the red flags in real-looking emails'],
        ['Password cracking (brute force, dictionary, rainbow tables)', 'security', 'passwords', 'Crack-time estimator and a rainbow-table demo'],
        ['Multi-factor authentication', 'security', 'mfa', 'Working 2FA codes (TOTP) you can verify'],
        ['User account types and privileges', 'security', 'accounts', 'Root, standard and guest, tied to the terminal'],
        ['Firewall basics', 'security', 'firewall', 'Write rules and test packets against them']
    ]],
    ['Unit 6 · Version Control, AI and Profiles', [
        ['Overview of Git and GitHub', 'gitlab', null, 'What version control is, with a live commit graph'],
        ['Install git, configure, create a local repository', 'terminal', null, 'git config, git init in ~/projects'],
        ['Add a file, create a commit', 'gitlab', null, 'Missions guide you through add and commit'],
        ['Create a new branch', 'gitlab', null, 'Branch, switch and merge, drawn as a graph'],
        ['Introduction to AI and real-life applications', 'ai', 'basics', 'AI vs ML vs DL and where AI is used'],
        ['Generative AI, its types and tools (text, image, video, research)', 'ai', 'genai', 'ChatGPT, Gemini, image/video tools, Perplexity, NotebookLM, Jenni AI'],
        ['Prompt engineering: good vs poor prompts', 'ai', 'prompts', 'Score your prompt with the CREATE framework'],
        ['Ethical use of AI', 'ai', 'ethics', 'A checklist for using AI honestly and safely'],
        ['Profile creation (Figma, GitHub, Stack Overflow, HackerRank, HackerEarth, GfG, LeetCode)', 'careers', 'profiles', 'Track your profiles and their completeness']
    ]]
];

const NEW_COS = [
    ['CO1', 'Fundamentals of computer systems: organisation, hardware, memory hierarchy, storage, computer languages and number systems', [['hardware', 'basics'], ['hardware', 'block'], ['hardware', 'memory'], ['hardware', 'storage'], ['compiler', 'levels'], ['numbers', 'convert']]],
    ['CO2', 'Operating systems, Linux fundamentals, networking, virtualization, cloud computing and open-source software', [['monitor', 'kernel'], ['terminal', null], ['network', 'topology'], ['vms', 'hyper'], ['vms', 'cloud'], ['vms', 'distros']]],
    ['CO3', 'Technology cohorts, career pathways, skill resources, MOOCs and hackathons', [['careers', 'cohorts'], ['careers', 'pathways'], ['careers', 'learn'], ['careers', 'hackathons']]],
    ['CO4', 'Computational thinking: understand problems and represent solutions as algorithms, pseudocode and flowcharts', [['flowchart', 'thinking'], ['flowchart', 'studio']]],
    ['CO5', 'Git and GitHub operations, professional digital profiles, digital security and safe computing', [['gitlab', null], ['terminal', null], ['careers', 'profiles'], ['security', 'passwords'], ['security', 'mfa'], ['security', 'phishing']]],
    ['CO6', 'Emerging technologies: AI, ML, Generative AI, Agentic AI, IoT, Blockchain and Web3', [['ai', 'basics'], ['ai', 'genai'], ['ai', 'agentic'], ['ai', 'iot'], ['ai', 'blockchain'], ['ai', 'web3']]]
];

const NEW_UNITS = [
    ['Computer languages: machine, assembly, high-level; compiler, interpreter, assembler; program development cycle; compilation and execution', 'compiler', 'lab'],
    ['Computer fundamentals: evolution and characteristics, functional units, hardware and software, types of computers', 'hardware', 'basics'],
    ['Computer hardware: CPU and GPU, input and output devices, memory devices', 'hardware', 'cpugpu'],
    ['Number systems: binary, decimal, octal, hexadecimal and conversions', 'numbers', 'convert'],
    ['Version control: Git and GitHub, local repo, add, commit, branch', 'gitlab', null],
    ['Modern AI trends and tools, prompt engineering, ethical use', 'ai', 'prompts'],
    ['Profile creation on technical platforms', 'careers', 'profiles']
];

export function mount(body, { open, args }) {
    const visited = () => new Set(store.get('visited', []));
    const key = (app, tab) => `${app}/${tab ?? 'main'}`;
    const isDone = (app, tab) => visited().has(key(app, tab));

    const go = (app, tab) => {
        if (!tab) track(key(app, null));
        open(app, tab ? { tab } : {});
    };

    const link = (app, tab) => {
        const meta = appById(app);
        return h('button', { type: 'button', class: `map-link${isDone(app, tab) ? ' is-done' : ''}`, style: { '--app': meta.color }, onClick: () => go(app, tab) },
            h('span', { class: 'map-link__icon', html: meta.icon }), meta.title, tab ? h('small', {}, ` › ${tab}`) : null);
    };

    const all = OLD_SYLLABUS.flatMap(([, rows]) => rows);
    const progress = h('div', { class: 'map-progress' });
    const renderProgress = () => {
        const done = all.filter(([, app, tab]) => isDone(app, tab)).length;
        progress.replaceChildren(
            h('div', { class: 'meter' }, h('span', { style: { '--v': `${(done / all.length) * 100}%`, '--c': 'var(--good)' } })),
            h('span', {}, `${done} of ${all.length} syllabus topics explored`));
    };

    const welcome = (panel) => {
        panel.append(
            h('div', { class: 'map-hero' },
                h('h3', {}, 'Welcome to ByteOS'),
                h('p', {}, 'ByteOS is a computer simulated inside your browser. You just watched it boot like a real PC, and every app on the desktop teaches a part of CSE111 Orientation to Computing by letting you use it, not just read about it.'),
                progress),
            h('div', { class: 'grid-3' },
                ...[
                    ['Open the Terminal', 'Real commands, permissions, users and git.', 'terminal', null],
                    ['Build a RAID array', 'Fail a disk and watch the data survive.', 'hardware', 'raid'],
                    ['Crack a password', 'See why length beats complexity.', 'security', 'passwords'],
                    ['Compile a program', 'Watch code become machine code.', 'compiler', 'lab'],
                    ['Break a network', 'Cut links in a ring vs a mesh.', 'network', 'topology'],
                    ['Mine a block', 'A working mini blockchain.', 'ai', 'blockchain']
                ].map(([title, text, app, tab]) => h('button', { type: 'button', class: 'info-card', style: { '--app': appById(app).color }, onClick: () => go(app, tab) },
                    h('h4', {}, title), h('p', {}, text), h('span', { class: 'chip' }, appById(app).title)))),
            h('p', { class: 'note' }, 'Tips: windows can be dragged, resized and maximised (double-click the title bar). Ctrl+Alt+T opens a terminal. Everything you create is saved in this browser. Power menu → Reset puts it back to factory state.'));
    };

    const oldMap = (panel) => {
        panel.append(h('p', { class: 'lead' }, 'The syllabus I studied: CSE111 Orientation to Computing-I (6 units). Each topic links to the place in ByteOS that teaches it. Green ticks show what you have opened.'));
        for (const [unit, rows] of OLD_SYLLABUS) {
            panel.append(h('h4', { class: 'map-unit' }, unit), h('table', { class: 'data map-table' },
                h('thead', {}, h('tr', {}, h('th', {}, 'Topic'), h('th', {}, 'Where in ByteOS'), h('th', {}, 'What you do'))),
                h('tbody', {}, rows.map(([topic, app, tab, what]) => h('tr', {},
                    h('th', { scope: 'row' }, h('span', { class: `map-tick${isDone(app, tab) ? ' is-done' : ''}`, 'aria-label': isDone(app, tab) ? 'explored' : 'not yet' }), topic),
                    h('td', {}, link(app, tab)), h('td', { class: 'muted' }, what))))));
        }
    };

    const newMap = (panel) => {
        panel.append(h('p', { class: 'lead' }, 'The current CSE111 Orientation to Computing (session 2026-27) and its six course outcomes. ByteOS covers all of them.'),
            h('div', { class: 'co-grid' }, NEW_COS.map(([co, text, links]) => h('article', { class: 'co-card' },
                h('b', {}, co), h('p', {}, text), h('div', { class: 'row' }, links.map(([app, tab]) => link(app, tab)))))),
            h('h4', { class: 'map-unit' }, 'Unit topics'),
            h('table', { class: 'data map-table' },
                h('thead', {}, h('tr', {}, h('th', {}, 'Topic'), h('th', {}, 'Where in ByteOS'))),
                h('tbody', {}, NEW_UNITS.map(([topic, app, tab]) => h('tr', {}, h('th', { scope: 'row' }, topic), h('td', {}, link(app, tab)))))));
    };

    const view = tabs([
        { id: 'welcome', label: 'Welcome', render: welcome },
        { id: 'unit', label: 'Orientation to Computing-I', render: oldMap },
        { id: 'current', label: 'Current CSE111 (CO1–CO6)', render: newMap }
    ], { app: 'coursemap' });
    body.append(view.el);
    renderProgress();

    // re-render tick marks when other apps record visits
    const refresh = () => {
        renderProgress();
        body.querySelectorAll('.map-link').forEach(btn => btn.classList.remove('is-done'));
    };
    const off = bus.on('visited', () => {
        refresh();
        body.querySelectorAll('[data-id="unit"].tab-panel, [data-id="current"].tab-panel').forEach(panel => {
            const id = panel.dataset.id;
            panel.replaceChildren();
            (id === 'unit' ? oldMap : newMap)(panel);
        });
    });

    if (args?.tab) view.show(args.tab);
    return { cleanup: off, onArgs: (a) => a?.tab && view.show(a.tab) };
}
