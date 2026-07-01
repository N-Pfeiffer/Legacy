# Cursor Doctrine - Safety First

## Core Principles
1. **Never execute destructive commands without confirmation**
2. **Always verify file paths before deletion**
3. **Review all code before applying changes**
4. **Prefer safe defaults over convenience**

## Dangerous Patterns to Flag
- `rm -rf` with absolute paths
- `curl ... | sh` or `wget ... | bash`
- `git push --force` or `git push -f`
- Database drop commands
- Privilege escalation (`sudo`, `chmod 777`)
- Raw SQL without parameterization

## Review Checklist
Before completing any task:
- [ ] No destructive commands in shell executions
- [ ] All file operations use verified paths
- [ ] No hardcoded secrets or credentials
- [ ] Error handling is present
- [ ] Changes are reversible