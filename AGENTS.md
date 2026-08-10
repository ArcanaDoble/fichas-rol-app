# Repository Guidelines

- Run `npm test` and ensure tests pass before every commit.
- Use `npm install` to install dependencies if needed.
- This project uses React, Tailwind and Firebase. Keep code formatting consistent with existing files.
- After changes, update the README with notable updates.

# NOMA — Frontend Design Rules

## Product Identity

NOMA is a virtual tabletop and RPG game interface.

The in-game experience must feel like a dedicated game tool or videogame interface, not like:

- a SaaS dashboard
- an admin panel
- a startup landing page
- a generic React application
- a collection of shadcn cards

The tabletop, map, characters, dice and game state are the product. UI exists to support them.

## Core Design Principle

Design NOMA as a **dense, functional game workspace**.

Prefer:

- persistent spatial layouts
- sidebars
- toolbars
- contextual panels
- overlays
- compact controls
- strong information hierarchy
- game-like interaction patterns
- interfaces that remain usable for hours during a session

Avoid turning every feature into a page full of cards.

The central game/map area should normally dominate the screen. Secondary UI should live around it, overlay it when appropriate, or appear contextually.

## Never Generate Generic AI UI

Do not automatically use:

- generic dashboards
- rows of statistic cards
- excessive `rounded-xl` or `rounded-2xl`
- floating cards for every content group
- glassmorphism
- gradients without a strong reason
- purple/blue “AI product” palettes
- giant hero headings
- decorative blobs
- glowing borders
- excessive drop shadows
- pill buttons everywhere
- huge whitespace
- centered SaaS layouts
- generic bento grids
- default shadcn styling
- generic “modern app” aesthetics
- arbitrary icons added as decoration
- animations whose only purpose is to make the UI feel modern

Do not make something prettier merely by adding radius, gradients, shadows or blur.

## Visual References

When designing gameplay interfaces, take inspiration primarily from:

- virtual tabletops
- RPG videogame interfaces
- tactical games
- strategy games
- CRPGs
- game editors
- level editors
- professional creative tools

Useful reference sources include:

- Game UI Database
- Interface In Game
- existing high-quality videogame interfaces

Use Mobbin or conventional web-app references mainly for non-game areas such as authentication, account settings, campaign management and user management.

21st.dev and shadcn may be used as implementation references, but **their default visual language must not determine NOMA's design**.

## Before Writing UI Code

For every significant new screen or redesign, establish the visual direction before implementation.

Determine:

1. information hierarchy
2. screen composition
3. density
4. typography
5. spacing
6. color roles
7. borders and separators
8. radius rules
9. interaction states
10. what content deserves permanent screen space

Do not begin by creating React cards and deciding the layout afterward. Think from the complete screen inward.

## Layout

Prefer layouts based on functional regions, for example:

- central tabletop/map
- left character or party panel
- right encounter/context panel
- bottom action/tool area
- collapsible inspector
- floating contextual menus
- compact top toolbar

Do not automatically place content inside a centered `max-width` container.

Gameplay screens should make effective use of the available viewport. Desktop interfaces may be intentionally dense. Avoid wasting large regions of screen space purely for visual breathing room.

## Cards and Containers

A bordered rectangle is not automatically a card.

Before introducing a container, ask whether hierarchy could instead be communicated using:

- spacing
- alignment
- typography
- separators
- background contrast
- columns
- grouping
- indentation

Cards should have a functional reason. Avoid nested cards and card-within-card-within-card structures.

## Borders, Radius and Shadows

Use radius deliberately and consistently. Do not round every object.

Panels, menus, buttons, inputs and game elements do not all need the same geometry. Prefer subtle borders and contrast over large shadows. Shadows should communicate layering or elevation, not decoration.

## Typography

Typography must create hierarchy before decorative styling does. Use a small, controlled type scale.

Gameplay UI should generally prioritize:

- readability
- density
- scanning speed

Avoid oversized headings inside tool panels. Avoid automatically using Inter simply because it is common in web applications. Do not mix many font families.

## Color

Colors should have semantic roles, for example:

