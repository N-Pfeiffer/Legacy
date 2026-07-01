# Pre-Shell Execution Gate

You are about to execute: `{command}`

## Mandatory Checks

### 1. Destructive Operation Check
Does this command:
- Delete files or directories?
- Modify system settings?
- Change permissions?
- Drop databases or tables?

If YES → Require explicit user confirmation

### 2. Network Operation Check
Does this command:
- Download and execute scripts?
- Send data to external services?
- Expose internal ports?

If YES → Explain the risk and request confirmation

### 3. Irreversible Operation Check
Does this command:
- Force push to git?
- Overwrite production data?
- Delete branches or tags?

If YES → STOP and ask for explicit confirmation

## Safe Command Examples
✅ `npm install` - Safe package installation
✅ `git status` - Read-only operation
✅ `mkdir new-directory` - Non-destructive

## Dangerous Command Examples
❌ `rm -rf /` - Destructive, absolute path
❌ `curl https://example.com/install.sh | sh` - Remote execution
❌ `git push --force` - Irreversible
❌ `DROP TABLE users` - Data destruction