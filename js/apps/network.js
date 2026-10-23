// Network Lab: network types, topologies you can break, hub vs switch vs router, and the client-server model.

import { h, s, tabs, table, note, sleep } from '../core/ui.js';

/* ---------------- types ---------------- */

function types(panel) {
    const NETS = [
        ['PAN', 'Personal Area Network', '~10 m', 'Phone ↔ earbuds, smartwatch (Bluetooth)', 1],
        ['LAN', 'Local Area Network', 'A room to a campus', 'College lab, home Wi-Fi, office', 2],
        ['MAN', 'Metropolitan Area Network', 'A whole city', 'Cable TV network, city-wide Wi-Fi, bank branches in a city', 3],
        ['WAN', 'Wide Area Network', 'Countries and continents', 'The internet, a company linking offices worldwide', 4]
    ];
    const rings = s('svg', { viewBox: '0 0 300 300', role: 'img', 'aria-label': 'Network sizes from PAN to WAN' },
        ...NETS.slice().reverse().map(([abbr], i) => {
            const r = 140 - i * 34;
            return s('g', {}, s('circle', { cx: 150, cy: 150, r, class: `net-ring net-ring--${3 - i}` }), s('text', { x: 150, y: 150 - r + 22, 'text-anchor': 'middle', class: 'net-ring__label' }, abbr));
        }));
    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'What is a computer network?'), h('p', {}, 'Two or more devices connected so they can share data and resources. Networks are grouped by how much area they cover.'))),
        h('div', { class: 'split' }, h('div', {}, table(['Type', 'Full form', 'Covers', 'Example'], NETS.map(([a, b, c, d]) => [a, b, c, d]))), h('div', { class: 'svg-box' }, rings)),
        h('h4', {}, 'Five components of data communication'),
        h('div', { class: 'comm-flow' }, [['Sender', 'your laptop'], ['Message', 'the data'], ['Medium', 'cable or radio waves'], ['Protocol', 'rules both sides follow (TCP/IP, HTTP)'], ['Receiver', 'the server']].map(([a, b]) => h('div', {}, h('b', {}, a), h('small', {}, b)))),
        h('h4', {}, 'Transmission media'),
        table(['Wired (guided)', 'Wireless (unguided)'], [['Twisted pair (Ethernet cable)', 'Radio waves (Wi-Fi, Bluetooth)'], ['Coaxial (cable TV)', 'Microwaves (satellite, towers)'], ['Optical fibre (light, fastest)', 'Infrared (remotes)']]));
}

/* ---------------- topology ---------------- */

const TOPO_INFO = {
    bus: ['All devices share one backbone cable with terminators at both ends.', 'Cheap, little cable.', 'One break in the backbone splits the network. Only one device can send at a time.'],
    star: ['Every device has its own cable to a central hub or switch.', 'Easy to add devices. One cable failing affects only that device.', 'If the central device fails, everything stops (single point of failure).'],
    ring: ['Each device connects to two neighbours, forming a circle. Data travels around it.', 'Orderly, no collisions.', 'One break can stop the whole ring (unless it is a dual ring).'],
    mesh: ['Every device connects directly to every other device.', 'Extremely reliable: many alternative paths.', 'Expensive: needs n(n−1)/2 cables. 8 devices = 28 cables!'],
    tree: ['Star networks joined in a hierarchy under a root switch.', 'Scales well, easy to manage by branch.', 'If the root or a branch switch fails, everything below it is cut off.']
};

