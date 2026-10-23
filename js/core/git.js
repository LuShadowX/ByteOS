// A small but honest Git: real staging area, commits with parents, branches,
// fast-forward and three-way merges. Repo data lives in <repo>/.git/repo.json.

import { fs, lookup, normalize, dirname, FsError } from './vfs.js';
import { store } from './store.js';

const META = '.git/repo.json';

function hash(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
}

export function findRepo(cwd) {
    let path = cwd;
    while (true) {
        const node = lookup(path === '/' ? '/.git' : `${path}/.git`);
        if (node?.type === 'dir') return path;
        if (path === '/') return null;
        path = dirname(path);
    }
}

export function listRepos(node = lookup('/'), path = '') {
    if (node?.type !== 'dir') return [];
    const here = node.children['.git'] ? [path || '/'] : [];
    return here.concat(Object.entries(node.children)
        .filter(([name]) => name !== '.git')
        .flatMap(([name, child]) => listRepos(child, `${path}/${name}`)));
}

export function loadRepo(repoPath) {
    const node = lookup(`${repoPath}/${META}`);
    return node ? JSON.parse(node.content) : null;
}

function saveRepo(repoPath, repo, user) {
    fs.write(`${repoPath}/${META}`, JSON.stringify(repo), user);
}

// path (relative to repo) -> content for every file outside .git
function workingTree(repoPath) {
    const out = {};
    const visit = (node, rel) => {
        for (const [name, child] of Object.entries(node.children)) {
            if (name === '.git') continue;
            const path = rel ? `${rel}/${name}` : name;
            if (child.type === 'dir') visit(child, path);
            else out[path] = child.content;
        }
    };
    visit(lookup(repoPath), '');
    return out;
}

const headTree = (repo) => {
    const id = repo.branches[repo.head];
    return id ? repo.commits[id].tree : {};
};

function diffTrees(from, to) {
    const changes = [];
    for (const path of new Set([...Object.keys(from), ...Object.keys(to)])) {
        if (!(path in from)) changes.push(['new file', path]);
        else if (!(path in to)) changes.push(['deleted', path]);
        else if (from[path] !== to[path]) changes.push(['modified', path]);
    }
    return changes.sort((a, b) => a[1].localeCompare(b[1]));
}

function ancestors(repo, id) {
    const seen = new Set();
    const stack = [id];
    while (stack.length) {
        const current = stack.pop();
        if (!current || seen.has(current)) continue;
        seen.add(current);
        stack.push(...repo.commits[current].parents);
    }
    return seen;
}

function lineDiff(a = '', b = '') {
    const left = a.split('\n');
    const right = b.split('\n');
    const out = [];
    const max = Math.max(left.length, right.length);
    for (let i = 0; i < max; i++) {
        if (left[i] === right[i]) {
            if (left[i] !== undefined) out.push(`  ${left[i]}`);
            continue;
        }
        if (left[i] !== undefined) out.push(`-${left[i]}`);
        if (right[i] !== undefined) out.push(`+${right[i]}`);
    }
    return out;
}

function writeTree(repoPath, tree, user) {
    const current = workingTree(repoPath);
    for (const path of Object.keys(current)) {
        if (!(path in tree)) fs.remove(`${repoPath}/${path}`, user);
    }
    for (const [path, content] of Object.entries(tree)) {
        const full = `${repoPath}/${path}`;
        fs.mkdir(dirname(full), user, { parents: true });
        fs.write(full, content, user);
    }
}

const identity = () => store.get('git-identity', { name: 'Lukshya Supyal', email: 'lukshya@byteos.dev' });

