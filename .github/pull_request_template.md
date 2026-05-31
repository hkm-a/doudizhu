## Summary

- 

## Verification

- [ ] `python3 -m compileall -q server scripts/backend-smoke.py`
- [ ] `PYTHONPATH=server python3 scripts/backend-smoke.py`
- [ ] `cd client && npm run build`
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml`
- [ ] `git diff --check`

## Notes

Mention any skipped checks, environment limitations, license impact, or follow-up work.
