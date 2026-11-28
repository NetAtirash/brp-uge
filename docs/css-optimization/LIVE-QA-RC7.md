# RC7 live QA follow-up
RC6+RC10 user evidence: 22 passed, 4 failed, 1 not tested after clarifying Status and existing-character preservation. Separate newly reported issues: manager disabled heading validation, scroll resets, missing Thai group labels, light library tags and requested GM recovery correction.
- RC10 contains no labelTh on standard Personality choice groups. The engine uses localized generic fallback and requires content author to supply full Thai labels. Ride, Etiquette, Status and Literacy are campaign-defined; do not fabricate book options. The visible empty Ride group blocks Brutal/Skilled intentionally until GM adds a suitable Specialty. A shortage is not also reported as duplicate capacity.
- Play Instrument is disabled in RC10 and its Thai descriptive name contains parentheses. Untouched book rows must not prevent navigation. No content edits.
- Foundry v14 scrollable part declarations preserve scroll for same-part renders. Live QA still required. 
- GM recovery correction updates only record flags and recovered amount, not current HP, treatment count, closure, or major wound consequences. Existing HP can be adjusted separately.
- Existing actor safety not tested in a new World. Test copied existing World separately. No automatic migration. No main merge or stable/channel update before release approval. Full-package only.
