# Emotions Wheel

An interactive emotions wheel and daily check-in, for building a richer vocabulary for feelings and learning what each emotion is asking for.

**Every emotion wants something:**

| Emotion  | Wants           |
|----------|-----------------|
| Happy    | to be shared    |
| Sad      | comfort         |
| Disgust  | space           |
| Anger    | change          |
| Fear     | information     |
| Surprise | time            |

## Features

- A pop-up first: tired, hungry, thirsty, triggered? Meet these needs first, if possible. (A short countdown runs before you can continue.)
- Tap a word on the wheel and the wheel turns to bring it to the right-hand side. Drag the outer edge to spin it.
- If you tap an inner-ring word, the page suggests more specific words.
- Fill-in-the-blank fields build the whole thought ("I'm feeling ___. This is connected to ___. My body needs ___." followed by what you'll do about it). The first three fill in automatically from the word you tap, with a Copy button.
- "I can't give this emotion what it wants right now" opens a second set of fields for a secondary emotion.
- Olympian Mode (bottom of the page): monochrome, with an unshaded wheel like the original graphic.
- The "Ideas" lists are general suggestions written for this site, not therapeutic guidance. They sit behind an "Ideas" button.

## Privacy

Nothing you type is saved: no accounts, no analytics. What you type exists only while the page is open, and reloading the page clears it. The browser remembers only three small things on your own device: the Dark mode and Olympian Mode settings, and when you last clicked Continue on the opening check (so it can skip the check for 15 minutes).

## How it's built

Plain HTML, CSS, and JavaScript, with no build step and no dependencies.

```
index.html        the page
css/styles.css    the look (supports light and dark mode)
js/data.js        the wheel words, and what each emotion wants  ← edit words here
js/wheel.js       draws the wheel
js/app.js         the page's behavior
```

To try it on your own computer, open `index.html` in a browser.

---

*This is a personal practice tool. It isn't meant for a crisis, and it doesn't replace professional care. If you're in crisis in the US, call or text 988.*
