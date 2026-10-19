# EyeCon audit — paper and game

Date: 2026-10-19. Paper audited: "EYECON_BURGRE_YUM" (Google Doc), read in full (front matter to Appendix I).
Game audited: this repository (website, title screen, game, quiz, admin, Supabase migrations, tests).

---

## 1. Summary

- The game matches the paper's core: 3 modules, 7 clients, 8-point snapping, WCAG contrast math, Piko onboarding, task list, hints, Guidebook, Supabase logging, pre-/post-test.
- Several paper passages described an older build (Client 7 tasks, contrast "too harsh" zone, typography examples, bonus pay, sign-in method). These were edited in the paper as **suggestions** (to accept in Google Docs). A few table cells must still be edited by hand (section 3.3).
- All tests pass except one phone-size layout test (phones are out of scope in the paper).

---

## 2. Game audit

### 2.1 Levels (checked with the grading engine)

| Client | Tasks | Starts broken | Solvable |
|---|---|---|---|
| 1 Mayonnaisegee (Alignment) | 5 | yes | yes |
| 2 Yappers.com (Contrast) | 5 | yes | yes |
| 3 Hay Buhay 3 (Typography) | 4 (hierarchy task already passes at start) | 3 of 4 | yes |
| 4 Antoks Manoks (Alignment) | 5 | yes | yes |
| 5 Cones (Contrast) | 6 | yes | yes |
| 6 Kolehiyo (Typography) | 4 | yes | yes |
| 7 BEAR ORAS (Capstone) | 10 | yes | yes |

- Every element of every client design sits on the 8-point grid (0 exceptions).
- Client 7 tasks: line up "Registration Officer"; move "Email (required)" above its box; line up the second radio button; title ≥ 7:1; "Sign in as (required)" 4.5–7:1; header "Sign in" ≥ 7:1; Sign in button ≥ 7:1; "National Office" 24px; "Verify email" on the same row as "Forgot Password?"; "Forgot Password?" 24px.
- Client 1: Instagram icon now starts correctly placed and locked; only the Tumblr icon needs fixing.

### 2.2 Contrast rules in the game

- Contrast Guide (Level 2 onward), shown with the contrast readout inside it:
  - Headings, titles and buttons: 7:1 and up (no upper limit)
  - Labels, hints and captions: 4.5–7:1
  - Too faint to read: under 4.5:1
- The row matching the selected text's current ratio is highlighted; the guide never says what kind of text the element is.
- Level 4 onward: pass/fail only, no target verdicts.
- Cones button orange lightened (#FF4E02 → #FF8A4C) so dark text can reach 7:1.

### 2.3 Other rules in the game

- Snapping and arrow-key nudge: 8px (Shift + arrow: 32px).
- Typography tasks: exact size, a maximum size, or a size order (titles > group titles > labels).
- Hints: the very first hint in the game is free; after that, the first hint in each level costs 10 and later ones 15.
- Service Fees: fixed fee per client, no star or streak bonus (40, 50, 55, 60, 65, 70, 80).
- Admin tools (Level Maker, Skip/Repeat, Test level buttons, Start over, Skip tutorials) appear only with `index.html?admin`.

### 2.4 Pre-test / post-test and database

- `quiz.html` has the same 20 questions, options and answer key as Appendix C and D.
- Sign-in: each browser gets an anonymous account; the player enters username, year level and section, and prior UI experience. The post-test skips this form if it was filled in on the pre-test (same device and browser).
- Supabase: row-level security on every table. Players read/write only their own data; admins read everything.
  - `quiz_results`: one pre-test and one post-test per account (unique index).
  - `respondents`: profile per account.
  - `play_events`: level_open, submit (attempt, stars, hints, tasks met/total, active and elapsed time), reply (approved), hint, level_leave, tutorial_step.
  - `submissions`, `level_progress`, `profiles`, `content_text`, `levels`.
- Admin dashboard reads:
  - Study tab: each respondent's pre score, post score and gain; per-item and per-content-area results; CSV export with respondent numbers.
  - Statistics tab: per level — players, approvals, first-try rate, submissions and resubmits per player, median active minutes, hints per player, abandoned attempts, **mean Technical Readiness Score (tasks met ÷ total × 100)**; drill-down per player.
- Note: the `submissions.score` column is a weighted score that includes a hidden placement measure. For the paper's Technical Readiness Score use tasks met ÷ total from `play_events` (shown in the admin dashboard).

### 2.4.1 Live database (checked with the Supabase connector, 2026-10-19)

- Migrations 0005 (`quiz_results`) and 0006 (`respondents`, `admin_study`) were missing on the live project, so pre-/post-tests could not be saved. Both are now applied; a simulated player could save one pre-test and a second one was refused (test rolled back).
- All player data cleared for a clean survey start: 89 profiles, 369 play events, 77 submissions, 36 level-progress rows. Admin accounts (2), levels and admin texts kept.
- Old published Level 7 email (23-task version) deleted. Level 7 tasks now use named text keys, so old published task labels no longer override them (needs deploy).
- Submit events never stored tasks met/total; fixed in `js/grading.js` (needs deploy).
- Still published and overriding the game: email bodies for Clients 1, 2, 3, 5, 6 and Client 3's "fix again" reply. Check them in the admin Text tab.
- Security advisor: RLS on every table; admin functions check `is_admin()` internally. Only minor warnings.

### 2.5 Client emails in admin

- All 7 clients' email subject, inbox preview, body and client replies are editable in the admin Text tab (56 email texts, plus gift, approval email and the player's reply template).
- Client 7 email rewritten to match the current level. If an older version was published from admin, it overrides the new text on the live site: check the Text tab after deploying.

