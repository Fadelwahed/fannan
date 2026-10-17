# Stitch design-system calls

Use the live MCP tool schema as authority if it differs. This is a reviewed call-shape reminder, not permission to create or change anything.

1. `upload_design_md`: pass base64 of the approved, lint-clean DESIGN.md directly to MCP. The shell uploader is disabled.
2. `get_project`: identify the returned screen's instance ID and `sourceScreen`.
3. `create_design_system_from_design_md`: pass `projectId`, `deviceType: "DESKTOP"`, and `selectedScreenInstance: {"id":"<instance-id>","sourceScreen":"projects/<id>/screens/<screen-id>"}`. This method populates theme tokens; do not also call `update_design_system` without a separate reason and approval.
4. `apply_design_system`: pass `projectId`, the `assetId` parsed from `list_design_systems`' `assets/<assetId>`, and `selectedScreenInstances` containing **only** `id` and `sourceScreen` for real screens. Exclude `DESIGN_SYSTEM_INSTANCE` entries. Do not include position or dimension fields.

Confirm each real tool result before advancing. Do not infer IDs or retry a failed mutation blindly.
