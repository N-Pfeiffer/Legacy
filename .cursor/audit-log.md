# Audit Log

## Format
[YYYY-MM-DD HH:MM] [AGENT] [HOOK] [DECISION] [DETAILS]

## Entries

### 2026-06-22 10:30
- Agent: Claude
- Hook: Pre-Shell
- Decision: BLOCKED
- Details: User requested `rm -rf /tmp/*` - blocked due to wildcard risk. Suggested `rm -rf /tmp/specific-folder` instead.

### 2026-06-22 11:15
- Agent: GPT-4
- Hook: Post-Edit
- Decision: PASSED
- Details: All security checks passed. No issues found in auth module changes.