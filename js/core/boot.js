// Boot sequence: firmware POST -> bootloader menu -> kernel log -> services.
// Each stage shows a short note explaining what a real computer is doing.

import { h, $, sleep } from './ui.js';

const STAGES = [
    ['Stage 1 of 4 · Firmware', 'The BIOS/UEFI chip runs first. Its Power-On Self-Test (POST) checks the CPU, RAM and disks, then finds a device to boot from.'],
    ['Stage 2 of 4 · Bootloader', 'GRUB, the bootloader, sits on the disk. It lets you choose an operating system and loads that kernel into RAM.'],
    ['Stage 3 of 4 · Kernel', 'The kernel takes control of the hardware: it detects devices, mounts the root file system and starts the first process (PID 1).'],
    ['Stage 4 of 4 · Init and services', 'systemd (PID 1) starts background services like networking and logging, then hands over to the login screen.']
];

const POST = [
    ['ByteBIOS v2.4  (c) ByteOS Project', 0],
    ['', 120],
    ['CPU  : ByteCore i5 @ 3.20 GHz, 4 cores / 8 threads ....... OK', 220],
    ['GPU  : ByteGraphics 2048 shader cores ..................... OK', 160],
    ['RAM  : testing 8192 MB', 0],
    ['%MEM%', 0],
    ['Disk : SSD 256 GB (NVMe)  /dev/sda ........................ OK', 200],
    ['USB  : keyboard, mouse detected ............................ OK', 160],
    ['', 120],
    ['Boot order: 1. NVMe SSD  2. USB  3. Network', 200],
    ['Loading bootloader from /dev/sda1 ...', 380]
];

const KERNEL = [
    '[    0.000000] Linux version 6.8.0-byteos (gcc 13.2.0)',
    '[    0.000000] Command line: BOOT_IMAGE=/boot/vmlinuz root=/dev/sda2 ro quiet',
    '[    0.012451] Memory: 8192MB available',
    '[    0.104223] smpboot: Brought up 1 node, 8 CPUs',
    '[    0.392114] PCI: probing devices',
    '[    0.612090] nvme nvme0: 256 GB SSD detected',
    '[    0.733508] usb 1-1: new keyboard and mouse',
    '[    0.981744] EXT4-fs (sda2): mounted root file system (read-only)',
    '[    1.120012] Run /sbin/init as init process (PID 1)'
];

const SERVICES = [
    'Started Journal Service (logging)',
    'Remounted root file system read-write',
    'Started Network Manager',
    'Reached target Network',
    'Started OpenSSH Server',
    'Started Firewall (nftables)',
    'Reached target Graphical Interface'
];

export async function boot() {
    const screen = $('#boot-screen');
    const lesson = $('#boot-lesson');
    const section = $('#boot');
    let skipped = false;

    const skip = () => { skipped = true; };
    const onKey = e => { if (e.key === 'Escape') skip(); };
    $('#boot-skip').onclick = skip;
    addEventListener('keydown', onKey);

    const wait = (ms) => (skipped ? Promise.resolve() : sleep(ms));
    const line = (text, cls = '') => {
        const el = h('div', { class: `boot__line ${cls}` }, text);
        screen.append(el);
        screen.scrollTop = screen.scrollHeight;
        return el;
    };
    const stage = (i) => {
        lesson.replaceChildren(h('strong', {}, STAGES[i][0]), h('span', {}, STAGES[i][1]));
    };

    section.hidden = false;
    screen.className = 'boot__screen boot__screen--bios';
    screen.replaceChildren();

    // 1. firmware
    stage(0);
    for (const [text, delay] of POST) {
        if (text === '%MEM%') {
            const mem = line('');
            for (let mb = 0; mb <= 8192; mb += 512) {
                mem.textContent = `       ${String(mb).padStart(5)} MB ${mb === 8192 ? '................................ OK' : ''}`;
                await wait(35);
            }
            continue;
        }
        line(text);
        await wait(delay);
    }

    // 2. bootloader
    stage(1);
    const choice = await grub(screen, () => skipped);

    // 3. kernel
    stage(2);
    screen.className = 'boot__screen boot__screen--kernel';
    screen.replaceChildren();
    for (const text of KERNEL) {
        line(choice === 1 ? text.replace('quiet', 'single (recovery)') : text);
        await wait(110);
    }

    // 4. services
    stage(3);
    for (const text of SERVICES) {
        line('', 'boot__service').append(h('span', { class: 'ok' }, '[  OK  ]'), ` ${text}`);
        await wait(130);
    }
    await wait(450);

    removeEventListener('keydown', onKey);
    section.classList.add('is-done');
    await sleep(350);
    section.hidden = true;
    section.classList.remove('is-done');
}

async function grub(screen, isSkipped) {
    const entries = ['ByteOS 1.0', 'ByteOS 1.0 (recovery mode)', 'Memory test (memtest86+)'];
    let selected = 0;
    let seconds = 5;

    screen.className = 'boot__screen boot__screen--grub';
    const list = h('ul', { class: 'grub__list', role: 'listbox', 'aria-label': 'Boot menu' });
    const timer = h('p', { class: 'grub__timer' });
    screen.replaceChildren(
        h('p', { class: 'grub__title' }, 'GNU GRUB  version 2.12'),
        list,
        h('p', { class: 'grub__help' }, 'Use ↑ and ↓ to choose, Enter to boot. Click an entry with the mouse too.'),
        timer
    );

    const render = () => {
        list.replaceChildren(...entries.map((entry, i) => h('li', {
            role: 'option',
            'aria-selected': i === selected,
            class: i === selected ? 'is-selected' : '',
            onClick: () => { selected = i; done(); }
        }, entry)));
        timer.textContent = seconds > 0 ? `The highlighted entry will boot automatically in ${seconds}s.` : '';
    };

    let done;
    const picked = new Promise(resolve => { done = () => resolve(selected); });

    const onKey = e => {
        if (e.key === 'ArrowDown') selected = (selected + 1) % entries.length;
        else if (e.key === 'ArrowUp') selected = (selected + entries.length - 1) % entries.length;
        else if (e.key === 'Enter') return done();
        else return;
        seconds = 0;
        e.preventDefault();
        render();
    };
    addEventListener('keydown', onKey);
    render();

    const countdown = setInterval(() => {
        if (isSkipped()) return done();
        if (seconds === 0) return;
        seconds--;
        render();
        if (seconds === 0) done();
    }, 1000);

    const choice = await picked;
    clearInterval(countdown);
    removeEventListener('keydown', onKey);

    if (choice === 2 && !isSkipped()) {
        screen.replaceChildren(h('p', { class: 'grub__title' }, 'Memtest86+ 7.0'));
        for (const text of ['Test 1 [Address test, walking ones] ....... pass', 'Test 2 [Moving inversions, 1s & 0s] ....... pass', 'Test 3 [Random number sequence] ........... pass', '', 'Pass complete, no errors. Returning to boot menu...']) {
            screen.append(h('div', { class: 'boot__line' }, text));
            await sleep(450);
        }
        await sleep(600);
        return grub(screen, isSkipped);
    }
    return choice;
}
