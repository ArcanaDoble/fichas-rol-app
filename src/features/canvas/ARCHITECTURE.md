# Canvas boundary

The Canvas is the home of the Roguelite runtime and its future combat rules.

## Rules

- Canvas production modules must never import `features/board`.
- Board production modules must never import `features/canvas`.
- `features/tactical-shared` contains the frozen legacy tactical host and rule-neutral infrastructure only.
- New initiative, action dice, combat, class resources, encounter state and run state belong under `features/canvas`.
- Do not extend `legacyCombatRules` for Roguelite behavior. Replace the Canvas adapter incrementally while Board keeps the legacy controller.
- Firebase data for Canvas and Board must continue using distinct collections.

Compatibility entry points in this folder re-export frozen tactical infrastructure so existing imports keep working while the Canvas runtime is replaced in small, testable slices.
