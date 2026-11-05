This project is governed by BRIEF.md and SCOPE.md (what it is and is not). BRIEF.md holds **guidelines for building the real thing**: keep them in mind as you write (accessibility and WCAG, security, SEO, performance, the legal items that apply) and do it right the first time, as part of making the site.
- BRIEF.md was fitted to this scope: items marked 🎯 carry a note on how they apply here, and the "fitted out" section lists what does not apply. Follow the notes over the generic wording.
- Pending items while building are normal. Do not "clear" them: never create test pages, placeholder sites, empty files or filler code just to make a check pass, and never build something that is later replaced just to meet a point.
- Checks run at the checkpoints (closing a sub-phase, `/mep:prelaunch`, `/mep:launch`, CI), on what actually exists. If a point does not apply yet because that part is not built, it is met when it is built.
- A push or PR does not require the pending 🔴 items to be met.
- Talk to the user in their language.

Code mantra: clear, simple, nice and reused.
- To find something, consult CODEMAP.md and REGISTRY.md first; do not search file by file.
- Before creating something, check REGISTRY.md and reuse what exists.
- Anything security-related is done or audited by the mep-security agent.
- If Ponytail is installed: follow its ladder (is it needed? → does it already exist here? → standard library → native function → installed dependency → the minimum that works). Its "does it already exist here?" step is resolved with REGISTRY.md.
- The simplest solution that works; nothing "just in case".
- Names that explain; comments only for the why.
- Every change leaves the code equal or cleaner than before.