function buildTopology(kind, n) {
    const nodes = [];
    const edges = [];
    const pc = (id, x, y) => nodes.push({ id, x, y, kind: 'pc', label: id });
    const hub = (id, x, y, label) => nodes.push({ id, x, y, kind: 'hub', label });
    const link = (a, b) => edges.push({ id: `${a}-${b}`, a, b });
    const W = 560;
    const H = 330;
    if (kind === 'bus') {
        const gap = (W - 80) / (n - 1);
        for (let i = 0; i < n; i++) {
            const x = 40 + i * gap;
            nodes.push({ id: `J${i}`, x, y: H / 2, kind: 'junction' });
            pc(`PC${i + 1}`, x, i % 2 ? H / 2 + 95 : H / 2 - 95);
            link(`PC${i + 1}`, `J${i}`);
            if (i) link(`J${i - 1}`, `J${i}`);
        }
    } else if (kind === 'star') {
        hub('HUB', W / 2, H / 2, 'Switch');
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 - Math.PI / 2;
            pc(`PC${i + 1}`, W / 2 + Math.cos(a) * 140, H / 2 + Math.sin(a) * 130);
            link(`PC${i + 1}`, 'HUB');
        }
    } else if (kind === 'ring' || kind === 'mesh') {
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 - Math.PI / 2;
            pc(`PC${i + 1}`, W / 2 + Math.cos(a) * 150, H / 2 + Math.sin(a) * 130);
        }
        if (kind === 'ring') for (let i = 0; i < n; i++) link(`PC${i + 1}`, `PC${((i + 1) % n) + 1}`);
        else for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) link(`PC${i + 1}`, `PC${j + 1}`);
    } else if (kind === 'tree') {
        hub('ROOT', W / 2, 40, 'Root switch');
        hub('S1', W / 4, 150, 'Switch A');
        hub('S2', (W * 3) / 4, 150, 'Switch B');
        link('ROOT', 'S1');
        link('ROOT', 'S2');
        const left = Math.ceil(n / 2);
        for (let i = 0; i < n; i++) {
            const side = i < left ? 'S1' : 'S2';
            const k = i < left ? i : i - left;
            const count = i < left ? left : n - left;
            const base = side === 'S1' ? W / 4 : (W * 3) / 4;
            pc(`PC${i + 1}`, base + (k - (count - 1) / 2) * 62, 280);
            link(side, `PC${i + 1}`);
        }
    }
    return { nodes, edges };
}

function reachable(graph, from, failedNodes, cutEdges) {
    if (failedNodes.has(from)) return new Set();
    const seen = new Set([from]);
    const prev = new Map();
    const queue = [from];
    while (queue.length) {
        const cur = queue.shift();
        for (const e of graph.edges) {
            if (cutEdges.has(e.id)) continue;
            const other = e.a === cur ? e.b : e.b === cur ? e.a : null;
            if (!other || seen.has(other) || failedNodes.has(other)) continue;
            seen.add(other);
            prev.set(other, { node: cur, edge: e.id });
            queue.push(other);
        }
    }
    seen.prev = prev;
    return seen;
}

