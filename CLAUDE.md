# Emotions Wheel: notes for working on this project

An interactive emotions wheel, hosted on GitHub Pages from the `main` branch. It's a plain
static site with no build step and no dependencies. It is a personal practice tool for a
skill learned in therapy: naming a feeling, knowing what it is asking for, and completing
the whole thought.

## Content rules (most important)

- **Only state what came from the practice as taught.** The guidance on the page (what each
  emotion wants, "what's left?", radical acceptance for Anger, "if you're still stuck, write
  it down and bring it to your therapist", the four basic needs, the whole-thought sentence,
  "say it out loud, into a mirror if you can", "a life tool, not a crisis tool") is fixed.
  Don't add to it or reinterpret it.
- **Anything else is an idea, not guidance.** Extra suggestions live only behind the "Ideas"
  button (`ideas` in `js/data.js`). Never present them as advice elsewhere.
- **Functional, plain copy.** Short, direct labels ("Select a more specific emotion:",
  "Clear selection"). No chatty or conversational personality.
- **Never guilt or punish.** Encourage full participation, but leaving something blank must
  leave no trace (for example, no "___" in the whole thought).
- **No personal information** anywhere in the repository: no names, including the therapist's
  ("your therapist"), no session notes. The repository is public.
- Keep the one-line crisis note in the footer (988 in the US).

## Privacy

Nothing the user types is ever stored or sent. The only things kept, in `localStorage` on
the user's device, are:

| Key | What it remembers |
|---|---|
| `ew.dark` | Dark mode on/off |
| `ew.mono` | Olympian Mode on/off |
| `ew.checked` | When the opening check was last acknowledged (it's skipped for 15 minutes) |

Don't add other storage without asking. Update the footer and README if this list changes.

## Design decisions already settled

- **Theme:** light by default, never follows the device setting. Dark mode and Olympian Mode
  are toggles at the bottom.
- **Olympian Mode:** no color anywhere (including the opening check and the browser bar).
  Pure white page, black ink, an unshaded black-and-white wheel like the printed original.
  Wheel selections and buttons are white text on black; light grays only for accents in
  panels and blocks. With Dark mode too, it inverts (black page, black text on white).
  Defined with explicit CSS variables under `:root.mono`, not a grayscale filter.
- **Wheel text:** every word is the same size and weight, measured so the longest fits, and
  inner-aligned, flipping to stay upright as the wheel turns. Hovering, or sliding a finger,
  enlarges a word by the same amount for every word. Slices may grow outward over the next
  ring, never inward. Only a selected outer-ring word stays enlarged.
- **Rotation:**
  - A selection turns to the 3 o'clock position.
  - Mouse: drag anywhere to spin. Touch: drag only from the outer edge (the grip ring, with
    a little slack). Outside it, the corners of the wheel's box scroll the page. A flick
    coasts (inertia).
  - Once an outer-ring word is selected, the wheel resists and springs back.
  - On touch, no spinning while anything is selected, so the page can scroll.
  - **Only "Start over" turns the wheel back to its starting position.** "Clear selection"
    and deselecting leave it where it is.
- **Selecting:** tapping a selected slice steps back one ring, and tapping the center clears.
  Only one emotion is active at a time. On touch, press and slide to preview (a large readout
  in the emotion's color), and lift to select.
- **Panel flow (top to bottom):**
  1. The primary emotion card. "Select a more specific emotion:" until the word is in the
     outer ring. The whole thought: "I'm feeling X. / This is connected to [root noun]. /
     My body needs [want]." (Happy: "This emotion needs to be shared."), then the action box
     with the "I can't give this emotion what it wants right now" checkbox under it.
  2. The secondary-emotion question (green Yes, red No). It disappears once answered.
  3. The secondary emotion card, which has the same "I can't give…" option.
  4. "Your whole thought" with a Copy button. Shown only once it adds something.
  5. "What's left?" (shown while "I can't give…" is checked).
  6. Start over.
- **Above the wheel:** the Primary/Secondary switch plus "Remove secondary emotion" while a
  secondary emotion is active. Otherwise "Clear selection" once any word is selected, plus
  "+ Add a secondary emotion" after a "No". The search bar hides while any word is selected
  (to encourage "Select a more specific emotion"), so tapping between rings doesn't change
  the layout. On a phone scrolled past the top of the wheel, `beforeChange()` also keeps the
  wheel still on screen if something above it appears or disappears (iOS Safari has no
  scroll anchoring); scroll the page only in a microtask queued after it.
- **Search:** custom suggestions that match anywhere in a word, list words that start with
  the typed text first, and show where each word sits on the wheel. The list stays open while
  there's text, and × or Esc clears it.
- **Motion:** layout changes glide (about 0.28 seconds, see `beforeChange()` in `js/app.js`),
  and newly shown blocks fade in. Everything respects `prefers-reduced-motion`.
- **Opening check:** a pop-up with "Tired? Hungry? Thirsty? Triggered?" and a 5-second
  countdown before Continue unlocks. Tapping a condition plays a playful animation and shows a
  suggestion that fades out. This is not a selection, and nothing is recorded.
- **Icon:** the black-and-white wheel with subdivisions that multiply toward the edge, drawn
  by `icons/make-icon.js`.

## Files

```
index.html             page structure; the inline script applies remembered settings before the page draws
css/styles.css         all styling; colors are CSS variables, with :root.dark for dark mode
js/data.js             wheel words (in clockwise order), what each emotion wants, ifNot notes, ideas
js/wheel.js            wheel drawing, hit-testing by geometry, rotation, enlarged slices, touch/mouse handling
js/app.js              opening check, state, panel, search, whole thought, smooth transitions
icons/                 site icons; make-icon.js draws the SVGs, and the PNGs are rendered from them
manifest.webmanifest   "Add to Home Screen" name and icons
```

## Workflow

1. Work on a separate branch, never directly on `main`.
2. Test in a real browser (Playwright with a local `python3 -m http.server`), on both desktop
   and phone sizes, and check for console errors. Stop the server when done.
3. Push the branch and give the owner a preview link pinned to the exact commit:
   `https://raw.githack.com/petercdavidson/emotions-wheel/<commit-sha>/index.html`
4. Update `main` (a fast-forward push) **only after the owner approves**. GitHub Pages
   publishes it within a minute or two.

Small, descriptive commits are fine, with no pull requests needed. Keep test scripts and
screenshots out of the repository.
