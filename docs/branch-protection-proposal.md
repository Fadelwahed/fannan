# Branch protection for `main` (proposal only)

Nothing here is applied. GitHub stays unchanged until Fadel says yes. The `gh` commands are the text of that later step. Do not run them while writing, reviewing, or merging this note.

## Why

Checked on GitHub by Jabr on 22 October 2026.

`Fadelwahed/fannan` is public. `main` at `4ac681a` is "Merge pull request #27 from Fadelwahed/fannan/main-bot-only", so `main` uses merge commits. `README.md` on that commit says under Known limits: "No branch protection on main. The only-the-owner-merges rule is a team rule, not a GitHub setting." Write access can still push straight to `main`.

PR #26 head `508ad11` was flagged by ecc-tools.

`manifest` and `gitleaks` come from GitHub Actions (`.github/workflows/main-checks.yml`), proposed in a separate pull request that is not yet pushed because the box token lacks the GitHub workflow scope.

`release/references/security-and-install.md` records an older free-plan enforcement limit and says that text is historical: a branch API 403 does not prove the plan still blocks protection. This note does not re-check the account.

## Branch roles

Stated layout. Git history in this worktree was not read for this note (UNTESTED). These paths do exist in this worktree: `release/tests/`, `scripts/package-r3.py`, `scripts/test_package_r3.py`, `reviews/`, `test-results/`, `trust/MANIFEST.sha256`, `trust/PINNED.sha256`, `README.md`.

- `main` holds the installable bot: `release/` without tests and without some docs, plus `trust/MANIFEST.sha256`, `trust/PINNED.sha256`, and `README.md`.
- `workbench` holds everything else, including the paths above.
- `release/` syncs one way, `workbench` → `main`. Never merge `main` into `workbench`.

## Proposed settings for `main`

- Require a pull request before merging: yes. The non-null `required_pull_request_reviews` object is what turns that on.
- Required approving reviews: **0**. See the tradeoff below.
- Dismiss stale approvals: **n/a**. Send `dismiss_stale_reviews: false`. With a count of 0 there is no approval that can go stale, so the flag does not change who may merge.
- Required status checks, strict: `manifest` and `gitleaks`. The branch must be up to date with `main` before merge, and both checks must have passed on that head.
- Require conversation resolution: yes. An open review thread blocks the merge until it is resolved.
- Require linear history: **no**. `main` uses merge commits (`4ac681a`). Requiring linear history would reject that merge style.
- Block force pushes: yes (`allow_force_pushes: false`).
- Block deletions of `main`: yes (`allow_deletions: false`).
- Push allow-list (`restrictions`): `null`. This is a user-owned repo; a non-null user/team/app list is for organizations.
- Include administrators: **yes, recommended** (`enforce_admins: true`). Fadel must use a pull request too. He cannot push straight to `main`, force-push, or delete the branch while the rule stands. Editing or deleting the rule is a separate settings call; the rollback below is that call. That split was not tried here. UNTESTED.

### Why zero approvals

Fadel is the only human reviewer. Bots open pull requests as his account. GitHub will not let the pull request author approve that same pull request, so a required count of 1 or more would leave his own pull requests unmergeable.

A count of 0 means any identity with write access can merge once the checks are green and the other rules pass. That includes automation using his credentials and any later collaborator. It also includes a stolen write token. There is no second person in this rule.

### Status checks, and when they can be required

Order: merge the CI pull request, let `manifest` and `gitleaks` run once on `main`, then apply. The settings UI only lists checks GitHub has already seen. The API will store a context that has never reported; `main` then waits for a check that never arrives, and merges stop.

The JSON uses `contexts`, not a `checks` array. A `checks` entry can pin `app_id`. `contexts` accepts the name from any app that reports it. A different app posting the same context name would satisfy the rule.

## ecc-tools permission (separate)

Required checks here do not depend on ecc-tools at all. The ecc-tools Checks read-and-write permission only lets ecc-tools publish its own check, which is not proposed as required. Only Fadel can grant it. This proposal does not grant it.

## `workbench` (not in this step)

The same shape could later protect `workbench` with contexts `node-tests`, `package-tests`, and `anchored-verify`. Do not apply that now. Those names are not backed by a workflow file in this worktree (UNTESTED).

## Do not run without Fadel's yes

Save the body as `protection.json` in the working directory, then:

```bash
gh api -X PUT repos/Fadelwahed/fannan/branches/main/protection -H 'Accept: application/vnd.github+json' --input protection.json
```

```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["manifest", "gitleaks"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true,
  "required_linear_history": false
}
```

Still required before that PUT: Fadel's yes. Merge the CI pull request first, let `manifest` and `gitleaks` each run once on `main`, then apply.

## Verify

```bash
gh api repos/Fadelwahed/fannan/branches/main/protection -H 'Accept: application/vnd.github+json'
```

HTTP 404 means `main` has no protection. HTTP 200 is the live rule. The response wraps some flags (for example `enforce_admins.enabled`), repeats contexts under `checks`, and adds URLs. Compare fields. A byte match with `protection.json` will fail. Not run, because nothing may be applied without Fadel's yes.

## Roll back

```bash
gh api -X DELETE repos/Fadelwahed/fannan/branches/main/protection -H 'Accept: application/vnd.github+json'
```

Documented success is HTTP 204. Not run, because nothing may be applied without Fadel's yes. After deletion, `main` is back to the team rule alone.
