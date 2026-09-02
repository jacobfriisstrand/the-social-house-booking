# Design canvas

Mockups of the booking platform, drawn to the rules in `../DESIGN.md`. The live, editable canvas is at https://claude.ai/code/artifact/71dbb84e-19ff-4446-94cd-e81cec439000 (private to the project owner; share from the page's menu, or export PNG/PDF from its toolbar).

## Files

- `build.mjs` generates the artboards. Run `node build.mjs` from this directory; it writes the three `.dc.html` files and `canvas.json`. Edit the generator, not the generated files.
- `Main.dc.html` is Hjem. `Bookinger.dc.html` is the admin invoicing view. `Statistik.dc.html` is the monthly economy overview.
- `canvas.json` lays the artboards out on the canvas.

The logo the artboards reference is `public/logo.svg`.

## Updating the live canvas

Ask Claude Code (with the `design` skill) to rebuild and republish to the URL above from these files. The published page is a snapshot; changes saved in the browser editor are not written back here, so treat this directory as the source and re-export after editing in the browser if you want to keep those edits.
