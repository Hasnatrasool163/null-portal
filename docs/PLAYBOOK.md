# Web-e-Thon Playbook (10 hours, evaluation next day)

The judging sheet rewards 3 things equally: a working app, clean engineering, and PROOF you analysed the problem. Documentation is part of the score, not an afterthought.

## Before the theme (done tonight / morning)
- `npm install`, DB running, `npm run dev` works, login works, `npm run check` passes.
- Hosting account ready (see DEPLOY.md) and a first dummy deploy done, so you know the pipeline works.
- Phone hotspot ready (organizers provide internet, but bring your own). Charger, extension board, projector converter (HDMI/USB-C).

## Day 1 timeline (theme arrives 30 minutes before start)
| Time | Do |
|---|---|
| T-30 to 0:00 | Read the theme 3 times. Open `docs/submission/01-REQUIREMENTS-ANALYSIS.md`. List ambiguities. **Do not code yet.** |
| 0:00-0:45 | Finish the analysis: requirements table, assumptions, MoSCoW scope (Must/Should/Could), roles, entities, ERD, page list, API list. |
| 0:45-1:15 | Rename the example module to your entity: migration, schemas, seed data. App runs with real data model. |
| 1:15-4:30 | Build Must-haves as vertical slices (DB -> API -> UI), one feature at a time, each finished with validation and error states. |
| ~4:30 | **First deploy.** Redeploy after each milestone so a deploy bug never surprises you at the end. |
| 4:30-7:30 | Should-haves, edge cases, business rules (clashes, limits, duplicates, status transitions). |
| 7:30-8:30 | Consistency pass: spacing, colours, copy, empty/loading/error states, mobile width, dark mode. Seed rich demo data. Test on the deployed site. |
| 8:30-9:15 | Finish `02-DESIGN.md` and `03-TRACEABILITY.md`, README with demo logins, demo script. |
| 9:15-9:30 | Final deploy and smoke test. |
| 9:30 | **FREEZE.** No commits, pushes, deploys, env changes after this. Leave a 30 minute margin before the deadline. |

## Rules that disqualify (from the rulebook): treat as hard limits
- Any commit, push, build or deployment after the submission deadline. Turn OFF auto-deploy for the repo/branch when you freeze, and do not edit files on GitHub's website "just for a typo".
- Never edit commit dates or timestamps. Logs are inspected.
- No WordPress or page-builder scripts. Any framework/language is fine.
- No leaving the premises. Only water in the lab. No talking to other teams.
- You MUST be present for your 15 minute evaluation on Day 2 (4-7 PM).

## What each criterion really wants
| Criterion | How to score it |
|---|---|
| Completion of requirements | Build exactly what the theme lists first. Keep a checklist with the original wording, tick it, show it. |
| Front-end / back-end validation | Same zod schemas both sides (starter does this). In the demo, show a browser error AND a rejected raw API call. Also validate business rules (duplicates, date logic, capacity). |
| Back-end architecture | Explain the layers: route -> service -> repository -> DB. Consistent error format, auth on every route, access control server side. |
| Visual design + consistency | One palette, one spacing scale, same components everywhere, same wording for the same action. Empty/loading/error states on every screen. |
| Simplicity | Fewer, finished features beat many half-working ones. A new user should understand each screen in 5 seconds. |
| Case study analysis | The ambiguity table: unclear, incomplete, ambiguous, contradictory requirements and what you decided and why. Say it out loud in the demo. |
| Technical analysis, constraints | State constraints (10 hours, 3 people, free hosting, DB limits, browser support) and how they shaped decisions. |
| Design approach, OO/best practices | Layered design, single responsibility, DRY schemas, SQL injection safe queries, hashed passwords, httpOnly cookies. |
| Database design | ERD, keys, FKs, CHECK constraints, indexes, normalisation (3NF) with one sentence of reasoning per table. |
| Technology selection reason | A table: option considered, chosen, why. Ready-made in 02-DESIGN.md. |
| Code and design gap, mapping design to code | `03-TRACEABILITY.md`: requirement -> design element -> file/function. List honest gaps and what you would do next. |

## Tips
1. **Ask nothing, state assumptions.** You cannot query the organizers mid-event; write assumptions down and design so they are cheap to change.
2. Spot contradictions early: e.g. "anyone can book" vs "only verified users", "unlimited" vs "limited capacity", roles mentioned but permissions missing.
3. Build the **data model first**. Most bugs in 10-hour projects are schema mistakes found at hour 6.
4. Use constraints in the DB as the last line of defence (CHECK, UNIQUE, FK), plus zod in code.
5. Use AI coding tools hard (allowed), but you must be able to explain every file. Review diffs. Keep prompts short and specific using `docs/AGENT_PROMPT.md`.
6. Commit small and often with meaningful messages. Judges read the history.
7. Seed realistic demo data and demo accounts for every role. Empty apps look broken.
8. Never demo only the happy path: show a validation error, a forbidden action, and an empty state.
9. If the theme invites AI (recommendations, summaries, chat), add ONE small, reliable AI feature through `src/lib/llm.ts`. Don't let it become a dependency for core flows.
10. Test on a phone-width window and in dark mode before the freeze.

## Day 2: evaluation (15 minutes, live, deployed site)
- Arrive early. Warm the site 10 minutes before your slot (free hosts sleep). Log in once per role in separate windows.
- Backup plan: app running on localhost with the same DB URL, plus a 2 minute screen recording. Do not deploy or push anything to fix problems; present what you have.
- Demo script:
  1. (1 min) Problem, assumptions, scope decisions from your analysis table.
  2. (8 min) Core flows end to end, per role. Include a validation failure and a forbidden action.
  3. (3 min) Architecture diagram, ERD, why these technologies.
  4. (3 min) Design vs code: open `03-TRACEABILITY.md`, point at 2 requirements -> files, and admit the known gaps.
- Answer questions honestly. "We left X out because of time, here's how we'd add it" scores better than bluffing.
- Everyone on the team must be able to explain any part of the code.
