# HenceFlow App — End-to-End Testing Report

**Prepared:** 2026-06-01 (refreshed pass)
**Branch:** `claude/e2e-app-testing-fixes-Hrvwn`
**Scope:** Full static + code-path analysis of all source files — UI, functionality, data layer, security, performance, accessibility, code quality.
**Method:** Type-check (`tsc --noEmit`), production build, and a fan-out code audit across `App.tsx`, all components, the data layer (`api.ts`), hooks, and the Supabase RLS migrations.

---

## Executive Summary

This is a **refreshed** audit. The app has been through several prior QA passes, and the
majority of issues from the original 35-item report (notification cross-pod lookup, the
missing "Urgent" filter option, the `⌘K` mislabel, the `due_date` overwrite, selection-mode
reset, toast feedback via `sonner`, dynamic version string, removed `alert()` calls, removed
`FirestoreErrorInfo`, etc.) **are already resolved in the current code** and were verified as
such during this pass.

This report documents the **genuinely-present** issues found in the current code, separates
them into **Fixed in this pass** and **Documented (deferred)**, and explains the rationale for
deferrals (changes requiring a DB schema column or a product decision).

**Build status:** ✅ `npm run lint` clean · ✅ `npm run build` succeeds.

---

## Section 1 — Issues Fixed In This Pass

### FIX-01 · Analytics charts unreadable in light mode  🟠 Medium  (theme)
**File:** `src/components/AnalyticsDashboard.tsx`
The tooltip style, axis ticks, cartesian-grid stroke, and legend color were hardcoded dark
`oklch(...)` literals. In light mode the tooltip rendered as a dark box and axis labels were
near-invisible.
**Fix:** Replaced the literals with theme CSS variables (`var(--popover)`, `var(--border)`,
`var(--muted-foreground)`, `var(--popover-foreground)`) via shared `AXIS_TICK` / `GRID_STROKE`
constants, so the charts adapt to both themes.

### FIX-02 · Automation `assignee_changed` trigger could never match  🟠 Medium  (functional)
**File:** `src/components/AutomationsDialog.tsx`
The `assignee_changed` trigger rendered a free-text `Input`, but `executeAutomations`
(`App.tsx`) compares the stored value against a user **UID**. A human-typed value never matched,
so assignee-based automations silently never fired.
**Fix:** Render a user `<select>` (mirroring the `set_assignee` action), so the stored trigger
value is a real UID.

### FIX-03 · Automation rule summary displayed raw UUIDs / stage IDs  🟠 Medium  (UI)
**File:** `src/components/AutomationsDialog.tsx`
The saved-rule list printed `rule.triggerValue` / `rule.actionValue` directly, which are stage
IDs and user UIDs — e.g. *"When Status changed to `a1b2c3-…` → Assign to `f9e8…`"*.
**Fix:** Added `resolveValueLabel()` to map stage IDs → stage labels and UIDs → display
names/emails when rendering the rule.

### FIX-04 · `createTask` dropped `sprintId` and `recurrenceParentId`  🟠 Medium  (data)
**File:** `src/services/api.ts`
`createTask` never inserted `sprint_id` or `recurrence_parent_id` (both real columns), so a task
created directly into a sprint, or a recurring child instance created via this path, lost the
linkage until a later update.
**Fix:** Added `sprint_id` and `recurrence_parent_id` to the insert payload.

### FIX-05 · Project `stages` never mapped or persisted  🟠 Medium  (data)
**File:** `src/services/api.ts`
`mapProject` omitted the `stages` field, and `createProject` / `updateProject` never wrote it,
so a project's custom stage array (`projects.stages` column, used by Analytics'
`getClosedStageId`) could not round-trip — Analytics always fell back to default stages.
**Fix:** Map `stages` in `mapProject`; persist it in `createProject` (insert) and `updateProject`
(guarded with `if (updates.stages !== undefined)`).

### FIX-06 · "Clear" could not remove an existing emoji avatar  🟡 Low  (functional)
**File:** `src/components/ProfileSetup.tsx`
When the user clicked "Clear" (`selectedEmoji = null`), the derived `photoURL` fell back to the
existing emoji avatar, so saving re-persisted the old emoji — Clear did nothing.
**Fix:** Reworked the fallback so a cleared emoji saves `null`, while still preserving a
non-emoji (OAuth) photo URL the dialog doesn't manage.

### FIX-07 · "Select all" checkbox never showed an indeterminate state  🟡 Low  (UI)
**Files:** `src/components/InviteDialog.tsx`, `components/ui/checkbox.tsx`
The invite list passed a boolean `checked` plus a manual `data-state` to the Base UI `Checkbox`;
Base UI ignores `data-state` and uses a separate boolean `indeterminate` prop, so partial
selection rendered as fully unchecked.
**Fix:** Pass `indeterminate` correctly from `InviteDialog`, and enhance the shared `Checkbox`
to fill the box and render a `Minus` (dash) icon in the indeterminate state.

### FIX-08 · CalendarView low-priority pill hardcoded dark colors  🟡 Low  (theme)
**File:** `src/components/CalendarView.tsx`
The `low` priority color used `bg-zinc-500/60 text-zinc-200`, low-contrast in light mode.
**Fix:** Switched to theme tokens (`bg-muted-foreground/40 text-foreground`).

