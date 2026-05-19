# Security Specification - NexFlow

## Data Invariants
1. A **User** profile can only be created/updated by the user themselves (`uid` must match `request.auth.uid`).
2. A **Project** must have an `ownerId` that matches the creator's `uid`.
3. Only **Project members** or the **Owner** can read project details and its tasks.
4. **Tasks** must belong to a valid `projectId`.
5. Only members of a project can create, update, or delete tasks within that project.
6. Identity fields like `creatorId`, `ownerId`, and `createdAt` are immutable after creation.
7. Timestamps (`createdAt`, `updatedAt`) must be strictly validated against `request.time`.

## The "Dirty Dozen" Payloads (Red Team Test Cases)
1. **Identity Theft (User)**: Attempt to create a user profile with a different UID than the authenticated user.
2. **Project Hijack**: Attempt to change the `ownerId` of an existing project.
3. **Ghost Task**: Attempt to create a task in a project the user is not a member of.
4. **Member Escalation**: A non-owner member trying to add someone else to the `members` array.
5. **Orphan Task**: Creating a task with a non-existent `projectId`.
6. **Time Travel**: Providing a manual `createdAt` timestamp in the past.
7. **Cross-Project Pollination**: Updating a task to move it to a `projectId` the user doesn't have access to.
8. **Malicious ID**: Using a very long string (>1KB) as a document ID for a task.
9. **Field Injection**: Adding `isAdmin: true` to a user profile payload.
10. **Status Shortcut**: A non-assignee trying to move a task from `backlog` to `done`.
11. **PII Leak**: An authenticated user trying to read another user's private profile via blanket `get`.
12. **Blanket Query**: Requesting all tasks across all projects without a project-specific filter.

## Test Runner Plan
We will use standard Firestore Security Rules logic to prevent these.