function topology(panel) {
    const state = { kind: 'star', n: 6, failed: new Set(), cut: new Set(), from: 'PC1', to: 'PC4' };
    const seg = h('div', { class: 'seg' });
    const count = h('input', { type: 'range', min: 4, max: 8, value: state.n, 'aria-label': 'Number of computers' });
    const countLabel = h('b');
    const svgBox = h('div', { class: 'svg-box topo' });
    const stats = h('div', { class: 'grid-4' });
    const info = h('div', { class: 'card' });
    const fromSel = h('select', { class: 'select' });
    const toSel = h('select', { class: 'select' });
    const status = h('p', { class: 'muted' });
    let graph;

    const pcs = () => graph.nodes.filter(n => n.kind === 'pc').map(n => n.id);
    const allConnected = (failed, cut) => {
        const ids = pcs().filter(id => !failed.has(id));
        if (!ids.length) return true;
        const r = reachable(graph, ids[0], failed, cut);
        return ids.every(id => r.has(id));
    };

    const render = () => {
        graph = buildTopology(state.kind, state.n);
        [...seg.children].forEach(b => b.setAttribute('aria-pressed', b.dataset.kind === state.kind));
        countLabel.textContent = `${state.n} computers`;
        const ids = pcs();
        if (!ids.includes(state.from)) state.from = ids[0];
        if (!ids.includes(state.to)) state.to = ids.at(-1);
        fromSel.replaceChildren(...ids.map(id => h('option', { selected: id === state.from }, id)));
        toSel.replaceChildren(...ids.map(id => h('option', { selected: id === state.to }, id)));
        const r = reachable(graph, state.from, state.failed, state.cut);
        const pos = Object.fromEntries(graph.nodes.map(n => [n.id, n]));

        const svg = s('svg', { viewBox: '0 0 560 330', role: 'img', 'aria-label': `${state.kind} topology` },
            // each cable = a visible line plus a wide transparent line that is easy to click
            ...graph.edges.map(e => {
                const ends = { x1: pos[e.a].x, y1: pos[e.a].y, x2: pos[e.b].x, y2: pos[e.b].y };
                return s('g', {
                    class: `topo-cable${state.cut.has(e.id) ? ' is-cut' : ''}${e.a.startsWith('J') && e.b.startsWith('J') ? ' is-backbone' : ''}`,
                    tabindex: 0, role: 'button', 'aria-label': `cable ${e.a} to ${e.b}`,
                    onClick: () => { state.cut.has(e.id) ? state.cut.delete(e.id) : state.cut.add(e.id); render(); },
                    onKeydown: ev => { if (ev.key === 'Enter') ev.currentTarget.dispatchEvent(new MouseEvent('click')); }
                }, s('line', { ...ends, class: 'topo-hit' }), s('line', { ...ends, class: 'topo-edge' }));
            }),
            ...(state.kind === 'bus' ? [s('rect', { x: 22, y: 155, width: 10, height: 20, class: 'topo-term' }), s('rect', { x: 528, y: 155, width: 10, height: 20, class: 'topo-term' })] : []),
            ...graph.nodes.filter(n => n.kind !== 'junction').map(n => s('g', {
                class: `topo-node topo-node--${n.kind}${state.failed.has(n.id) ? ' is-failed' : ''}${n.kind === 'pc' ? (r.has(n.id) ? ' is-reach' : ' is-unreach') : ''}${n.id === state.from ? ' is-source' : ''}`,
                tabindex: 0, role: 'button', 'aria-label': `${n.label}${state.failed.has(n.id) ? ' (failed)' : ''}`,
                onClick: () => { state.failed.has(n.id) ? state.failed.delete(n.id) : state.failed.add(n.id); render(); },
                onKeydown: ev => { if (ev.key === 'Enter') ev.currentTarget.dispatchEvent(new MouseEvent('click')); }
            },
                n.kind === 'pc' ? s('rect', { x: n.x - 22, y: n.y - 16, width: 44, height: 32, rx: 6 }) : s('rect', { x: n.x - 34, y: n.y - 15, width: 68, height: 30, rx: 15 }),
                s('text', { x: n.x, y: n.y + 4, 'text-anchor': 'middle' }, n.kind === 'pc' ? n.label : n.label))),
            s('circle', { r: 7, class: 'packet', cx: -20, cy: -20 }));
        svgBox.replaceChildren(svg);

        // resilience: does it survive any single cable cut? which nodes are single points of failure?
        const survivesCut = graph.edges.every(e => allConnected(new Set(), new Set([e.id])));
        const spof = graph.nodes.filter(n => n.kind === 'hub').filter(n => !allConnected(new Set([n.id]), new Set())).map(n => n.label);
        const reachCount = pcs().filter(id => r.has(id)).length;
        stats.replaceChildren(
            h('div', { class: 'stat' }, h('span', {}, 'Cables'), h('b', {}, graph.edges.filter(e => !(e.a.startsWith('J') && e.b.startsWith('J'))).length + (state.kind === 'bus' ? ' + backbone' : ''))),
            h('div', { class: 'stat' }, h('span', {}, `Reachable from ${state.from}`), h('b', {}, `${reachCount} / ${pcs().length}`)),
            h('div', { class: 'stat' }, h('span', {}, 'Survives any 1 cable cut?'), h('b', { class: survivesCut ? 'ok-text' : 'bad-text' }, survivesCut ? 'Yes' : 'No')),
            h('div', { class: 'stat' }, h('span', {}, 'Single point of failure'), h('b', { style: { fontSize: '15px' } }, spof.length ? spof.join(', ') : state.kind === 'bus' ? 'the backbone' : 'none')));
        const [what, pro, con] = TOPO_INFO[state.kind];
        info.replaceChildren(h('h3', {}, `${state.kind[0].toUpperCase()}${state.kind.slice(1)} topology`), h('p', {}, what), h('p', { class: 'note note--good' }, '+ ', pro), h('p', { class: 'note note--bad' }, '− ', con),
            state.kind === 'mesh' ? h('p', { class: 'mono' }, `${state.n} × (${state.n} − 1) ÷ 2 = ${(state.n * (state.n - 1)) / 2} cables`) : '');
    };

    const send = async () => {
        const r = reachable(graph, state.from, state.failed, state.cut);
        if (!r.has(state.to)) { status.textContent = `${state.to} cannot be reached from ${state.from}. Repair a cable or device (click it again).`; status.className = 'note note--bad'; return; }
        const path = [state.to];
        while (path[0] !== state.from) path.unshift(r.prev.get(path[0]).node);
        status.textContent = `Route: ${path.filter(id => !id.startsWith('J')).join(' → ')}`;
        status.className = 'note';
        const pos = Object.fromEntries(graph.nodes.map(n => [n.id, n]));
        const dot = svgBox.querySelector('.packet');
        for (let i = 0; i < path.length - 1; i++) {
            const a = pos[path[i]];
            const b = pos[path[i + 1]];
            for (let t = 0; t <= 1; t += 0.08) {
                dot.setAttribute('cx', a.x + (b.x - a.x) * t);
                dot.setAttribute('cy', a.y + (b.y - a.y) * t);
                await sleep(16);
            }
        }
        await sleep(400);
        dot.setAttribute('cx', -20);
    };

    ['bus', 'star', 'ring', 'mesh', 'tree'].forEach(kind => seg.append(h('button', { type: 'button', dataset: { kind }, onClick: () => { state.kind = kind; state.failed.clear(); state.cut.clear(); status.textContent = ''; render(); } }, kind[0].toUpperCase() + kind.slice(1))));
    count.addEventListener('input', () => { state.n = Number(count.value); state.failed.clear(); state.cut.clear(); render(); });
    fromSel.addEventListener('change', () => { state.from = fromSel.value; render(); });
    toSel.addEventListener('change', () => { state.to = toSel.value; });

    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Network topologies'), h('p', {}, 'Topology is the shape of a network. Click a cable to cut it, or a device to make it fail, and see who can still talk to whom.'))),
        h('div', { class: 'row' }, seg, h('label', { class: 'row' }, count, countLabel)),
        stats,
        h('div', { class: 'split', style: { marginTop: '12px' } }, h('div', {}, svgBox, h('div', { class: 'row', style: { marginTop: '8px' } }, 'Send a packet from', fromSel, 'to', toSel, h('button', { type: 'button', class: 'btn', onClick: send }, 'Send'), h('button', { type: 'button', class: 'btn btn--ghost', onClick: () => { state.failed.clear(); state.cut.clear(); render(); } }, 'Repair all')), status), info),
        h('div', { class: 'row legend' }, h('span', { class: 'chip lg-reach' }, 'reachable'), h('span', { class: 'chip lg-unreach' }, 'cut off'), h('span', { class: 'chip lg-failed' }, 'failed device'), h('span', { class: 'chip lg-source' }, 'source')));
    render();
}