### FIX-09 · Unauthenticated intake submissions had no size limits  🟠 Medium  (security)
**File:** `src/services/api.ts`
`submitIntakeForm` is a public, unauthenticated insert path (RLS `WITH CHECK (true)`). It applied
no length caps, allowing arbitrarily large payloads — flagged by `security_spec.md`.
**Fix:** Added defensive caps (per-field 5000 chars, key 200, name 200, email 254) before insert.

### FIX-10 · Missing input length limits on auth fields  🟡 Low  (security)
**File:** `src/components/Auth.tsx`
**Fix:** Added `maxLength` to email (254), password, and confirm-password (128). Also added
`maxLength={80}` to the automation rule-name input.

### FIX-11 · `users` profile table readable by every authenticated user  🟠 Medium  (security / PII)
**File:** `supabase/migrations/009_scope_user_visibility.sql` (new)
Migration 001's policy `"Authenticated users can view all profiles"` used
`USING (auth.role() = 'authenticated')`, letting any logged-in user read every other user's
email/profile — a direct violation of `security_spec.md` invariant #11 ("PII Leak").
**Fix:** New migration drops that policy and replaces it with one scoping profile visibility to
the requester's own row plus users who share a company (via `companies.member_ids`).
**Note:** Migrations are applied manually (per `CLAUDE.md`); this file must be run against the
Supabase project to take effect.

---

## Section 2 — Documented / Deferred (require a schema change or product decision)

These are real but were intentionally **not** auto-fixed because they need a new DB column,
a server-side job, or a product/UX decision. They are recorded here for follow-up.

| ID | Issue | File | Why deferred |
|----|-------|------|--------------|
| DEF-01 | Hardcoded `'closed'` stage id in `CalendarView`, `MyWorkView`, `TaskBoard`, `SprintDialog`, `RoadmapView`, `TaskDialog` (overdue/strikethrough/SLA). Works for default-stage pods but breaks pods whose final custom stage isn't literally `closed`. `AnalyticsDashboard` already resolves it via `getClosedStageId`. | multiple | Needs threading the resolved closed-stage id through several components; broad change with regression risk — should land as one focused refactor. |
| DEF-02 | "Velocity" / "This week" charts and `daysInStage` SLA use `updatedAt` as a completion / stage-entry proxy. Any edit re-buckets a closed task and resets time-in-stage. | `Dashboard.tsx`, `TaskDialog.tsx`, `TaskBoard.tsx` | Requires a real `completedAt` / `statusChangedAt` column + migration. |
| DEF-03 | `createRecurringInstance` is a no-op stub; closing a recurring task spawns no next instance. | `api.ts` | Needs a server-side trigger/edge function or a documented client implementation — a feature, not a bug fix. |
| DEF-04 | Gantt bars start at `max(createdAt, due − 7d)`, which can misrepresent real durations. | `GanttView.tsx` | Needs a real `startDate` field (product decision) to be meaningful. |
| DEF-05 | `subscribeTo*` helpers in `api.ts` are one-shot fetches returning `() => {}` despite "subscribe" names (real-time is handled by `useServerEvents`). | `api.ts` | Rename touches call sites; low impact, cosmetic/clarity. |
| DEF-06 | Realtime channels scale O(projects × tables) in `useServerEvents`. | `useServerEvents.ts` | Performance refactor (consolidate channels / `in` filter); needs careful testing against Supabase. |
| DEF-07 | Member-role invitees get company membership but no project-level access (project RLS is `auth.uid() = ANY(members)`). | `App.tsx` / `InviteDialog.tsx` | Intended scope is a product decision (company vs. project membership). |
| DEF-08 | `CompanySettingsPage` auto-save paths (role change/remove/invite) send persisted detail values, not in-progress edits. | `CompanySettingsPage.tsx` | Needs UX decision on whether member actions should also commit unsaved detail edits. |

---

## Section 3 — Verified NOT Bugs (checked this pass)

- Notification click resolves from `allTasks` (spans all projects) before opening the dialog — correct.
- The priority filter includes `Urgent`; the search hint shows `/`, not `⌘K`.
- All three automation **trigger** types and all three **action** types offered by the dialog are
  handled in `executeAutomations`.
- `tasks` / `allTasks` optimistic updates + rollbacks stay in sync across create, edit, delete,
  duplicate, status/inline/swimlane edits, and all four bulk operations.
- Drag-and-drop early-returns on identical droppable+index and only writes status on a real
  status change (no redundant same-status writes).
- `updateTask` / `bulkUpdateTasks` / `updateMilestone` / `updateSprint` / `updateGoal` correctly
  guard nullable fields with `!== undefined` / `in` checks.
- CSV export neutralizes formula injection.
- No `dangerouslySetInnerHTML` anywhere; `GEMINI_API_KEY` is not injected into the client bundle
  (only a dynamic `__APP_VERSION__` from `package.json`).
- The sidebar version is dynamic (`v{__APP_VERSION__}`); OAuth provider buttons are intentionally
  disabled with tooltips (not dead controls).

---

## Verification

```
npm run lint    # tsc --noEmit — clean
npm run build   # vite build — succeeds; chart variant CSS confirmed generated in dist
```

*End of Report*
</content>
</invoke>