### 2.6 UI check (website, title, Settings, desktop, Mail, editor, quiz, admin; 1920×1080)

- Contrast: all player-facing text passes WCAG AA after fixes. (The "Aa" sample in the contrast box deliberately shows the client's colour.)
- Text size: all player-facing text is 16px or larger, except the admin-only "Test level" label and the small ✕ icon. At smaller windows the whole editor scales down.
- 8-point grid in EyeCon's own interface: **not strict**. Examples: 10px and 14px paddings on the website, 6px/14px/18px on the admin login, 6.4px and 9.6px spacing in the editor panel. Needs a spacing clean-up if the paper claims the game's own UI follows the grid.

### 2.7 Fixes made during the audit

- "Time to clock in!" (website): 2.9:1 → 3.9:1 (large text).
- "Reset all" (Settings): 4.2:1 → 5.3:1.
- "NOVICE" tag (Mail): 1.9:1 → 5.3:1.
- Quiz label: 13.6px → 16px.
- Bonus pay removed; inbox shows only the client fee.
- Admin: mean Technical Readiness Score per level.
- Client 7 email rewritten.
- "Back to website" note: link rewritten to `/` in the Vercel build.
- Piko's "alignment rulers" line now points at the canvas, not the toolbar.
- Tests updated for the label rename and the pay change.
- Removed: empty broken `EyeCon/` git link, `title.html` (unused prototype), `overview.backup.html` (old copy). Recoverable from git history.

### 2.8 Tests

- Syntax check: pass. Unit tests: 19 passed, 1 skipped.
- End-to-end: 66 passed, 5 skipped, 1 failing — canvas fills 83% of a 390×844 phone screen (85% expected). Phones are out of scope.
- Production build: succeeds.
- Runtime crawl of every page, app and level: no JavaScript errors, no missing files (icon-sprite warnings only occur when opening files directly from disk, not on Vercel).

### 2.9 Open decisions (game)

- Client 2 "Log in" button only needs 4.5:1, while the Contrast Guide says buttons need 7:1. Raise it to 7:1 or drop buttons from that row.
- Client 3 hierarchy task passes at the start (ticks off immediately).
- Hidden placement targets are generated from each element's starting (broken) position, so fully fixed pages lose a few placement points in the weighted score. Stars, approval and pay are not affected.
- No link to the Google Form survey after the post-test.
- Unused files kept: `figma-exports/email-screen.html`, `EyeCon_Manuscript.pdf` (old paper). Not used by the game or the build.

---

## 3. Paper audit

### 3.1 Checked and consistent

- Quiz items and answer key (Appendix C/D) match the game.
- Modules, 7 clients, tiers, scaffolding (guides removed from Level 4), 8px snapping, arrow keys, X/Y fields, grid overlay and opacity, before/after toggle, pan/zoom, reply and client response flow, Guidebook, Supabase logging fields, admin study data.
- Appendix G Typography rule 3: the game already says "Body text should be at least 16px; make headings clearly larger than the text below them."

### 3.2 Edited in the paper (as suggestions)

- Client 7: "23 tasks" → "10 tasks" (Table 5 and Scope of Levels); Table 6 problem list rewritten.
- Client 5: button text "stands out at 7:1 or more"; rule "headline, section title, and button text at least 7:1; tagline 4.5–7:1".
- Workspace Tools: old zones (15:1+ "too harsh") removed; Contrast Guide described.
- Algorithms: #000000 example no longer "too harsh"; typography rule now "exact size, maximum, or size order"; grading-engine sentence updated.
- Unit test 20 expected result: "Shows 21.0:1, Passes AA".
- Service Fees (Algorithms, Definition of Terms): fixed fee per client, no bonus.
- Hints: free first hint in the game, then 10 for the first in each level and 15 after.
- Data gathering, Ethics, Appendix A: anonymous account plus username form (no Google/email sign-in; "username" instead of email and name).
- System Settings: sound, music, reduced motion, pan button.
- Guidebook: opens from desktop or taskbar; Piko points it out at the end of day 1. Table 4 Level 2 lesson mentions the Contrast Guide.
- Minimum resolution: at least 1400×800 (1920×1080 recommended).
- Appendix G rule 3 note replaced with the game's text.

### 3.3 Still to edit by hand in the paper

- Table 6 task counts: Client 2 4 → 5; Client 3 3 → 4; Client 5 5 → 6; Client 6 6 → 4; Client 7 23 → 10.
- Unit test 20 scenario title "Contrast readout— too harsh" → "maximum contrast".
- Appendix G: remove leftover "[UPDATE NEEDED:" and "]" around rule 3.
- Survey: state how respondents get the Google Form link (not linked in the app).
- Appendix C item 14 ("too harsh … off-black"): the game no longer teaches "too harsh"; the paper says every item is taught in the game. Keep with a note, or reword.
- If the paper claims EyeCon's own interface follows the 8-point grid, see 2.6.
- All remaining [UPDATE NEEDED] and [VERIFY] placeholders (dates, numbers, results, citations).
