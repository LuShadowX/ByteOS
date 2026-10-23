// Virtual Machines: a hypervisor simulator, Linux vs Windows, distributions and open source, cloud computing.

import { h, tabs, table, note, toast } from '../core/ui.js';
import { store } from '../core/store.js';

const HOST = { cpus: 8, ram: 16, disk: 512, reservedRam: 4 };
const IMAGES = {
    ubuntu: { name: 'Ubuntu 24.04', color: '#e95420', min: { cpu: 2, ram: 4, disk: 25 } },
    fedora: { name: 'Fedora 40', color: '#3c6eb4', min: { cpu: 2, ram: 2, disk: 20 } },
    debian: { name: 'Debian 12', color: '#a80030', min: { cpu: 1, ram: 1, disk: 10 } },
    kali: { name: 'Kali Linux', color: '#367bf0', min: { cpu: 2, ram: 2, disk: 20 } },
    windows: { name: 'Windows 11', color: '#0078d4', min: { cpu: 2, ram: 4, disk: 64 } }
};

function hypervisor(panel) {
    let vms = store.get('vms', [{ id: 1, name: 'ubuntu-lab', os: 'ubuntu', cpu: 2, ram: 4, disk: 25, running: false }]);
    const save = () => store.set('vms', vms);
    const usage = h('div', { class: 'grid-3' });
    const list = h('div', { class: 'vm-list' });
    const form = h('form', { class: 'card vm-form' });

    const used = () => vms.filter(v => v.running).reduce((acc, v) => ({ cpu: acc.cpu + v.cpu, ram: acc.ram + v.ram }), { cpu: 0, ram: 0 });
    const diskUsed = () => vms.reduce((sum, v) => sum + v.disk, 0);

    const meter = (label, value, max, unit, warn) => h('div', { class: 'stat' },
        h('span', {}, label), h('b', {}, `${value} / ${max} ${unit}`),
        h('div', { class: 'meter' }, h('span', { style: { '--v': `${Math.min(100, (value / max) * 100)}%`, '--c': value > max || warn ? 'var(--bad)' : value / max > 0.75 ? 'var(--warn)' : 'var(--good)' } })));

    const render = () => {
        const u = used();
        usage.replaceChildren(
            meter('Host CPU (vCPUs of running VMs)', u.cpu, HOST.cpus, 'cores'),
            meter(`Host RAM (${HOST.reservedRam} GB kept for the host OS)`, u.ram + HOST.reservedRam, HOST.ram, 'GB'),
            meter('Host SSD (all virtual disks)', diskUsed(), HOST.disk, 'GB'));
        list.replaceChildren(...vms.map(vm => {
            const img = IMAGES[vm.os];
            return h('article', { class: `vm-card${vm.running ? ' is-on' : ''}`, style: { '--os': img.color } },
                h('div', { class: 'vm-screen' }, vm.running ? h('div', { class: 'vm-desktop' }, h('b', {}, img.name), h('small', {}, `${vm.name} · running`)) : h('span', {}, 'Powered off')),
                h('div', { class: 'vm-meta' }, h('h4', {}, vm.name), h('p', { class: 'muted' }, `${img.name} · ${vm.cpu} vCPU · ${vm.ram} GB RAM · ${vm.disk} GB disk`)),
                h('div', { class: 'row' },
                    h('button', { type: 'button', class: `btn btn--sm${vm.running ? ' btn--ghost' : ''}`, onClick: () => toggle(vm) }, vm.running ? 'Shut down' : 'Start'),
                    h('button', { type: 'button', class: 'btn btn--sm btn--ghost', disabled: vm.running, onClick: () => { vms = vms.filter(v => v !== vm); save(); render(); } }, 'Delete')));
        }));
        if (!vms.length) list.append(h('p', { class: 'muted' }, 'No virtual machines yet. Create one above.'));
    };

    const toggle = (vm) => {
        if (!vm.running) {
            const u = used();
            if (u.ram + vm.ram + HOST.reservedRam > HOST.ram) {
                toast(`Not enough free RAM to start ${vm.name}. Shut another VM down first.`);
                return;
            }
            if (u.cpu + vm.cpu > HOST.cpus) toast('CPU is over-committed: VMs will share cores and run slower.');
        }
        vm.running = !vm.running;
        save();
        render();
    };

    const osSel = h('select', { class: 'select', name: 'os' }, Object.entries(IMAGES).map(([id, img]) => h('option', { value: id }, img.name)));
    const slider = (name, min, max, value, unit) => {
        const out = h('b', {}, `${value} ${unit}`);
        const input = h('input', { type: 'range', name, min, max, value, onInput: e => { out.textContent = `${e.target.value} ${unit}`; checkMin(); } });
        return { el: h('label', { class: 'field' }, h('span', {}, name.toUpperCase(), ' ', out), input), input };
    };
    const cpu = slider('cpu', 1, 8, 2, 'vCPU');
    const ram = slider('ram', 1, 16, 4, 'GB');
    const disk = slider('disk', 10, 200, 30, 'GB');
    const hint = h('p', { class: 'muted' });
    const checkMin = () => {
        const min = IMAGES[osSel.value].min;
        const low = [];
        if (+cpu.input.value < min.cpu) low.push(`${min.cpu} vCPU`);
        if (+ram.input.value < min.ram) low.push(`${min.ram} GB RAM`);
        if (+disk.input.value < min.disk) low.push(`${min.disk} GB disk`);
        hint.className = low.length ? 'note note--warn' : 'muted';
        hint.textContent = low.length ? `${IMAGES[osSel.value].name} needs at least ${low.join(', ')}.` : `Minimum for ${IMAGES[osSel.value].name}: ${min.cpu} vCPU, ${min.ram} GB RAM, ${min.disk} GB disk.`;
        return !low.length;
    };
    osSel.addEventListener('change', checkMin);
    const name = h('input', { class: 'input', name: 'name', value: 'my-vm', maxlength: 20, required: true, pattern: '[a-z0-9-]+', title: 'lowercase letters, numbers and dashes' });
    form.append(h('h3', {}, 'Create a virtual machine'),
        h('div', { class: 'grid-2' }, h('label', { class: 'field' }, h('span', {}, 'Name'), name), h('label', { class: 'field' }, h('span', {}, 'Operating system (ISO image)'), osSel)),
        h('div', { class: 'grid-3' }, cpu.el, ram.el, disk.el), hint,
        h('button', { type: 'submit', class: 'btn' }, 'Create VM'));
    form.addEventListener('submit', e => {
        e.preventDefault();
        if (!form.reportValidity() || !checkMin()) return;
        if (diskUsed() + Number(disk.input.value) > HOST.disk) return toast('The host SSD is full.');
        vms.push({ id: Date.now(), name: name.value, os: osSel.value, cpu: +cpu.input.value, ram: +ram.input.value, disk: +disk.input.value, running: false });
        save();
        render();
        toast(`${name.value} created. Press Start to boot it.`);
    });
    checkMin();

    const stack = (title, layers, sub) => h('div', { class: 'hv-stack' }, h('h4', {}, title), ...layers.map(([label, cls]) => h('div', { class: `hv-layer ${cls}` }, label)), h('p', { class: 'muted' }, sub));

    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Virtual machines'), h('p', {}, 'A virtual machine is a whole computer made of software. A hypervisor slices one real machine (the host) into several virtual ones (guests), each with its own OS.'))),
        h('p', { class: 'muted' }, `This host: ${HOST.cpus} CPU cores, ${HOST.ram} GB RAM, ${HOST.disk} GB SSD.`),
        usage, form, list,
        h('h4', {}, 'Two kinds of hypervisor'),
        h('div', { class: 'grid-2' },
            stack('Type 1 · bare metal', [['VM 1', 'vm'], ['VM 2', 'vm'], ['Hypervisor', 'hv'], ['Hardware', 'hw']], 'Runs directly on the hardware. Used in data centres: VMware ESXi, Microsoft Hyper-V, KVM, Xen.'),
            stack('Type 2 · hosted', [['VM 1', 'vm'], ['VM 2', 'vm'], ['Hypervisor app', 'hv'], ['Host OS (Windows/macOS)', 'os'], ['Hardware', 'hw']], 'Runs as an app on your normal OS. Used on laptops: VirtualBox, VMware Workstation, Parallels.')),
        h('h4', {}, 'Creating a VM in VirtualBox'),
        h('ol', { class: 'steps' }, ['Install VirtualBox and download an OS .iso file (e.g. Ubuntu).', 'Click New, give it a name and choose the ISO.', 'Allocate memory (RAM) and CPU cores. Leave enough for the host.', 'Create a virtual hard disk (a big file on your real disk).', 'Start the VM. It boots from the ISO like a real PC would from a USB stick.', 'Install the OS inside it. Take a snapshot so you can roll back if you break something.'].map(t => h('li', {}, t))),
        note('Why use VMs? Try other operating systems safely, test software, run servers in the cloud, and keep things isolated: a virus in a VM cannot easily reach the host.'));
    render();
}