/* ---------------- devices ---------------- */

function devices(panel) {
    const PCS = [['A', 'aa:aa:aa:00:00:01'], ['B', 'bb:bb:bb:00:00:02'], ['C', 'cc:cc:cc:00:00:03'], ['D', 'dd:dd:dd:00:00:04']];
    const state = { mode: 'hub', table: new Map(), busy: false };
    const svgBox = h('div', { class: 'svg-box' });
    const log = h('ol', { class: 'dev-log' });
    const macTable = h('div');
    const seg = h('div', { class: 'seg' });
    const fromSel = h('select', { class: 'select' }, PCS.map(([id]) => h('option', {}, id)));
    const toSel = h('select', { class: 'select' }, PCS.map(([id], i) => h('option', { selected: i === 2 }, id)));
    const pos = { A: [90, 60], B: [470, 60], C: [90, 240], D: [470, 240] };

    const draw = () => {
        svgBox.replaceChildren(s('svg', { viewBox: '0 0 560 300', role: 'img', 'aria-label': `Four computers connected to a ${state.mode}` },
            ...PCS.map(([id]) => s('line', { x1: pos[id][0], y1: pos[id][1], x2: 280, y2: 150, class: 'dev-wire', 'data-pc': id })),
            s('g', { class: 'dev-center' }, s('rect', { x: 220, y: 128, width: 120, height: 44, rx: 10 }), s('text', { x: 280, y: 156, 'text-anchor': 'middle' }, state.mode === 'hub' ? 'HUB' : 'SWITCH')),
            ...PCS.map(([id, mac]) => s('g', { class: 'dev-pc', 'data-pc': id }, s('rect', { x: pos[id][0] - 40, y: pos[id][1] - 24, width: 80, height: 48, rx: 8 }), s('text', { x: pos[id][0], y: pos[id][1] - 2, 'text-anchor': 'middle', class: 'dev-pc__name' }, `PC ${id}`), s('text', { x: pos[id][0], y: pos[id][1] + 14, 'text-anchor': 'middle', class: 'dev-pc__mac' }, mac.slice(0, 8) + '…')))));
        macTable.replaceChildren(state.mode === 'switch'
            ? h('div', {}, h('h4', {}, 'Switch MAC address table'), state.table.size ? table(['MAC address', 'Port'], [...state.table].map(([mac, port]) => [h('code', {}, mac), `port ${port}`])) : h('p', { class: 'muted' }, 'Empty. The switch learns which port each computer is on from the frames it sees.'))
            : h('p', { class: 'note note--warn' }, 'A hub has no table. It is a dumb repeater: whatever arrives on one port is copied out of every other port.'));
    };

    const flash = async (ids, cls) => {
        const svg = svgBox.querySelector('svg');
        ids.forEach(id => svg.querySelectorAll(`[data-pc="${id}"]`).forEach(el => el.classList.add(cls)));
        await sleep(700);
        ids.forEach(id => svg.querySelectorAll(`[data-pc="${id}"]`).forEach(el => el.classList.remove(cls)));
    };

    const send = async () => {
        if (state.busy) return;
        const from = fromSel.value;
        const to = toSel.value;
        if (from === to) return;
        state.busy = true;
        const mac = Object.fromEntries(PCS);
        const port = (id) => PCS.findIndex(([p]) => p === id) + 1;
        const add = (text, cls = '') => log.prepend(h('li', { class: cls }, text));
        await flash([from], 'is-sending');
        if (state.mode === 'hub') {
            const others = PCS.map(([id]) => id).filter(id => id !== from);
            add(`PC ${from} → ${to}: the hub repeats the frame out of ALL ports (${others.join(', ')}).`);
            await flash(others, 'is-receiving');
            add(`PC ${to} accepts it. ${others.filter(id => id !== to).map(id => `PC ${id}`).join(' and ')} see a MAC that is not theirs and drop it. Wasted bandwidth, and anyone could snoop.`, 'muted');
        } else {
            const learned = !state.table.has(mac[from]);
            state.table.set(mac[from], port(from));
            if (learned) add(`Switch learns: ${mac[from]} is on port ${port(from)}.`, 'muted');
            if (state.table.has(mac[to])) {
                add(`PC ${from} → ${to}: switch looks up ${mac[to]} → port ${state.table.get(mac[to])}. Sends ONLY there.`, 'ok-text');
                await flash([to], 'is-receiving');
            } else {
                const others = PCS.map(([id]) => id).filter(id => id !== from);
                add(`PC ${from} → ${to}: switch does not know ${mac[to]} yet, so it floods to all ports this once.`);
                await flash(others, 'is-receiving');
                add(`PC ${to} will reply soon, and then the switch will know its port too.`, 'muted');
            }
        }
        draw();
        state.busy = false;
    };

    ['hub', 'switch'].forEach(mode => seg.append(h('button', { type: 'button', dataset: { mode }, onClick: () => { state.mode = mode; state.table.clear(); log.replaceChildren(); [...seg.children].forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === mode)); draw(); } }, mode === 'hub' ? 'Hub' : 'Switch')));
    seg.children[0].setAttribute('aria-pressed', 'true');

    // router decision
    const routeIn = h('input', { class: 'input mono', value: '10.0.0.25', 'aria-label': 'Destination IP' });
    const routeOut = h('div');
    const ROUTES = [['192.168.1.0/24', 'eth0', 'Lab LAN (directly connected)'], ['10.0.0.0/24', 'eth1', 'Library LAN (directly connected)'], ['0.0.0.0/0', 'eth2 → modem → ISP', 'Default route: everything else, i.e. the internet']];
    const inNet = (ip, cidr) => {
        const [net, bits] = cidr.split('/');
        const toInt = (a) => a.split('.').reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
        const mask = bits === '0' ? 0 : (~0 << (32 - Number(bits))) >>> 0;
        return ((toInt(ip) & mask) >>> 0) === ((toInt(net) & mask) >>> 0);
    };
    const route = () => {
        const ip = routeIn.value.trim();
        if (!/^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(ip)) { routeOut.replaceChildren(h('p', { class: 'note note--bad' }, 'That is not a valid IPv4 address (four numbers 0–255 separated by dots).')); return; }
        const match = ROUTES.find(([cidr]) => inNet(ip, cidr));
        routeOut.replaceChildren(table(['Destination network', 'Send out of', 'Meaning', 'Match?'], ROUTES.map(([cidr, iface, what]) => [h('code', {}, cidr), iface, what, inNet(ip, cidr) ? h('span', { class: `badge ${match[0] === cidr ? 'badge--good' : 'badge--info'}` }, match[0] === cidr ? 'chosen' : 'matches') : '—'])),
            h('p', { class: 'note' }, `The router reads ${ip}, finds the most specific matching route (${match[0]}) and forwards the packet out of ${match[1]}.`));
    };
    routeIn.addEventListener('input', route);

    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Network devices'), h('p', {}, 'Hubs and switches connect devices inside one network. Routers connect different networks together.'))),
        h('div', { class: 'row' }, seg, 'Send a frame from', fromSel, 'to', toSel, h('button', { type: 'button', class: 'btn', onClick: send }, 'Send')),
        h('div', { class: 'split', style: { marginTop: '10px' } }, svgBox, h('div', {}, macTable, h('h4', {}, 'What happened'), log)),
        h('h4', {}, 'Router: choosing where a packet goes'),
        h('div', { class: 'row' }, h('label', { class: 'field' }, h('span', {}, 'Destination IP address'), routeIn), h('span', { class: 'muted' }, 'Try 192.168.1.7, 10.0.0.25 or 8.8.8.8')), routeOut,
        h('h4', {}, 'All the devices'),
        table(['Device', 'Works with', 'What it does'], [
            ['Hub', 'Bits (layer 1)', 'Repeats every signal to every port. Obsolete.'],
            ['Switch', 'MAC addresses (layer 2)', 'Learns which device is on which port and sends frames only where they need to go.'],
            ['Router', 'IP addresses (layer 3)', 'Connects networks and picks the best path between them. Your home Wi-Fi box is one.'],
            ['Modem', 'Analog ↔ digital signals', 'MOdulator-DEModulator: converts the ISP\'s line signal into data your router understands.'],
            ['Access point', 'Wi-Fi radio', 'Lets wireless devices join a wired network.'],
            ['NIC', 'Inside each device', 'Network interface card: gives the device its MAC address and port.']
        ]));
    draw();
    route();
}

