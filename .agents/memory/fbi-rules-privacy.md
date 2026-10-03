---
name: Private FBI rules menu
description: The expected privacy and navigation behavior for the FBI Discord rules command.
---

The FBI rules command has a public channel panel with a short sector overview, section selector, and image. Choosing an option sends only that section's explanation privately to the person who selected it; the public panel stays unchanged.

**Why:** The user first asked for per-user privacy, then clarified that the main panel should remain visible while the selected section is shown privately.

**How to apply:** Keep the command's Components V2 panel public; reply ephemerally to each select interaction with a text-only Components V2 container.