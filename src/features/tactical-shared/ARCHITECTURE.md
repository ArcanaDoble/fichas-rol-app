# Tactical shared boundary

This directory is infrastructure, not a place for new game rules.

It contains the frozen tactical host used to preserve current behavior while Canvas and Board evolve independently. It may import application-wide utilities, but it must not import either `features/canvas` or `features/board`.

New Canvas Roguelite behavior belongs in `features/canvas`. New card-game behavior belongs in `features/board`.