export function git(args, { cwd, user }) {
    const [command, ...rest] = args;
    const flags = new Set(rest.filter(arg => arg.startsWith('-')));
    const words = rest.filter(arg => !arg.startsWith('-'));

    if (!command || command === 'help' || command === '--help') {
        return [
            'usage: git <command>',
            '',
            '  init                 create an empty repository here',
            '  status               show changed, staged and untracked files',
            '  add <file> | .       stage changes for the next commit',
            '  commit -m "message"  save a snapshot of the staged files',
            '  log [--oneline]      show commit history',
            '  diff [--staged]      show line changes',
            '  branch [name]        list or create branches',
            '  switch [-c] <name>   move to a branch (-c creates it)',
            '  checkout [-b] <name> same as switch',
            '  merge <branch>       join another branch into this one',
            '  config user.name "x" set your identity',
            '  remote add origin <url> / push   simulate publishing to GitHub'
        ];
    }

    if (command === 'config') {
        const [key, ...value] = words;
        const id = identity();
        if (!value.length) return [id[key?.split('.')[1]] ?? ''];
        if (key === 'user.name') id.name = value.join(' ');
        else if (key === 'user.email') id.email = value.join(' ');
        else return [`error: key does not contain a section: ${key}`];
        store.set('git-identity', id);
        return [];
    }

    if (command === 'init') {
        if (lookup(`${cwd}/.git`)) return [`Reinitialized existing Git repository in ${cwd}/.git/`];
        fs.mkdir(`${cwd}/.git`, user);
        saveRepo(cwd, { head: 'main', branches: { main: null }, commits: {}, index: {}, remote: null }, user);
        return [`Initialized empty Git repository in ${cwd}/.git/`];
    }

    const repoPath = findRepo(cwd);
    if (!repoPath) return ['fatal: not a git repository (or any of the parent directories): .git'];
    const repo = loadRepo(repoPath);
    const work = workingTree(repoPath);
    const head = headTree(repo);
    const save = () => saveRepo(repoPath, repo, user);
    const rel = (path) => normalize(path, cwd).slice(repoPath === '/' ? 1 : repoPath.length + 1);

    switch (command) {
        case 'status': {
            const staged = diffTrees(head, repo.index);
            const unstaged = diffTrees(repo.index, work).filter(([kind]) => kind !== 'new file');
            const untracked = Object.keys(work).filter(path => !(path in repo.index));
            const out = [`On branch ${repo.head}`];
            if (!repo.branches[repo.head]) out.push('', 'No commits yet');
            if (staged.length) out.push('', 'Changes to be committed:', ...staged.map(([kind, path]) => `\t${kind}:   ${path}`));
            if (unstaged.length) out.push('', 'Changes not staged for commit:', '  (use "git add <file>..." to update what will be committed)', ...unstaged.map(([kind, path]) => `\t${kind}:   ${path}`));
            if (untracked.length) out.push('', 'Untracked files:', '  (use "git add <file>..." to include in what will be committed)', ...untracked.map(path => `\t${path}`));
            if (!staged.length && !unstaged.length && !untracked.length) out.push('nothing to commit, working tree clean');
            return out;
        }

        case 'add': {
            if (!words.length && !flags.has('-A')) return ['Nothing specified, nothing added.'];
            const targets = words.includes('.') || flags.has('-A') ? null : words.map(rel);
            const matches = (path) => !targets || targets.some(t => path === t || path.startsWith(t + '/'));
            let touched = 0;
            for (const [path, content] of Object.entries(work)) {
                if (matches(path)) { repo.index[path] = content; touched++; }
            }
            for (const path of Object.keys(repo.index)) {
                if (!(path in work) && matches(path)) { delete repo.index[path]; touched++; }
            }
            if (!touched && targets) return [`fatal: pathspec '${words[0]}' did not match any files`];
            save();
            return [];
        }

        case 'commit': {
            const at = rest.indexOf('-m');
            const message = at === -1 ? '' : rest.slice(at + 1).join(' ');
            if (!message) return ['error: please give a message with -m "what you changed"'];
            if (!diffTrees(head, repo.index).length) return [`On branch ${repo.head}`, 'nothing to commit, working tree clean'];
            const parent = repo.branches[repo.head];
            const { name, email } = identity();
            const time = Date.now();
            const id = hash(`${parent}${message}${time}${JSON.stringify(repo.index)}`) + hash(String(time));
            repo.commits[id] = { id, message, parents: parent ? [parent] : [], tree: { ...repo.index }, author: `${name} <${email}>`, time, branch: repo.head };
            repo.branches[repo.head] = id;
            save();
            const files = diffTrees(head, repo.index);
            return [`[${repo.head}${parent ? '' : ' (root-commit)'} ${id.slice(0, 7)}] ${message}`, ` ${files.length} file${files.length === 1 ? '' : 's'} changed`];
        }

        case 'log': {
            const tip = repo.branches[repo.head];
            if (!tip) return [`fatal: your current branch '${repo.head}' does not have any commits yet`];
            const out = [];
            const history = [...ancestors(repo, tip)].map(id => repo.commits[id]).sort((a, b) => b.time - a.time);
            for (const c of history) {
                const id = c.id;
                const labels = Object.entries(repo.branches).filter(([, tip]) => tip === id).map(([b]) => b === repo.head ? `HEAD -> ${b}` : b);
                const deco = labels.length ? ` (${labels.join(', ')})` : '';
                if (flags.has('--oneline')) out.push(`${id.slice(0, 7)}${deco} ${c.message}`);
                else out.push(`commit ${id}${deco}`, ...(c.parents.length > 1 ? [`Merge: ${c.parents.map(p => p.slice(0, 7)).join(' ')}`] : []), `Author: ${c.author}`, `Date:   ${new Date(c.time).toString().slice(0, 24)}`, '', `    ${c.message}`, '');
            }
            return out;
        }

        case 'diff': {
            const [from, to] = flags.has('--staged') || flags.has('--cached') ? [head, repo.index] : [repo.index, work];
            const out = [];
            for (const [kind, path] of diffTrees(from, to)) {
                if (kind === 'new file' && from === repo.index) continue;
                out.push(`diff --git a/${path} b/${path}`, `--- a/${path}`, `+++ b/${path}`, ...lineDiff(from[path], to[path]));
            }
            return out;
        }

        case 'branch': {
            if (flags.has('-d') || flags.has('-D')) {
                const name = words[0];
                if (name === repo.head) return [`error: Cannot delete branch '${name}' checked out`];
                if (!(name in repo.branches)) return [`error: branch '${name}' not found.`];
                delete repo.branches[name];
                save();
                return [`Deleted branch ${name}.`];
            }
            if (!words.length) return Object.keys(repo.branches).map(b => `${b === repo.head ? '*' : ' '} ${b}`);
            const name = words[0];
            if (!/^[\w./-]+$/.test(name)) return [`fatal: '${name}' is not a valid branch name`];
            if (name in repo.branches) return [`fatal: a branch named '${name}' already exists`];
            if (!repo.branches[repo.head]) return [`fatal: not a valid object name: '${repo.head}'`];
            repo.branches[name] = repo.branches[repo.head];
            save();
            return [];
        }

        case 'switch':
        case 'checkout': {
            const create = flags.has('-c') || flags.has('-b');
            const name = words[0];
            if (!name) return ['fatal: missing branch name'];
            if (create) {
                if (name in repo.branches) return [`fatal: a branch named '${name}' already exists`];
                repo.branches[name] = repo.branches[repo.head];
                repo.head = name;
                save();
                return [`Switched to a new branch '${name}'`];
            }
            if (!(name in repo.branches)) return [`error: pathspec '${name}' did not match any branch known to git`];
            if (diffTrees(head, repo.index).length || diffTrees(repo.index, work).some(([kind]) => kind !== 'new file')) {
                return ['error: Your local changes would be overwritten by checkout.', 'Please commit your changes before you switch branches.'];
            }
            const target = repo.branches[name] ? repo.commits[repo.branches[name]].tree : {};
            const untracked = Object.fromEntries(Object.entries(work).filter(([path]) => !(path in repo.index)));
            writeTree(repoPath, { ...target, ...untracked }, user);
            repo.head = name;
            repo.index = { ...target };
            save();
            return [`Switched to branch '${name}'`];
        }

        case 'merge': {
            const name = words[0];
            if (!(name in repo.branches)) return [`merge: ${name} - not something we can merge`];
            const ours = repo.branches[repo.head];
            const theirs = repo.branches[name];
            if (!theirs || ancestors(repo, ours).has(theirs)) return ['Already up to date.'];
            if (diffTrees(head, repo.index).length) return ['error: commit your staged changes before merging.'];

            if (!ours || ancestors(repo, theirs).has(ours)) {
                const tree = repo.commits[theirs].tree;
                writeTree(repoPath, tree, user);
                repo.branches[repo.head] = theirs;
                repo.index = { ...tree };
                save();
                return [`Updating ${ours?.slice(0, 7) ?? '0000000'}..${theirs.slice(0, 7)}`, 'Fast-forward', ...diffTrees(head, tree).map(([kind, path]) => ` ${path} (${kind})`)];
            }

            // three-way merge against the nearest shared ancestor
            const shared = ancestors(repo, theirs);
            const queue = [ours];
            let base = null;
            const seen = new Set();
            while (queue.length && !base) {
                const id = queue.shift();
                if (seen.has(id)) continue;
                seen.add(id);
                if (shared.has(id)) base = id;
                else queue.push(...repo.commits[id].parents);
            }
            const baseTree = base ? repo.commits[base].tree : {};
            const oursTree = repo.commits[ours].tree;
            const theirsTree = repo.commits[theirs].tree;
            const merged = {};
            const conflicts = [];
            for (const path of new Set([...Object.keys(baseTree), ...Object.keys(oursTree), ...Object.keys(theirsTree)])) {
                const [b, o, t] = [baseTree[path], oursTree[path], theirsTree[path]];
                if (o === t) { if (o !== undefined) merged[path] = o; }
                else if (o === b) { if (t !== undefined) merged[path] = t; }
                else if (t === b) { if (o !== undefined) merged[path] = o; }
                else conflicts.push(path);
            }
            if (conflicts.length) {
                return [...conflicts.map(path => `CONFLICT (content): Merge conflict in ${path}`), 'Automatic merge failed. Both branches changed the same file. Merge aborted so nothing is lost.'];
            }
            writeTree(repoPath, merged, user);
            const { name: author, email } = identity();
            const time = Date.now();
            const id = hash(`${ours}${theirs}${time}`) + hash(String(time + 1));
            const message = `Merge branch '${name}' into ${repo.head}`;
            repo.commits[id] = { id, message, parents: [ours, theirs], tree: merged, author: `${author} <${email}>`, time, branch: repo.head };
            repo.branches[repo.head] = id;
            repo.index = { ...merged };
            save();
            return [`Merge made by the 'ort' strategy.`, ...diffTrees(oursTree, merged).map(([kind, path]) => ` ${path} (${kind})`)];
        }

        case 'remote': {
            if (words[0] === 'add' && words[1] && words[2]) {
                repo.remote = { name: words[1], url: words[2] };
                save();
                return [];
            }
            return repo.remote ? [`${repo.remote.name}\t${repo.remote.url} (fetch)`, `${repo.remote.name}\t${repo.remote.url} (push)`] : [];
        }

        case 'push': {
            if (!repo.remote) return ['fatal: No configured push destination.', 'Add one with: git remote add origin https://github.com/<you>/<repo>.git'];
            const count = Object.keys(repo.commits).length;
            return [
                `Enumerating objects: ${count * 3}, done.`,
                `Writing objects: 100% (${count * 3}/${count * 3}), done.`,
                `To ${repo.remote.url}`,
                ` * [new branch]      ${repo.head} -> ${repo.head}`,
                '(simulated: ByteOS has no real network access)'
            ];
        }

        default:
            return [`git: '${command}' is not a git command. See 'git help'.`];
    }
}

export { FsError };
