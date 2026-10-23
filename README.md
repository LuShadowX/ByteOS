# ByteOS

A computer that runs in your browser. ByteOS boots like a real PC (firmware, GRUB, kernel, services, login) and gives you a desktop full of apps that let you *use* the ideas behind computing instead of just reading about them.

**Live:** https://lushadowx.github.io/ByteOS/
**Project report (PDF):** [docs/ByteOS_Report.pdf](docs/ByteOS_Report.pdf)

Built with plain HTML, CSS and JavaScript (ES modules). No frameworks, no build step, no server.

## What you can do

| App | Try this |
|---|---|
| **Terminal** | A bash-like shell over a Linux-style file system: `ls -l`, `chmod 600`, `sudo`, `su guest`, pipes (`cat notes.txt \| grep RAM`), redirection, tab completion, and a working `git` |
| **Git Lab** | Watch the repo you build in the terminal as a live commit graph, with the working directory, staging area and repository side by side |
| **Files** | Explore the directory hierarchy, see rwx permissions, compare file systems (FAT32, exFAT, NTFS, ext4, APFS, UDF) |
| **Inside the Computer** | Click through the block diagram and step a fetch–decode–execute cycle; memory hierarchy; SSD vs HDD race; CPU vs GPU; ports; a RAID 0/1/5/6/10 lab with real XOR parity and disk failures |
| **Number Systems** | Convert between binary, octal, decimal and hex with every step shown; bit board with two's complement; text as bytes; quiz |
| **System Monitor** | Live processes (every window is a process), kernel types, OS types, the boot process, CPU scheduling (FCFS, SJF, Round Robin) with Gantt charts |
| **Compiler Lab** | A tiny language compiled for real: tokens → syntax tree → assembly → machine code → runs on a stack VM. Switch to interpreter mode and compare |
| **Virtual Machines** | A hypervisor with real CPU/RAM/disk limits, type 1 vs type 2, Linux vs Windows, distros, open source, cloud models |
| **Network Lab** | Build bus/star/ring/mesh/tree networks and cut cables; hub vs switch (MAC learning) vs router; a client–server request from DNS to response |
| **Security Center** | Password crack-time estimator, SHA-256 hashing and rainbow tables, real TOTP two-factor codes, phishing spotter, malware, account types, a firewall rule tester |
| **Flowchart Studio** | Algorithms as pseudocode and flowcharts that run step by step with a trace table |
| **Career Compass** | Cohorts, pathways, MOOCs, hackathons, technical profile checker, cohort quiz |
| **AI Studio** | AI/ML/DL, generative AI tools, a prompt analyser, AI ethics, an agentic AI loop, an IoT smart room, a working proof-of-work blockchain, Web3 |
| **Course Map** | Every CSE111 topic linked to the app that teaches it, with progress ticks |

## Run it locally

ES modules need to be served over HTTP, not opened from `file://`:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Shortcuts: `Esc` skips the boot, `Ctrl+Alt+T` opens a terminal, double-click a title bar to maximise.
Everything you create (files, repos, VMs, pins, progress) is saved in your browser. **Power → Reset** restores factory state.

## How it is built

```
index.html
css/
  base.css          boot, login, desktop, windows, taskbar
  apps.css          shared components + per-app styles
js/
  main.js           login, desktop, start menu, power menu
  core/
    boot.js         POST → GRUB menu → kernel log → services
    wm.js           window manager (drag, resize, minimise, processes)
    vfs.js          in-memory file system with owners and rwx permissions
    git.js          staging area, commits, branches, fast-forward and 3-way merge
    ui.js           tiny DOM helpers, tabs, progress tracking
    store.js        safe localStorage + event bus
  apps/             one ES module per app, loaded only when opened
docs/               project report and screenshots
```

A few details worth knowing:

- **Permissions are enforced**, not just displayed. Every path lookup checks execute permission on each directory, reads need `r`, writes need `w` on the parent, and only the owner or root can `chmod`.
- **Git is real enough to reason about.** `git add` copies content into an index, commits snapshot the index and point to their parents, `merge` fast-forwards when it can and otherwise does a three-way merge against the nearest common ancestor (aborting on conflicts).
- **Security maths is real.** 2FA codes use HMAC-SHA1 per RFC 6238 (checked against the RFC test vectors), hashes use the browser's SHA-256, and RAID 5 parity is the XOR of the data blocks.
- **The compiler is real.** A hand-written lexer and recursive-descent parser build an AST, which is compiled to stack-machine bytecode and executed.

## Course mapping

ByteOS was built for **CSE111 Orientation to Computing**. It covers all six units of *Orientation to Computing-I* (computer system, operating system, Linux, cohorts and skill sets, networks and security, version control with AI and profiles) and all six course outcomes of the current syllabus (CO1–CO6), including number systems, computational thinking and emerging technologies. The full topic-by-topic mapping is in the Course Map app and in the [project report](docs/ByteOS_Report.pdf).
