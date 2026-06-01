# HenceFlow App — End-to-End Testing Report

**Prepared:** 2026-06-01  
**Scope:** Full static + code-path analysis of all source files  
**Coverage:** UI, functionality, data layer, security, performance, accessibility, code quality

---

## Executive Summary

This report documents findings from a comprehensive end-to-end review of the HenceFlow application. 35 distinct issues were identified spanning critical bugs, incomplete features, security vulnerabilities, UI/UX discrepancies, and code quality concerns.

**Total Issues:** 35  
**Critical/High:** 4  
**Medium:** 9  
**Low:** 22

---

## Section 1 — Critical & High Severity Bugs

### BUG-01 · Notification click fails for tasks outside active pod
**File:** `src/App.tsx:924-928`  
**Severity:** 🔴 High  

The notification bell click handler searches `tasks` (only the current pod's tasks), not `allTasks`. If a notification references a task in a different pod or project, clicking it silently fails — the task dialog never opens.

```ts
// Current (broken):
const task = tasks.find(t => t.id === taskId);

// Fix:
const task = allTasks.find(t => t.id === taskId);
// Then also navigate to the correct project/pod before opening the dialog.
```

---

### BUG-02 · "Urgent" priority missing from filter dropdown
**File:** `src/App.tsx:963-967`  
**Severity:** 🔴 High  

The task filter panel only lists `Low`, `Medium`, `High` — `Urgent` is completely absent. Users cannot filter for urgent tasks through the UI.

```tsx
// Missing option:
<option value="urgent">Urgent</option>
```

---

### SEC-01 · Gemini API key exposed in browser bundle
**File:** `vite.config.ts`  
**Severity:** 🔴 High  

`GEMINI_API_KEY` is injected into the browser via Vite's `define`. It is visible in the compiled JavaScript bundle and can be extracted by any user inspecting the page. All AI calls should be proxied through the Express server (`server.ts`), never made from the client.

---

### BUG-03 · `updateMilestone` always overwrites `due_date`
**File:** `src/services/api.ts:609`  
**Severity:** 🟠 Medium-High  

```ts
payload.due_date = updates.dueDate ?? null;
```

This line is unconditional — unlike every other field in the function, `due_date` is always included in the UPDATE payload. If `updateMilestone` is ever called without a `dueDate` parameter, it will null out any existing due date on the milestone. The correct pattern (matching all other fields in the file) is:

```ts
if (updates.dueDate !== undefined) payload.due_date = updates.dueDate ?? null;
```

---

## Section 2 — Incomplete / Stub Features

### FEAT-01 · Recurring tasks do not work
**File:** `src/services/api.ts:739`  
**Severity:** 🟠 Medium  

`createRecurringInstance` is a no-op stub that does nothing. The UI lets users set recurrence rules on tasks and even displays a `RefreshCw` icon on task cards, but no recurring instances are ever created when a task is closed. The feature is presented but entirely unimplemented.

**Action:** Either implement server-side recurrence logic or remove the `recurrenceRule` option from the UI entirely.

---

### FEAT-02 · Automation trigger `due_date_overdue` never fires
**File:** `src/App.tsx:550-557`  
**Severity:** 🟠 Medium  

`executeAutomations` only checks three trigger types: `status_changed`, `priority_changed`, and `assignee_changed`. The `due_date_overdue` trigger shown in `AutomationsDialog` has no execution path and will never trigger.

---

### FEAT-03 · Automation action `notify_watchers` never executes
**File:** `src/App.tsx:560-573`  
**Severity:** 🟠 Medium  

The `notify_watchers` action type appears as an option in the Automations dialog but is never handled in `executeAutomations`. The action silently does nothing when an automation rule with this action fires.

---

### FEAT-04 · Comment file attachments cannot be saved
**File:** `src/components/TaskComments.tsx:51-91`  
**Severity:** 🟡 Low  

The file attachment button is hardcoded to `disabled` with tooltip "File attachments are not yet supported." However, the `handleFileSelect` handler is still wired up and converts selected files to base64 in memory. The `handleSubmit` function calls `addComment(projectId, taskId, newComment.trim())` without passing the `attachments` array — the API doesn't accept it either. Any memory consumed by the base64 conversion is wasted.

**Action:** Remove the file input and `handleFileSelect` entirely until the feature is implemented.

---

### FEAT-05 · Company logo Upload/Remove buttons are non-functional
**File:** `src/components/CompanySettingsPage.tsx:227-230`  

```tsx
<Button variant="outline" size="sm">Upload</Button>
<Button variant="ghost" size="sm">Remove</Button>
```

Neither button has an `onClick` handler. They are purely visual with no functionality.

---

## Section 3 — Functional Bugs

### BUG-04 · Selection mode not cleared when navigating between pods
**File:** `src/App.tsx:281-288`  
**Severity:** 🟠 Medium  

When `activePod` changes, `selectedTaskIds` is reset to an empty Set, but `selectionModeActive` is never set to `false`. If a user activates bulk selection mode and then switches to a different pod, the new board opens with selection mode unexpectedly active.

**Fix:** Add `setSelectionModeActive(false)` to the `activePod` useEffect cleanup.

---

### BUG-05 · Swimlane drag triggers unnecessary DB writes for same-status moves
**File:** `src/components/TaskBoard.tsx:317`  
**Severity:** 🟡 Low  

```ts
if (destStatus !== srcStatus || destination.droppableId !== source.droppableId) {
  onStatusChange(draggableId, destStatus as TaskStatus);
}
```

In swimlane mode, droppable IDs are formatted as `"groupKey:stageId"`. Dragging a task from "Assignee A → todo" to "Assignee B → todo" has the same `destStatus`, but different `droppableId`s, so `onStatusChange` fires and writes the same status back to the database unnecessarily.

---

### BUG-06 · Analytics "My Tasks" count inflated with created-but-not-assigned tasks
**File:** `src/components/AnalyticsDashboard.tsx:98`  

```ts
const myTasks = tasks.filter(t => t.assigneeId === currentUserId || t.creatorId === currentUserId).length;
```

Tasks the current user created but assigned to others are counted as "My Tasks." This inflates the count and gives a misleading picture of the user's workload.

---

### BUG-07 · Analytics "Tasks by Assignee" chart attributes unassigned tasks to creator
**File:** `src/components/AnalyticsDashboard.tsx:131-135`  

```ts
const id = t.assigneeId || t.creatorId;
```

Unassigned tasks fall through to `creatorId`, mixing creator workload with assignee workload in the chart. The chart should only show tasks with an explicit assignee, and have a separate "Unassigned" bar.

---

### BUG-08 · Gantt view uses `createdAt` as task start date
**File:** `src/components/GanttView.tsx:33`  

```ts
const created = t.createdAt ? parseISO(t.createdAt) : addDays(due, -1);
```

Gantt bars span from when the task was _created_ to its _due date_. A task created 3 months ago but due tomorrow shows a 3-month bar, making the chart misleading. There is no dedicated "start date" field on tasks.

**Action:** Either add a `startDate` field to `Task`, or cap bar start at `max(createdAt, windowStart - PAD)` to avoid misleading long bars.

---

### BUG-09 · "Last saved" text in Company Settings never updates after first save
**File:** `src/components/CompanySettingsPage.tsx:182-188`  

`lastSavedText` is computed via `React.useMemo` which only recomputes when `lastSaved` changes. After saving, it shows "just now" and stays there indefinitely — it never updates to "1 minute ago" because there's no timer dependency.

**Fix:** Use `useState` + `useEffect` with a timer interval, or use a library like `date-fns/formatDistanceToNow` inside a component that re-renders periodically.

---

### BUG-10 · Activity log written for already-deleted tasks
**File:** `src/App.tsx:641-643`  

```ts
deleteTask(targetProjectId, taskId)
  .then(() => addActivityLog(taskId, targetProjectId, 'task_deleted').catch(() => {}))
```

After the task is deleted, `addActivityLog` is called with its ID. The foreign key constraint (or RLS policy) on `activity_logs.task_id` will reject this insert every time. The error is silently swallowed but it generates a failed DB request on every task deletion.

---

### BUG-11 · ProfileSetup modal uses hardcoded dark theme classes
**File:** `src/components/ProfileSetup.tsx:103, 121`  

```tsx
className="bg-zinc-800/60 border-zinc-700 text-white placeholder:text-zinc-600"
className="border border-zinc-700/50 bg-zinc-900/30"
```

These hardcoded dark colors do not use the theme-aware CSS variables (`bg-muted`, `border-border`, etc.). In light mode, the profile setup dialog will have a visually broken appearance with dark backgrounds.

---

## Section 4 — Security Issues

### SEC-02 · No role-based UI permission enforcement
**Files:** Throughout components  
**Severity:** 🟠 Medium  

The database enforces RLS, but the UI shows Edit/Delete buttons regardless of the current user's role. A "Viewer" sees the "Edit Project" button, the pod settings gear, and the "Delete company" danger zone. While the DB will reject unauthorized writes, it creates a confusing experience and leaks the existence of administrative features to non-admin users.

**Recommendation:** Pass the current user's role down from `company` data (compare `currentUserId` against `adminIds`, `memberIds`, `viewerIds`) and conditionally render action buttons.

---

### SEC-03 · Website URL accepts `https://` prefix from user input
**File:** `src/components/CompanySettingsPage.tsx:61-63, 99-100`  

The website field strips `https://` on load (line 62) and re-adds it on save (line 100). However, a user pasting `https://domain.com` directly into the field would result in the stored value `https://https://domain.com`. Add frontend validation or a `replace` call before saving.

---

### SEC-04 · No input length limits on most text fields
**Files:** Multiple dialogs  

Only the task description has a character limit (1000 chars). Task titles, tag values, pod names, project names, and milestone names have no visible length validation in the UI. While the DB likely has column limits, the app doesn't surface them and won't prevent long inputs from being submitted.

---

## Section 5 — UI/UX Discrepancies

### UX-01 · Search bar displays `⌘K` but actual shortcut is `/`
**File:** `src/App.tsx:940`  
**Severity:** 🟠 Medium  

```tsx
<kbd className="...">⌘K</kbd>
```

The keyboard hint shows `⌘K`, but the actual shortcut (in `useKeyboardShortcuts.ts:53-55`) is `/`. `⌘K` is not bound to anything. This misleads users and reduces keyboard shortcut discoverability.

---

### UX-02 · No toast/snackbar feedback for CRUD operations
**Files:** Global  
**Severity:** 🟠 Medium  

The app has no toast notification system. Successful operations — saving a task, creating a pod, removing a member, archiving a project — produce zero visible feedback. Users are left guessing whether their actions succeeded. Only comment errors show inline feedback.

**Recommendation:** Add a lightweight toast library (e.g., `sonner` which is already compatible with shadcn/ui) and fire toasts on every successful or failed mutation.

---

### UX-03 · `g+a` shortcut clears active project context
**File:** `src/App.tsx:401`  

```ts
onGoAnalytics: () => { setActiveProject(null); setActivePod(null); setActiveView('analytics'); },
```

Pressing `g→a` navigates to Analytics but also nulls out `activeProject`. Pressing `g→b` to return to Board view lands on the Dashboard instead of the user's previously active project.

---

### UX-04 · "Upgrade to Pro" uses browser `alert()`
**File:** `src/components/Sidebar.tsx:354`  

```ts
onClick={() => alert('Upgrade plans are coming soon! Contact support@henceflow.com for early access.')}
```

Native browser alerts are disruptive and inconsistent with the app's polished design. Should be replaced with a dialog, toast, or navigation to a pricing page.

---

### UX-05 · Version number `v2.4` hardcoded in sidebar
**File:** `src/components/Sidebar.tsx:97`  

The version badge is a hardcoded string and will not update when `package.json` version changes. Should be pulled from `import pkg from '../../package.json'` or an environment variable.

---

### UX-06 · Subtasks, dependencies, and custom fields unavailable when creating a new task
**File:** `src/components/TaskDialog.tsx` (create mode)  

The create-mode dialog only exposes title, status, priority, assignee, due date, and description. Subtasks, dependencies, time tracking, and custom fields only become accessible after the task is saved and reopened in edit mode. This forces a two-step workflow for any task that needs these fields on creation.

---

### UX-07 · "Save changes" always active — no dirty tracking in TaskDialog
**File:** `src/components/TaskDialog.tsx:303-309`  

The Save button is always enabled (provided the title is non-empty), even when the user hasn't changed anything. Every "Save" click sends a `updateTask` DB write regardless. Adding a dirty-state check would prevent unnecessary writes and make the button semantically correct.

---

### UX-08 · Gantt "Today" button auto-fits window instead of centering on today
**File:** `src/components/GanttView.tsx:88`  

```ts
onClick={() => setOffset(0)}
```

Resetting `offset` to 0 re-enables auto-fitting the visible window to all tasks. If tasks span many months, today's date may still appear far off-screen. A better behavior is to scroll the chart horizontally to center today's column.

---

### UX-09 · ProfileSetup opens for OAuth users with `name` but no `full_name`
**File:** `src/App.tsx:198-200`  

```ts
if (event === 'SIGNED_IN' && !session?.user?.user_metadata?.full_name) {
  setProfileSetupOpen(true);
}
```

`ensureUserProfile` (api.ts:196) checks both `full_name` and `name` metadata keys. But the modal check only tests `full_name`. GitHub OAuth users whose metadata has `name` but not `full_name` will see the profile setup modal every sign-in, even though their name is correctly set.

---

### UX-10 · Filter panel is hidden on mobile (toolbar not rendered for mobile below `md`)
**File:** `src/App.tsx:931, 944`  

```tsx
<div className="relative hidden md:block">  {/* search */}
```

The search input and filter popover are both `hidden md:block`, meaning mobile users have no access to search or filter functionality. There is no mobile equivalent (no full-screen search, no bottom sheet filters). This is a functional gap for users on small screens.

---

## Section 6 — Performance Issues

### PERF-01 · Real-time channels scale O(projects × tables)
**File:** `src/hooks/useServerEvents.ts`  
**Severity:** 🟠 Medium  

For each project × 7 scoped tables + 3 global tables, one Supabase Realtime channel is created per combination. A user with 10 projects creates 70 + 3 = **73 concurrent Supabase channels** per browser tab. Supabase free tier has a concurrent connection limit; this will hit it quickly as projects grow.

**Fix:** Use a single channel per table with a filter on an array of project IDs (Supabase supports `in` filters in realtime), or consolidate into fewer channels.

---

### PERF-02 · `loadAllTasks` runs on every projects array change
**File:** `src/App.tsx:290`  

```ts
React.useEffect(() => { loadAllTasks(); }, [projects]);
```

`loadAllTasks` fires on every reference change to the `projects` array, even when project IDs haven't changed. Since `setProjects` creates a new array reference on every data load, this can trigger redundant parallel fetches for all projects simultaneously.

---

## Section 7 — Code Quality & Technical Debt

### CODE-01 · Deprecated `FirestoreErrorInfo` type still exported
**File:** `src/types.ts:196-197`  

```ts
/** @deprecated Use DatabaseErrorInfo */
export type FirestoreErrorInfo = DatabaseErrorInfo;
```

This is a leftover artifact from a Firestore→Supabase migration. It should be removed.

---

### CODE-02 · Unused imports in `App.tsx`
**File:** `src/App.tsx:67`  

`Layers` and `Users` are imported from `lucide-react` but never used in `App.tsx`. These should be removed to keep the bundle clean.

---

### CODE-03 · `Sidebar` `user` prop typed as `any`
**File:** `src/components/Sidebar.tsx:36`  

```ts
user: any;
```

This bypasses TypeScript type checking for the user prop. Should be `user: AppUser | null`.

---

### CODE-04 · `subscribe*` wrappers in `api.ts` are misleadingly named
**File:** `src/services/api.ts:743-781`  

Functions like `subscribeToCompanies`, `subscribeToProjects` look like real-time subscription helpers but are actually one-shot fetch wrappers returning `() => {}`. They are not used anywhere in the current codebase, but their misleading names could confuse future maintainers into thinking real-time is handled there.

---

### CODE-05 · `stageColorDot` fragile string parsing
**File:** `src/components/TaskDialog.tsx:57-61`  

```ts
stage.color.split(' ').find(c => c.startsWith('bg-'))?.split('/')[0] ?? ''
```

This relies on the stage `color` property always being a space-separated Tailwind class string like `"bg-zinc-500/20 text-zinc-300"`. If a stage is created with any other format, the function silently returns `''`, causing invisible (empty-class) status dots throughout the UI.

---

### CODE-06 · `TaskComments` sets up its own `auth.onAuthStateChange` listener
**File:** `src/components/TaskComments.tsx:32-39`  

Each `TaskComments` instance registers its own Supabase auth state change listener. The current user ID is already available at the App level and passed down as props. This redundant listener adds overhead and could cause subtle subscription leaks if cleanup is missed.

---

## Summary Table

| ID | Issue | Severity | Category |
|----|-------|----------|----------|
| BUG-01 | Notification click fails for cross-pod tasks | 🔴 High | Functional Bug |
| BUG-02 | "Urgent" missing from priority filter | 🔴 High | Functional Bug |
| SEC-01 | Gemini API key exposed in browser bundle | 🔴 High | Security |
| BUG-03 | `updateMilestone` always overwrites `due_date` | 🟠 Med-High | Data Bug |
| FEAT-01 | Recurring tasks non-functional (stub) | 🟠 Medium | Incomplete Feature |
| FEAT-02 | `due_date_overdue` automation never fires | 🟠 Medium | Incomplete Feature |
| FEAT-03 | `notify_watchers` automation never executes | 🟠 Medium | Incomplete Feature |
| BUG-04 | Selection mode not cleared on pod navigation | 🟠 Medium | Functional Bug |
| SEC-02 | No role-based UI permission enforcement | 🟠 Medium | Security |
| UX-01 | Search bar shows `⌘K` but shortcut is `/` | 🟠 Medium | UI/UX |
| UX-02 | No toast/snackbar feedback for any operations | 🟠 Medium | UI/UX |
| PERF-01 | Realtime channels scale O(projects × tables) | 🟠 Medium | Performance |
| FEAT-04 | Comment attachments non-functional | 🟡 Low | Incomplete Feature |
| FEAT-05 | Company logo Upload/Remove not wired up | 🟡 Low | Incomplete Feature |
| BUG-05 | Swimlane drag triggers unnecessary DB writes | 🟡 Low | Functional Bug |
| BUG-06 | "My Tasks" count inflated with creator tasks | 🟡 Low | Analytics Bug |
| BUG-07 | Assignee chart conflates creator + assignee | 🟡 Low | Analytics Bug |
| BUG-08 | Gantt uses `createdAt` not planned start date | 🟡 Low | UX/Logic |
| BUG-09 | "Last saved" text never refreshes after save | 🟡 Low | UI Bug |
| BUG-10 | Activity log written for deleted tasks | 🟡 Low | Wasteful Call |
| BUG-11 | ProfileSetup has hardcoded dark theme styles | 🟡 Low | UI Bug |
| SEC-03 | Website URL double-protocol on paste | 🟡 Low | Security |
| SEC-04 | No input length limits on most text fields | 🟡 Low | Security |
| UX-03 | `g+a` shortcut clears active project context | 🟡 Low | UI/UX |
| UX-04 | "Upgrade to Pro" uses browser `alert()` | 🟡 Low | UI/UX |
| UX-05 | Version `v2.4` hardcoded in sidebar | 🟡 Low | UI/UX |
| UX-06 | Subtasks unavailable in new task creation flow | 🟡 Low | UI/UX |
| UX-07 | "Save changes" always enabled (no dirty tracking) | 🟡 Low | UI/UX |
| UX-08 | Gantt "Today" auto-fits instead of scrolling | 🟡 Low | UI/UX |
| UX-09 | ProfileSetup opens for GitHub users unnecessarily | 🟡 Low | UI/UX |
| UX-10 | Search and filters hidden on mobile | 🟡 Low | Accessibility |
| PERF-02 | `loadAllTasks` over-triggers on array reference changes | 🟡 Low | Performance |
| CODE-01 | Deprecated `FirestoreErrorInfo` type exported | 🟡 Low | Tech Debt |
| CODE-02 | Unused icon imports in `App.tsx` | 🟡 Low | Code Quality |
| CODE-03 | Sidebar `user` prop typed as `any` | 🟡 Low | Code Quality |

---

## Priority Fix Recommendations

### P0 — Fix Immediately

1. **BUG-01** — Change `tasks.find()` → `allTasks.find()` in notification click handler
2. **BUG-02** — Add `<option value="urgent">Urgent</option>` to priority filter
3. **SEC-01** — Remove `GEMINI_API_KEY` from Vite client; proxy AI calls through `server.ts`

### P1 — Fix in Next Sprint

4. **UX-02** — Integrate `sonner` or similar toast library; fire toasts on all mutations
5. **BUG-04** — Add `setSelectionModeActive(false)` to the `activePod` cleanup effect
6. **BUG-03** — Guard `due_date` write with `if (updates.dueDate !== undefined)` in `updateMilestone`
7. **UX-01** — Change keyboard shortcut hint from `⌘K` to `/` in the search bar
8. **SEC-02** — Derive current user role from `company.adminIds`/`viewerIds` and conditionally render actions
9. **BUG-11** — Replace hardcoded `zinc-*` classes in `ProfileSetup` with theme-aware tokens

### P2 — Planned Work

10. **FEAT-01** — Implement recurring task creation server-side or remove the UI option
11. **FEAT-02 / FEAT-03** — Implement `due_date_overdue` check (scheduled job) and `notify_watchers` action
12. **PERF-01** — Consolidate Supabase Realtime channels to reduce concurrent connection count
13. **BUG-07/BUG-06** — Fix analytics data attribution to correctly separate assignee vs creator stats
14. **UX-10** — Add mobile search (e.g., an expandable search icon) and accessible filter panel for small screens

---

*End of Report*
