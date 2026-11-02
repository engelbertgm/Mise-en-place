# Guidelines

Design, UX, marketing and code principles for building websites, webapps and SaaS.
Section 0 is checked by the engine through catalog items. Every other section is a way of thinking while working: apply it with judgment.
The agent reads the section of the active sub-phase, and the close review of that sub-phase checks key views against it.
When a principle and a measurable rule conflict, the measurable rule wins.

Priority when principles pull against each other:
1. Non-negotiables (section 0)
2. Interaction and usability (section 3)
3. Visual design (section 2)
4. Copy and conversion (section 4), always inside the no-dark-patterns guardrail

---

## 0. Non-negotiables (measurable, checked by the engine)

UI
- Text contrast ≥ 4.5:1 (WCAG AA); large text and icons ≥ 3:1, in light and dark themes
- Touch targets ≥ 44×44 px
- Visible focus states; full keyboard navigation
- Spacing on the scale (8 pt grid, 4 pt half-steps allowed); no arbitrary values
- One type scale; max 2 font families
- Reading text 45–75 characters per line
- One primary CTA per view
- Every async action has loading, empty, error and success states
- Feedback in < 400 ms (skeletons, pending buttons or optimistic UI if slower)
- No dark patterns: only real scarcity, no prechecked upsells, no fake timers, no confirmshaming, cancel as easy as sign-up

Code
- Linter enforces complexity, file length and function length limits
- No duplicated code over the threshold; no unused files, exports or dependencies
- No import cycles
- Config and backing services (DB, mail, storage) come from validated env vars
- Server code is stateless: no local files or in-memory sessions
- Logs go to stdout or a structured logger, never to local files
- Dev and prod run the same runtime version and the same DB engine
- A walking skeleton is deployed before features are built

---

## 1. Simplicity (every UI phase)

Maeda's laws of simplicity
1. **Reduce**: remove until it breaks, then add back one thing.
2. **Organize**: grouping makes many things feel like few.
3. **Time**: saving the user time feels like simplicity.
4. **Learn**: what users understand feels simple; teach once, in context.
5. **Differences**: simplicity needs some complexity next to it to be noticed.
6. **Context**: what sits at the edges of the screen still matters.
7. **Emotion**: add warmth where it helps; a plain screen can still feel human.
8. **Trust**: users trust what is simple and predictable.
9. **Failure**: some things can't be made simple; make them clear instead.
10. **The One**: subtract the obvious, add the meaningful.

Rams: good design is useful, understandable, honest, unobtrusive, thorough down to the last detail, and as little design as possible.

---

## 2. Visual design (foundation.design)

1. **Visual hierarchy**: size, weight and color show order of importance.
2. **60-30-10 color**: dominant, secondary, accent. Accent only on actions.
3. **Von Restorff**: the different item gets noticed; reserve it for the primary CTA.
4. **Proximity**: close items read as a group.
5. **Similarity**: items that look alike seem related.
6. **Common region**: a shared container makes a group.
7. **Uniform connectedness**: lines or shared color link items more than distance does.
8. **Prägnanz**: people see the simplest shape; keep forms and layouts simple.
9. **Figure-ground**: foreground clearly separates from background.
10. **Alignment**: align to a grid; the eye follows lines.
11. **F / Z pattern**: key content goes where eyes scan.
12. **Aesthetic-usability**: good-looking designs feel easier and get more patience.

---

## 3. Interaction and usability (build.ux)

Status and feedback
- Always show what the system is doing (Nielsen 1, Norman: feedback).
- Respond in under 400 ms (Doherty).
- Show progress; motivation rises near the finish (goal-gradient).
- Keep unfinished tasks visible (Zeigarnik).

Familiarity and consistency
- Work like the products users already know (Jakob, mental models).
- Use the user's words, not the system's (Nielsen 2).
- Same thing, same look, same place, everywhere (Nielsen 4, Shneiderman 1).

