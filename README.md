# NO CRUMBS

An offline-first campus food ecosystem: students pre-order meals, staff run the kitchen with forecasting, a food-waste matrix and safe decision gates. Pure HTML, CSS and JavaScript, no build step and no backend.

## Built for the CodeNex constraints
| Constraint | How the app answers it |
|---|---|
| **1. No internet, no third-party APIs** | Zero external requests: system fonts, locally drawn dish pictures, local scripts. A service worker caches the app so it keeps working offline; orders move between devices as a file. The pill at the top has a TEST OFFLINE switch. |
| **12. Enough information to list actions, not to choose safely** | A *Decision Gate* lists the options, names the single missing fact and blocks the irreversible action until it is supplied: **student allergy check**, **forecast** (event / rain unknown), **food rescue** (safe-temperature unknown). |

## Features
**Students:** menu with search and diet filters, cart drawer, pickup slots, ticket with live status (Placed, Preparing, Ready, Collected), allergy gate.
**Staff dashboard (`staff.html`):** Orders manager, food-waste matrix heatmap and ECHO rewind, ML demand forecast that retrains from logged mistakes, Safe Decision Gate, batch planner, plate scanner (browser computer vision), Food Passport, Crumb Exchange, Impact Ledger with CSV export.

## Demo accounts
| Role | ID | Password |
|---|---|---|
| Student | `CRUMB-STU-01` | `Student@123` |
| Staff | `CRUMB-CAN-01` | `Kitchen@123` |

These are demo credentials stored in client-side code. Do not reuse them anywhere real.

## Run with the backend (recommended for the event)
Needs only **Node.js 18+**. No `npm install`, no internet.
```bash
npm start            # or: node server/server.js
```
Open the printed address. Phones on the same Wi-Fi can use the `http://<laptop-ip>:3000` address, so students and staff on different devices share orders live.
```bash
npm test                                   # 6 automated API tests
node server/adduser.js ID PASSWORD staff   # add an account (8+ char password)
```
Data is stored in `server/data/` (JSON files plus an `audit.log` of logins and order changes). Delete that folder to reset.

**Backend features:** hashed passwords (scrypt), session tokens, login lockout after 5 failures, role checks on every route, server-side price calculation and menu validation, order state machine (staff advance one step at a time, students cancel only before cooking), the allergy decision gate enforced on the server (Constraint 12), live updates over Server-Sent Events, security headers that block every external resource (Constraint 1), and path-traversal protection.

**No backend?** The site still works on its own (local mode), which is what GitHub Pages serves.

## Run without the backend
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy on GitHub Pages
1. Create an empty repository on GitHub (for example `no-crumbs`).
2. In this folder run:
   ```bash
   git init
   git add .
   git commit -m "NO CRUMBS first release"
   git branch -M main
   git remote add origin https://github.com/<your-username>/no-crumbs.git
   git push -u origin main
   ```
3. On GitHub open **Settings, Pages**. Under *Build and deployment* choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then Save.
4. After a minute the site is live at `https://<your-username>.github.io/no-crumbs/`.
5. Open it once online. After that the app also works offline (service worker). After each update, change `V` in `sw.js` (for example `nc-v2`) so visitors get the new files.

## How the roles share data
Orders, passports and the forecast model live in the browser (`localStorage`). Student and staff tabs on the **same browser** see each other live. Across devices, use Orders, **Export / Import orders file** (this keeps Constraint 1: no server needed).

## Project structure
```
server/      zero-dependency Node backend (server.js, menu.json, adduser.js, test.js)
index.html   login + student ordering
staff.html   staff dashboard (tabs)
orders.html  order tracker / manager
sw.js, manifest.webmanifest   offline + installable
assets/style.css   one stylesheet (burgundy / pink / white)
assets/script.js   original login + ECHO simulator
assets/extra.js    ordering, cart, charts, intro
assets/pages.js    dashboard logic, ML, vision, decision gates
assets/net.js      offline pill + service worker registration
assets/img/        optional dish photos named <id>.jpg
```

## Honest limits
With the backend: roles and prices are enforced on the server, but traffic is plain HTTP (fine on a private canteen network; put it behind HTTPS before any public use) and the demo accounts keep their default passwords until you change them. In local/GitHub Pages mode: roles are not secure, data is per browser, the forecast starts from sample history, the plate scanner is a colour-based estimate that needs calibration, and CO2 and rupee figures are illustrative.

## Roadmap
Database upgrade (SQLite) if volumes grow, real dish photos, QR scanning at pickup, printable kitchen tickets, trained vision model, accessibility audit.
