// Git Lab: watches the git repositories you make in the Terminal and draws them live.

import { h, s, table, track, note } from '../core/ui.js';
import { bus } from '../core/store.js';
import { listRepos, loadRepo } from '../core/git.js';
import { lookup, USERS } from '../core/vfs.js';

const COLORS = ['#f4511e', '#2f6fed', '#00a389', '#7c4dff', '#d81b60', '#c77700'];

function workingTree(path) {
    const out = {};
    const visit = (node, rel) => {
        for (const [name, child] of Object.entries(node?.children ?? {})) {
            if (name === '.git') continue;
            const p = rel ? `${rel}/${name}` : name;
            if (child.type === 'dir') visit(child, p);
            else out[p] = child.content;
        }
    };
    visit(lookup(path), '');
    return out;
}

function graph(repo) {
    const commits = Object.values(repo.commits).sort((a, b) => a.time - b.time);
    if (!commits.length) return h('p', { class: 'muted' }, 'No commits yet. Stage a file and run: git commit -m "first commit"');
    const branches = [...new Set(['main', ...commits.map(c => c.branch), ...Object.keys(repo.branches)])];
    const lane = (b) => Math.max(0, branches.indexOf(b));
    const X = (c) => 40 + lane(c.branch) * 46;
    const Y = (i) => 30 + i * 46;
    const index = new Map(commits.map((c, i) => [c.id, i]));
    const longest = Math.max(...commits.map(c => Math.min(40, c.message.length)));
    const width = 40 + branches.length * 46 + 120 + longest * 7 + Object.keys(repo.branches).length * 110;
    const svg = s('svg', { viewBox: `0 0 ${width} ${Y(commits.length - 1) + 30}`, role: 'img', 'aria-label': 'Commit graph' });

    commits.forEach((c, i) => c.parents.forEach(pid => {
        const p = commits[index.get(pid)];
        if (!p) return;
        const [x1, y1, x2, y2] = [X(p), Y(index.get(pid)), X(c), Y(i)];
        svg.append(s('path', { d: x1 === x2 ? `M${x1} ${y1} L${x2} ${y2}` : `M${x1} ${y1} C${x1} ${y1 + 30}, ${x2} ${y2 - 30}, ${x2} ${y2}`, class: 'g-edge', stroke: COLORS[lane(c.parents.length > 1 && pid === c.parents[1] ? p.branch : c.branch) % COLORS.length] }));
    }));
    commits.forEach((c, i) => {
        const tips = Object.entries(repo.branches).filter(([, id]) => id === c.id).map(([b]) => b);
        const color = COLORS[lane(c.branch) % COLORS.length];
        const textX = 40 + branches.length * 46 + 10;
        svg.append(
            s('circle', { cx: X(c), cy: Y(i), r: c.parents.length > 1 ? 9 : 7, fill: color, class: 'g-node' }, s('title', {}, `${c.id.slice(0, 7)} ${c.message}`)),
            s('text', { x: textX, y: Y(i) + 4, class: 'g-msg' }, s('tspan', { class: 'g-id' }, c.id.slice(0, 7) + '  '), c.message.slice(0, 40)),
            ...tips.map((b, k) => {
                const label = b === repo.head ? `HEAD → ${b}` : b;
                const w = label.length * 7 + 14;
                const x = textX + 80 + c.message.slice(0, 40).length * 7 + k * (w + 6);
                return s('g', {}, s('rect', { x, y: Y(i) - 10, width: w, height: 20, rx: 10, fill: COLORS[lane(b) % COLORS.length], class: 'g-tag' }), s('text', { x: x + w / 2, y: Y(i) + 4, 'text-anchor': 'middle', class: 'g-tag__text' }, label));
            }));
    });
    return svg;
}

const MISSIONS = [
    ['Create a repository', 'cd ~/projects && git init', (r) => Boolean(r)],
    ['Create a file', 'echo "# My first repo" > README.md', (r, work) => r && Object.keys(work).length > 0],
    ['Stage it (add to the index)', 'git add README.md', (r) => r && Object.keys(r.index).length > 0],
    ['Make your first commit', 'git commit -m "Add README"', (r) => r && Object.keys(r.commits).length > 0],
    ['Create a branch and switch to it', 'git switch -c feature', (r) => r && Object.keys(r.branches).length > 1],
    ['Commit on the new branch', 'echo "new idea" > idea.txt && git add . && git commit -m "Add idea"', (r) => r && Object.values(r.commits).some(c => c.branch !== 'main')],
    ['Merge it back into main', 'git switch main && git merge feature', (r) => r && r.branches.main && Object.values(r.commits).filter(c => c.branch !== 'main').every(c => isAncestor(r, c.id, r.branches.main))],
    ['Connect a GitHub remote', 'git remote add origin https://github.com/you/first-repo.git && git push', (r) => r && Boolean(r.remote)]
];

function isAncestor(repo, id, tip) {
    const stack = [tip];
    const seen = new Set();
    while (stack.length) {
        const cur = stack.pop();
        if (!cur || seen.has(cur)) continue;
        if (cur === id) return true;
        seen.add(cur);
        stack.push(...(repo.commits[cur]?.parents ?? []));
    }
    return false;
}