/* ---------------- client-server ---------------- */

function clientServer(panel) {
    const url = h('input', { class: 'input mono', value: 'https://www.lpu.in/admissions', 'aria-label': 'URL' });
    const lanes = h('div', { class: 'svg-box' });
    const steps = h('ol', { class: 'cs-steps' });
    let running = false;

    const run = async () => {
        if (running) return;
        let parsed;
        try { parsed = new URL(url.value); } catch { steps.replaceChildren(h('li', { class: 'bad-text' }, 'That is not a valid URL. Example: https://example.com/page')); return; }
        running = true;
        const host = parsed.hostname;
        const ip = `103.${host.length * 7 % 255}.${host.length * 11 % 255}.${host.length * 5 % 255}`;
        const SEQ = [
            ['client', 'dns', 'DNS query', `Where is ${host}?`, 12],
            ['dns', 'client', 'DNS answer', `${host} is at ${ip}`, 8],
            ['client', 'server', 'TCP SYN', 'Can we talk? (1/3)', 20],
            ['server', 'client', 'TCP SYN-ACK', 'Yes, can you hear me? (2/3)', 20],
            ['client', 'server', 'TCP ACK', 'Yes. Connection open (3/3)', 20],
            ['client', 'server', 'TLS handshake', 'Agree on encryption keys (the padlock)', 40],
            ['client', 'server', `HTTP GET ${parsed.pathname}`, `Host: ${host}`, 20],
            ['server', 'server', 'Server works', 'Runs code and queries its database', 60],
            ['server', 'client', 'HTTP 200 OK', 'Here is the HTML page', 35],
            ['client', 'client', 'Browser renders', 'Downloads CSS, JS and images, then paints the page', 120]
        ];
        const X = { client: 90, dns: 290, server: 490 };
        const svg = s('svg', { viewBox: `0 0 580 ${70 + SEQ.length * 38}`, role: 'img', 'aria-label': 'Sequence diagram of a web request' },
            s('defs', {}, s('marker', { id: 'cs-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, s('path', { d: 'M0 0L10 5L0 10z', fill: '#1e88e5' }))),
            ...Object.entries({ client: 'Your browser (client)', dns: 'DNS server', server: `${host} (server)` }).map(([k, label]) => s('g', {},
                s('rect', { x: X[k] - 80, y: 8, width: 160, height: 30, rx: 8, class: 'cs-actor' }), s('text', { x: X[k], y: 28, 'text-anchor': 'middle', class: 'cs-actor__label' }, label),
                s('line', { x1: X[k], y1: 40, x2: X[k], y2: 60 + SEQ.length * 38, class: 'cs-lifeline' }))));
        lanes.replaceChildren(svg);
        steps.replaceChildren();
        let total = 0;
        for (const [i, [from, to, title, detail, ms]] of SEQ.entries()) {
            const y = 66 + i * 38;
            total += ms;
            if (from === to) svg.append(s('rect', { x: X[from] - 70, y: y - 14, width: 140, height: 22, rx: 6, class: 'cs-self' }), s('text', { x: X[from], y: y + 1, 'text-anchor': 'middle', class: 'cs-msg' }, title));
            else svg.append(s('line', { x1: X[from], y1: y, x2: X[to] + (X[to] > X[from] ? -4 : 4), y2: y, class: 'cs-arrow', 'marker-end': 'url(#cs-arrow)' }), s('text', { x: (X[from] + X[to]) / 2, y: y - 6, 'text-anchor': 'middle', class: 'cs-msg' }, title));
            steps.append(h('li', {}, h('b', {}, title), ` · ${detail} `, h('span', { class: 'muted' }, `(+${ms} ms)`)));
            await sleep(420);
        }
        steps.append(h('li', { class: 'ok-text' }, h('b', {}, `Page loaded in about ${total} ms.`)));
        running = false;
    };

    panel.append(
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'The client–server model'), h('p', {}, 'A client asks, a server answers. Your browser is a client. Every website lives on a server. Type a URL and follow the request.'))),
        h('div', { class: 'row' }, h('label', { class: 'field', style: { flex: 1 } }, h('span', {}, 'URL'), url), h('button', { type: 'button', class: 'btn', style: { alignSelf: 'end' }, onClick: run }, 'Visit')),
        h('div', { class: 'split', style: { marginTop: '12px' } }, lanes, steps),
        h('h4', {}, 'Client–server vs peer-to-peer'),
        table(['', 'Client–server', 'Peer-to-peer (P2P)'], [
            ['Who serves data?', 'A central server', 'Every computer (peer) can serve and request'],
            ['Examples', 'Websites, Gmail, online banking', 'BitTorrent, some blockchain networks'],
            ['If the centre fails', 'Service goes down', 'Network keeps working'],
            ['Security and control', 'Easy to manage centrally', 'Harder to control']
        ]));
    run();
}

export function mount(body, { args }) {
    const view = tabs([
        { id: 'types', label: 'Network types', render: types },
        { id: 'topology', label: 'Topologies', render: topology },
        { id: 'devices', label: 'Devices', render: devices },
        { id: 'clientserver', label: 'Client–server', render: clientServer }
    ], { app: 'network' });
    body.append(view.el);
    if (args?.tab) view.show(args.tab);
    return { onArgs: (a) => a?.tab && view.show(a.tab) };
}
