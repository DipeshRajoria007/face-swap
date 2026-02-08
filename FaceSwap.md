# FaceSwap

# Product Requirements Document (PRD)

> FaceSwap — switch user identities instantly for debugging, RCA, and bug reproduction.
> 

---

## Background & Problem Statement

In the daily developer workflow, engineers frequently need to log in as different users to:

- Reproduce user-specific bugs
- Perform Root Cause Analysis (RCA)
- Verify fixes against real user states

The current process is slow and error-prone:

- Copy auth token from Django / backend tools
- Open DevTools → Application → Local Storage
- Manually update auth token keys
- Manually clear cookies
- Refresh and hope no stale session remains

This friction compounds during debugging sessions and increases context-switching cost.

---

## Goal

Build a lightweight, internal browser extension that allows developers to **instantly switch user identity** by:

- Injecting a copied auth token into `localStorage`
- Clearing relevant authentication cookies
- Reloading the page to rehydrate auth cleanly

All actions should be executable via a **single shortcut or click**.

---

## Target Users

- Frontend Engineers
- Backend Engineers
- QA Engineers
- On-call engineers performing RCA

> Scope: Internal developer use only
> 

---

## Non-Goals

- Public distribution on Chrome Web Store
- Managing authentication cookies set as HttpOnly for production users
- Acting as a full login or impersonation system
- Persisting or syncing tokens across devices

---

## Core Use Case (Primary Flow)

1. Developer copies an auth token from Django/admin/backend tooling
2. Developer presses the FaceSwap shortcut (default: Cmd + Shift + Y)
3. FaceSwap reads the **latest clipboard text**
4. Extension performs automatically:
    - Clears auth cookie: `access_token_ns_student_web`
    - Injects clipboard token into `localStorage`
    - Reloads the active tab
5. Application loads as the new user

---

## Functional Requirements

### 1. Clipboard-Based Token Ingestion

- FaceSwap must read the **latest copied text** from the system clipboard
- Clipboard read must be triggered **only via explicit user shortcut**
- Clipboard content is treated as the auth token
- No clipboard data is persisted by default

### 2. Token Injection

- Override existing value in localStorage
- Default key:
    - `auth-token`
- Token source:
    - Clipboard (primary)
- Support configurable key names per domain (future)

### 3. Cookie Clearing

- Clear authentication cookie:
    - `access_token_ns_student_web`
- Cookie removal must support:
    - Current domain
    - Parent (dot-prefixed) domain
- Path: `/`
- Cookie clearing enabled by default

### 4. Page Reload

- Automatically reload tab after token + cookie update
- Reload must occur only after all mutations succeed

### 5. Keyboard Shortcut

- Provide a global keyboard shortcut
- Default shortcut:
    - macOS: Cmd + Shift + Y
    - Windows/Linux: Ctrl + Shift + Y
- Shortcut must:
    - Read clipboard
    - Apply token
    - Reload page
- Shortcut should be user-remappable via browser settings

### 6. Domain Restriction

- Extension should only operate on allowlisted domains
- Example:
    - `localhost`
    - `.newtonschool.co`
- Block execution on non-allowed domains with silent no-op

---

## Non-Functional Requirements

### Performance

- Auth switch operation should complete in < 500ms (excluding reload)

### Security

- Tokens must not be sent to external services
- Tokens should not be persisted unless explicitly enabled
- Extension must clearly warn when operating on production domains

### Reliability

- Cookie deletion should attempt multiple domain variants
- Fail gracefully with clear error messaging

---

## UX Requirements

### UI Scope (v1)

- **No mandatory UI**
- FaceSwap is shortcut-first
- Popup UI is optional and secondary
- Primary interaction is via keyboard shortcut

### Feedback

- Toast or status message:
    - Success: "Identity swapped successfully"
    - Failure: "Failed to clear cookies" / "Invalid domain"

---

## Technical Architecture

### Components

1. **Manifest (MV3)**
    - Permissions: `cookies`, `storage`, `activeTab`, `scripting`, `clipboardRead`, `offscreen`, `windows`
    - Commands API for keyboard shortcuts
2. **Background Service Worker**
    - Listens for keyboard shortcut events
    - Validates domain allowlist
    - Reads clipboard via active-tab script (preferred) and falls back to offscreen document when needed
    - Clears authentication cookies
    - Injects localStorage mutation script
3. **Offscreen Document**
    - Fallback clipboard reader when active-tab read is blocked by focus/permissions
4. **Injected Script (MAIN world)**
    - Sets localStorage auth token
    - Triggers page reload

---

## Edge Cases & Considerations

- Token applied but cookie not cleared → show warning
- Multiple auth-related keys → future extensibility
- App reading auth from memory cache → reload mandatory

---

## Success Metrics

- Time to switch user reduced from ~20–40s to <5s
- Reduction in DevTools usage during auth switching

---

## Future Enhancements (Out of Scope for v1)

- Multiple token profiles
- Clipboard-based auto-detection
- One-key instant swap (no popup)
- Multi-key auth support (refresh tokens, roles)
- Audit log for identity switches

---

## Summary

**FaceSwap** is a focused internal developer tool that dramatically improves debugging velocity by eliminating repetitive and error-prone auth switching steps. By combining token injection, cookie clearing, and reload into a single action, it enables faster RCA and safer experimentation with user-specific states.
