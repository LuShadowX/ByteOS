// Every app on the desktop. Modules load only when an app is first opened.

const icon = (paths) => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;

export const GROUPS = [
    'Start here',
    'Computer system',
    'Operating system',
    'Linux',
    'Networks and security',
    'Version control',
    'Thinking like a programmer',
    'Careers',
    'AI and emerging tech'
];

export const APPS = [
    {
        id: 'coursemap', title: 'Course Map', group: 'Start here', color: '#2f6fed', size: [880, 600],
        about: 'Every CSE111 topic and the app that teaches it',
        icon: icon('<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/><path d="M4 5l4-2h8l4 2"/>'),
        load: () => import('./coursemap.js')
    },
    {
        id: 'hardware', title: 'Inside the Computer', group: 'Computer system', color: '#7c4dff', size: [960, 640],
        about: 'Block diagram, CPU cycle, memory, storage, GPU, ports and RAID',
        icon: icon('<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>'),
        load: () => import('./hardware.js')
    },
    {
        id: 'numbers', title: 'Number Systems', group: 'Computer system', color: '#00a389', size: [860, 620],
        about: 'Binary, octal, decimal and hex with the working shown',
        icon: icon('<path d="M5 4v16M3 6l2-2"/><path d="M10 4h4v16h-4z"/><path d="M18 4v16M16 6l2-2"/>'),
        load: () => import('./numbers.js')
    },
    {
        id: 'monitor', title: 'System Monitor', group: 'Operating system', color: '#ef6c00', size: [920, 620],
        about: 'Processes, kernel types, OS types, boot process, scheduling',
        icon: icon('<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M6 14l3-4 3 3 3-5 3 4"/><path d="M9 21h6"/>'),
        load: () => import('./monitor.js')
    },
    {
        id: 'compiler', title: 'Compiler Lab', group: 'Operating system', color: '#d81b60', size: [980, 660],
        about: 'Source code to machine code, step by step',
        icon: icon('<path d="M8 6l-5 6 5 6M16 6l5 6-5 6M13.5 4l-3 16"/>'),
        load: () => import('./compiler.js')
    },
    {
        id: 'terminal', title: 'Terminal', group: 'Linux', color: '#1b1f2a', size: [820, 520],
        about: 'A Linux shell with files, permissions, users and git',
        icon: icon('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>'),
        load: () => import('./terminal.js')
    },
    {
        id: 'files', title: 'Files', group: 'Linux', color: '#f9a825', size: [880, 560],
        about: 'Directory hierarchy, permissions and file system types',
        icon: icon('<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
        load: () => import('./files.js')
    },
    {
        id: 'vms', title: 'Virtual Machines', group: 'Linux', color: '#0097a7', size: [940, 620],
        about: 'Hypervisors, VMs, Windows vs Linux, distros and the cloud',
        icon: icon('<rect x="2" y="4" width="13" height="10" rx="1.5"/><rect x="9" y="10" width="13" height="10" rx="1.5"/>'),
        load: () => import('./vms.js')
    },
    {
        id: 'network', title: 'Network Lab', group: 'Networks and security', color: '#1e88e5', size: [980, 660],
        about: 'Topologies, devices, network types and client-server',
        icon: icon('<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M12 7.5v5M12 12.5l-5.5 4.5M12 12.5l5.5 4.5"/>'),
        load: () => import('./network.js')
    },
    {
        id: 'security', title: 'Security Center', group: 'Networks and security', color: '#2e7d32', size: [980, 660],
        about: 'Passwords, hashing, 2FA, phishing, malware and firewalls',
        icon: icon('<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>'),
        load: () => import('./security.js')
    },
    {
        id: 'gitlab', title: 'Git Lab', group: 'Version control', color: '#f4511e', size: [940, 620],
        about: 'See your terminal commits as a live graph',
        icon: icon('<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="9" r="2.5"/><path d="M6 8.5v7M18 11.5c0 4-6 3-11 5"/>'),
        load: () => import('./gitlab.js')
    },
    {
        id: 'flowchart', title: 'Flowchart Studio', group: 'Thinking like a programmer', color: '#5e35b1', size: [980, 660],
        about: 'Algorithms as pseudocode and flowcharts you can run',
        icon: icon('<rect x="8" y="2" width="8" height="4" rx="2"/><path d="M12 6v3M12 9l4 3-4 3-4-3z"/><path d="M12 15v3"/><rect x="8" y="18" width="8" height="4"/>'),
        load: () => import('./flowchart.js')
    },
    {
        id: 'careers', title: 'Career Compass', group: 'Careers', color: '#c2185b', size: [960, 640],
        about: 'Cohorts, pathways, MOOCs, hackathons and your profiles',
        icon: icon('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'),
        load: () => import('./careers.js')
    },
    {
        id: 'ai', title: 'AI Studio', group: 'AI and emerging tech', color: '#6d4c41', size: [980, 660],
        about: 'Generative AI, prompts, ethics, blockchain, IoT and Web3',
        icon: icon('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z"/>'),
        load: () => import('./ai.js')
    }
];

export const appById = (id) => APPS.find(app => app.id === id);