function compare(panel) {
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Linux'), h('p', {}, 'A free, open-source, Unix-like operating system started by Linus Torvalds in 1991. It runs everything from phones (Android) to every one of the world\'s top 500 supercomputers.'))),
        h('div', { class: 'grid-2' },
            h('div', { class: 'linux-arch' }, [['Applications & utilities', 'Firefox, VS Code, ls, grep'], ['Shell', 'bash, zsh: reads your commands'], ['Kernel', 'manages hardware, processes and memory'], ['Hardware', 'CPU, RAM, disks, devices']].map(([a, b]) => h('div', {}, h('b', {}, a), h('small', {}, b)))),
            h('div', { class: 'info-cards' }, [['Open source', 'Anyone can read, change and share the code (GPL licence).'], ['Multi-user', 'Many users, each with their own files and permissions.'], ['Multitasking', 'Runs many processes at once.'], ['Secure', 'Strict permissions, root separation, fast security fixes.'], ['Portable', 'Runs on x86, ARM, RISC-V and more.'], ['Free', 'No licence fees, ever.']].map(([t, p]) => h('div', { class: 'info-card' }, h('h4', {}, t), h('p', {}, p))))),
        h('h4', {}, 'Windows vs Linux'),
        table(['', 'Windows', 'Linux'], [
            ['Cost', 'Paid licence', 'Free'],
            ['Source code', 'Closed (proprietary)', 'Open source'],
            ['Kernel', 'Hybrid (Windows NT)', 'Monolithic (Linux)'],
            ['File system', 'NTFS', 'ext4 (also Btrfs, XFS)'],
            ['Folder paths', 'C:\\Users\\name', '/home/name'],
            ['Admin account', 'Administrator', 'root (use sudo)'],
            ['Command line', 'PowerShell, cmd', 'bash and other shells'],
            ['Installing software', '.exe/.msi installers, Microsoft Store', 'Package managers: apt, dnf, pacman'],
            ['Customisation', 'Limited', 'Change anything, even the kernel'],
            ['Typical use', 'Office desktops, gaming', 'Servers, cloud, development, supercomputers, Android']
        ]));
}