export function mount(body, { open, session }) {
    track('gitlab/main');
    let selected = null;
    const pick = h('select', { class: 'select', 'aria-label': 'Repository' });
    const areas = h('div', { class: 'git-areas' });
    const graphBox = h('div', { class: 'svg-box git-graph' });
    const missions = h('ol', { class: 'missions' });
    const branchInfo = h('div', { class: 'row' });

    const render = () => {
        const repos = listRepos();
        if (!repos.includes(selected)) selected = repos.find(p => p.startsWith(USERS[session.user].home)) ?? repos[0] ?? null;
        pick.replaceChildren(...(repos.length ? repos.map(p => h('option', { value: p, selected: p === selected }, p)) : [h('option', {}, 'No repositories yet')]));
        pick.disabled = !repos.length;
        const repo = selected ? loadRepo(selected) : null;
        const work = selected ? workingTree(selected) : {};

        let done = 0;
        missions.replaceChildren(...MISSIONS.map(([title, cmd, test], i) => {
            const ok = Boolean(test(repo, work));
            const current = !ok && done === i;
            if (ok && done === i) done++;
            return h('li', { class: `${ok ? 'is-done' : ''}${current ? ' is-current' : ''}` },
                h('b', {}, title), h('code', {}, cmd),
                current ? h('button', { type: 'button', class: 'btn btn--sm', onClick: () => open('terminal', { run: i === 0 ? cmd : `cd ${selected ?? '~/projects'} && ${cmd}` }) }, 'Run in Terminal') : null);
        }));

        if (!repo) {
            areas.replaceChildren(h('p', { class: 'muted' }, 'Make a repository in the Terminal and it will appear here live.'));
            graphBox.replaceChildren(h('p', { class: 'muted', style: { padding: '16px' } }, 'The commit graph will be drawn here.'));
            branchInfo.replaceChildren();
            return;
        }

        const head = repo.branches[repo.head] ? repo.commits[repo.branches[repo.head]].tree : {};
        const paths = [...new Set([...Object.keys(work), ...Object.keys(repo.index), ...Object.keys(head)])].sort();
        const status = (p) => {
            if (!(p in repo.index) && p in work) return ['untracked', 'Untracked: git does not know this file yet'];
            if (p in work && work[p] !== repo.index[p]) return ['modified', 'Changed since you last staged it'];
            if (repo.index[p] !== head[p]) return ['staged', 'Staged: will go into the next commit'];
            return ['committed', 'Saved in the repository'];
        };
        const col = (title, sub, filter) => h('div', { class: 'git-area' }, h('h4', {}, title), h('small', { class: 'muted' }, sub),
            h('ul', {}, paths.filter(filter).map(p => { const [st, tip] = status(p); return h('li', { class: `gf gf--${st}`, title: tip }, p, h('span', {}, st)); })));
        areas.replaceChildren(
            col('Working directory', 'files on disk', p => p in work),
            h('div', { class: 'git-arrow' }, 'git add →'),
            col('Staging area (index)', 'what the next commit will contain', p => p in repo.index),
            h('div', { class: 'git-arrow' }, 'git commit →'),
            col(`Repository (${repo.head})`, 'the last commit', p => p in head));
        graphBox.replaceChildren(graph(repo));
        branchInfo.replaceChildren(h('span', { class: 'muted' }, 'Branches:'), ...Object.keys(repo.branches).map(b => h('span', { class: `chip${b === repo.head ? ' chip--ok' : ''}` }, b === repo.head ? `● ${b} (HEAD)` : b)),
            h('span', { class: 'muted' }, `${Object.keys(repo.commits).length} commits`), repo.remote ? h('span', { class: 'chip' }, `remote: ${repo.remote.url}`) : '');
    };

    pick.addEventListener('change', () => { selected = pick.value; render(); });
    const off = bus.on('fs:change', render);

    body.append(h('div', { class: 'app' },
        h('div', { class: 'app-head' }, h('div', {}, h('h3', {}, 'Version control with Git'), h('p', {}, 'Git records snapshots (commits) of your project so you can go back in time, try ideas on branches and work with others. Use git in the Terminal and watch this window update.'))),
        h('div', { class: 'row' }, h('label', { class: 'row' }, 'Repository', pick), h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onClick: () => open('terminal') }, 'Open Terminal')),
        h('div', { class: 'split', style: { marginTop: '12px' } },
            h('div', {}, areas, h('h4', {}, 'Commit graph'), branchInfo, graphBox),
            h('div', { class: 'card' }, h('h3', {}, 'Missions'), missions)),
        h('h4', {}, 'Git vs GitHub'),
        table(['', 'Git', 'GitHub'], [['What', 'Version control software', 'A website that hosts git repositories'], ['Where it runs', 'On your computer', 'In the cloud'], ['Needs internet?', 'No', 'Yes'], ['Made by', 'Linus Torvalds (2005)', 'GitHub Inc. (Microsoft)'], ['Adds', 'commits, branches, merges', 'pull requests, issues, profiles, GitHub Pages']]),
        h('h4', {}, 'Cheat sheet'),
        table(['Command', 'What it does'], [
            ['git config --global user.name "Your Name"', 'Set who you are (once, after installing git)'],
            ['git init', 'Turn the current folder into a repository'],
            ['git status', 'See what has changed'],
            ['git add <file> / git add .', 'Stage changes'],
            ['git commit -m "message"', 'Save a snapshot with a message'],
            ['git log --oneline', 'Show history'],
            ['git branch <name> / git switch -c <name>', 'Create a branch / create and switch'],
            ['git merge <branch>', 'Bring another branch\'s commits into this one'],
            ['git remote add origin <url> · git push', 'Connect to GitHub and upload']
        ]),
        note('Good commit messages say what and why in the present tense: "Add login form", not "changes".')));
    render();
    return { cleanup: off };
}