Control and recovery
- Every action can be undone, cancelled or exited (Nielsen 3, Shneiderman 6).
- Users feel in control; the system never acts behind their back (Shneiderman 7, Tognazzini: autonomy).
- Protect the user's work: autosave, keep form input after errors (Tognazzini).

Errors
- Prevent errors before reporting them: constraints, good defaults, confirmations for destructive actions (Nielsen 5, Shneiderman 5, Norman: constraints).
- Error messages say what happened and how to fix it, in plain language (Nielsen 9).
- Accept flexible input, store strict data (Postel).

Memory and decisions
- Recognition over recall: show options, don't make users remember (Nielsen 6, Shneiderman 8).
- Fewer choices, faster decisions (Hick); chunk lists to about 7 ± 2 (Miller).
- The system absorbs complexity, not the user (Tesler).
- First and last items are remembered best (serial position).
- Users ignore what looks like ads (selective attention); keep key actions plain.

Discoverability
- Actions are visible and look clickable (Norman: discoverability, affordances, signifiers).
- Controls map clearly to what they change (Norman: mappings).
- Navigation is always visible; users can explore without fear (Tognazzini).
- People skip instructions; teach in context (paradox of the active user, Nielsen 10).

Efficiency and closure
- Big, close targets are faster to hit (Fitts).
- Shortcuts for frequent users, never required for new ones (Nielsen 7).
- Every flow ends with clear closure (Shneiderman 4); polish the best moment and the last one (peak-end).
- Focus on the 20% of features used most (Pareto).
- Minimalist screens: every extra element competes with the important ones (Nielsen 8).

Accessibility (WCAG POUR)
- Perceivable: alt text, captions, contrast.
- Operable: keyboard access, enough time, no flashing, reduced motion respected.
- Understandable: clear language, predictable behavior, input help.
- Robust: semantic HTML and landmarks that work with assistive technology.

---

## 4. Copy and conversion (launch.content; landing, ecommerce, marketplace and SaaS only)

Guardrail: every technique below is used honestly. If it needs a lie to work, don't use it.

Positioning
- Sell the job the user needs done, not the feature (Jobs-to-be-Done).
- Own one word in the prospect's mind (focus); if you can't be first in a category, create a new one (category).
- If you're #2, position against the leader (opposite).
- Give up something to own something (sacrifice).
- Admit a real negative and the prospect believes the positives (candor).

Copy
- Write for the reader's awareness level: unaware, problem aware, solution aware, product aware, most aware (Schwartz).
- Structure: AIDA (attention, interest, desire, action) or PAS (problem, agitate, solution).
- The ad or link promise equals the landing headline (message match).
- The same fact framed differently persuades differently (framing); losses weigh more than gains (loss aversion).

Persuasion (Cialdini)
- Reciprocity: give value first.
- Commitment: small yes, then bigger yes.
- Social proof: show real users, real numbers.
- Authority: show real expertise and credentials.
- Liking and unity: people buy from people like them.
- Scarcity: only when it's real.

Pricing
- The first price seen sets the reference (anchoring).
- A third option can make the target option look best (decoy).
- The preselected option wins; choose defaults in the user's interest (default effect).

Behavior and growth
- Behavior needs motivation, ability and a prompt (Fogg B = MAP); raise ability before pushing motivation.
- Habit loop: trigger, action, variable reward, investment (Hooked). Use it for real value, never compulsion.
- Measure acquisition, activation, retention, referral, revenue (AARRR).

---

## 5. Code (every phase)

- **KISS**: the simplest solution that works.
- **YAGNI**: don't build it until you need it.
- **DRY**: extract on the third use, not the second.
- **SOLID**, applied lightly: one responsibility per module, small interfaces, depend on what you pass in. No abstraction with a single implementation.
- **Gall's law**: complex systems that work grow from simple systems that worked. Ship the skeleton, then grow it.
- **Conway's law**: structure follows communication. Folders follow business domains; each agent or person owns one module.
- **Twelve-Factor**: config in env, declared dependencies, backing services as attached resources, stateless processes, logs as streams, dev/prod parity, admin tasks as scripts.