const DISTROS = [
    ['Ubuntu', 'Debian', 'apt', 'Beginners, laptops, cloud servers', '#e95420'],
    ['Debian', 'Independent', 'apt', 'Rock-solid servers', '#a80030'],
    ['Fedora', 'Red Hat', 'dnf', 'Developers who want new software', '#3c6eb4'],
    ['Red Hat Enterprise Linux', 'Red Hat', 'dnf', 'Companies that need paid support', '#ee0000'],
    ['Linux Mint', 'Ubuntu', 'apt', 'People coming from Windows', '#87cf3e'],
    ['Arch Linux', 'Independent', 'pacman', 'Experienced users who build their own setup', '#1793d1'],
    ['Kali Linux', 'Debian', 'apt', 'Security testing and ethical hacking', '#367bf0'],
    ['Android', 'Linux kernel', 'Play Store', 'Phones and tablets', '#3ddc84']
];

function distros(panel) {
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Linux distributions'), h('p', {}, 'A distro = the Linux kernel + a package manager + software + a desktop, put together by a community or company.'))),
        h('div', { class: 'info-cards' }, DISTROS.map(([name, base, pkg, use, color]) => h('div', { class: 'info-card distro', style: { '--d': color } }, h('h4', {}, name), h('p', {}, use), h('div', { class: 'row' }, h('span', { class: 'chip' }, `based on ${base}`), h('span', { class: 'chip mono' }, pkg))))),
        h('h4', {}, 'Open-source software'),
        h('p', {}, 'Open source means the source code is public. Anyone can study it, improve it and share it. Most of the internet runs on it.'),
        table(['Software', 'Replaces', 'Licence'], [['Linux', 'Windows, macOS', 'GPL'], ['Firefox', 'Chrome, Edge', 'MPL'], ['LibreOffice', 'Microsoft Office', 'MPL'], ['GIMP', 'Photoshop', 'GPL'], ['VLC', 'Windows Media Player', 'GPL'], ['Git', '(the standard for version control)', 'GPL'], ['Python', '(language)', 'PSF']]),
        note('Free as in freedom, not just free of cost: open-source licences protect your right to see and change the code.'));
}

