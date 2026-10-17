---
name: a11y-wcag-audit
description: Audit a design prototype against WCAG 2.2 AA with automated and manual evidence for the engineer and QA gate.
---

Read the current project brief, settings, rules, languages and screen inventory. Verify the pinned manifest at session start; before saving results run `"$FANNAN_RELEASE/tools/readonly-precheck.sh" "/workspace/design-output/<project>/" "<project>"`. See [security and install](../../references/security-and-install.md). WCAG 2.2 AA is the minimum even if a project rule says less. Desktop stays first until its approval; a desktop audit does not approve mobile.

Run available axe/Lighthouse and accessibility-tree checks on the rendered mock, then manually test keyboard traversal, focus visible and not obscured, focus order, target size, dragging alternatives, redundant entry, consistent help, errors, reduced motion/no-JS, page language and RTL/long-copy reflow. Record foreground/background contrast pairs, heading outline with one H1, standalone link/button names and intent for every image's alt text. For each issue record criterion, screen/state, element, evidence, severity, fix owner and retest result. Pass only with zero unresolved AA failures and complete manual evidence; unavailable checks are **untested** and block the Step 9 handoff. Give the project's engineer and QA gate actionable findings; do not edit source.

## Gotchas

- Automated zero violations does not cover focus behavior, language quality, meaningful labels or text clipping.
- Color must never be the only signal for a state; record a second cue.