- health
- danger
- selection
- active turn
- movement
- attack
- resource
- disabled state
- interactive state

Do not introduce accent colors arbitrarily. Avoid excessive saturation across the entire interface. A neutral interface with carefully controlled game-state colors is preferable to a colorful dashboard.

## Interaction Design

Prefer direct manipulation when appropriate, for example:

- drag tokens
- select objects directly
- right-click/context menus
- hover inspection
- keyboard shortcuts
- compact toolbars
- contextual actions
- drag-and-drop
- selection states

Do not force the user through modal dialogs for actions that could happen directly on the tabletop. Use modals only when interruption is intentional.

## Game-State Visibility

Important game information should be visible without unnecessary navigation. Avoid hiding frequently needed information behind multiple clicks.

Prioritize:

- current character state
- resources
- actionable abilities
- selected token information
- encounter state
- relevant conditions
- current tools

Less frequently used configuration may live deeper in the interface.

## Icons

Icons must communicate functionality. Do not add icons merely because empty space exists.

Prefer a consistent icon family. Important or unusual actions should usually include text unless their icon is universally understood within the application.

## Animation

Animation must communicate:

- state change
- spatial movement
- selection
- success/failure
- opening/closing
- game feedback

Keep most UI transitions fast and restrained. Avoid decorative continuous motion.

## Components

Reusable components should encode NOMA's visual system.

Do not allow every feature to invent:

- new spacing
- new radii
- new shadows
- new colors
- new button styles
- new panel styles

Prefer shared primitives such as:

- `Panel`
- `Toolbar`
- `Inspector`
- `GameButton`
- `IconButton`
- `ContextMenu`
- `Tooltip`
- `ResourceBar`
- `CharacterRow`
- `InventorySlot`
- `StatusIndicator`
- `SectionHeader`
- `SplitPane`

Reuse visual rules, not necessarily generic SaaS components.

## React / CSS Implementation

When modifying existing UI:

1. inspect existing components and styles first
2. preserve established NOMA conventions when they are good
3. consolidate duplicated visual rules
4. avoid unnecessary component abstractions
5. avoid rewriting working UI solely to use a fashionable library
6. prefer CSS variables/design tokens for repeated values
7. maintain clear hover, active, selected, focused and disabled states
8. preserve accessibility and keyboard usability

Do not install a UI library merely to solve a small styling problem.

## Responsive Behaviour

NOMA is primarily a desktop game workspace unless a feature explicitly targets mobile.

Do not compromise the desktop VTT experience merely to force every gameplay screen into a conventional mobile layout.

For smaller screens:

- collapse secondary panels
- prioritize the tabletop
- use contextual drawers where appropriate
- preserve core game actions

## Reference Images

When screenshots, mockups or reference interfaces are provided, analyze:

- proportions
- density
- alignment
- typography
- panel structure
- spacing
- visual hierarchy
- control placement
- contrast
- interaction patterns

Reproduce the underlying visual language closely. Do not reinterpret a reference into a generic modern SaaS interface.

## Redesign Rule

When asked to “improve”, “modernize”, “clean up” or “make this prettier”, do not immediately add:

- more radius
- larger spacing
- gradients
- shadows
- animations
- cards

First determine what is actually wrong:

- hierarchy
- density
- alignment
- discoverability
- consistency
- readability
- interaction
- information architecture

Fix the actual problem.

## Self-Review Before Finishing

Before completing a frontend task, check:

- Does this look like an RPG/VTT tool rather than SaaS?
- Is the game content still the visual priority?
- Have unnecessary cards been introduced?
- Is screen space being used efficiently?
- Is the hierarchy obvious?
- Are controls where the player needs them?
- Are colors semantic?
- Is the design internally consistent?
- Could any decorative element be removed without losing meaning?
- Does this resemble generic AI-generated UI?

If the last answer is yes, revise the design before finishing.

## Final Principle

NOMA should look intentionally designed for playing tabletop RPGs.

Do not optimize for “modern web design”. Optimize for:

- playability
- clarity
- atmosphere
- density
- direct manipulation
- consistency
- strong identity