function cloud(panel) {
    const layers = ['Applications', 'Data', 'Runtime', 'Middleware', 'Operating system', 'Virtualization', 'Servers', 'Storage', 'Networking'];
    const models = [['On-premises', 9], ['IaaS', 4], ['PaaS', 2], ['SaaS', 0]];
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Cloud computing'), h('p', {}, 'Renting computing power, storage and software over the internet instead of owning the machines. Underneath, the cloud is huge data centres full of virtual machines.'))),
        h('div', { class: 'cloud-grid' }, models.map(([name, mine]) => h('div', { class: 'cloud-col' }, h('h4', {}, name),
            ...layers.map((layer, i) => h('div', { class: i < mine ? 'cloud-you' : 'cloud-them' }, layer))))),
        h('div', { class: 'row', style: { margin: '8px 0 14px' } }, h('span', { class: 'chip cloud-you' }, 'You manage'), h('span', { class: 'chip cloud-them' }, 'Provider manages')),
        table(['Model', 'You get', 'Examples'], [
            ['IaaS (Infrastructure)', 'Virtual machines, storage, networks', 'AWS EC2, Google Compute Engine, Azure VMs'],
            ['PaaS (Platform)', 'A ready platform to deploy your code', 'Google App Engine, Heroku, Vercel'],
            ['SaaS (Software)', 'Finished apps in the browser', 'Gmail, Google Docs, Zoom, Canva']
        ]),
        h('h4', {}, 'Deployment models'),
        h('div', { class: 'info-cards' }, [['Public cloud', 'Shared by everyone, run by a provider (AWS, Azure, GCP).'], ['Private cloud', 'Used by one organisation only, e.g. a bank\'s own data centre.'], ['Hybrid cloud', 'Mix of both: sensitive data private, the rest public.'], ['Community cloud', 'Shared by organisations with the same needs, e.g. government departments.']].map(([t, p]) => h('div', { class: 'info-card' }, h('h4', {}, t), h('p', {}, p)))),
        note('Benefits: pay only for what you use, scale up in minutes, no hardware to maintain, access from anywhere.'));
}

export function mount(body, { args }) {
    const view = tabs([
        { id: 'hyper', label: 'Hypervisor', render: hypervisor },
        { id: 'compare', label: 'Linux vs Windows', render: compare },
        { id: 'distros', label: 'Distros & open source', render: distros },
        { id: 'cloud', label: 'Cloud computing', render: cloud }
    ], { app: 'vms' });
    body.append(view.el);
    if (args?.tab) view.show(args.tab);
    return { onArgs: (a) => a?.tab && view.show(a.tab) };
}
