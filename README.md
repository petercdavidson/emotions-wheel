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

- **Wheel**: tap any word to see where it sits (core › middle › outer), what its core emotion is asking for, and ideas for meeting that need. You can search for a word or browse the wheel as a list.
- **Daily check-in**: a step-by-step version of the daily practice:
  1. Body check (tired, hungry, thirsty, triggered?)
  2. Write your own words for the day *before* you look at the wheel
  3. Consult the wheel and see if your words match
  4. What is each emotion asking for? Can you give it that? If not, what's left?
  5. Complete the whole thought: *"I'm feeling ___, I know it's connected to ___, my body needs ___, and this is what I'm going to do about it."*
  6. Say it out loud (there's an optional read-aloud button)
- **Journal**: your past check-ins, a "bring to therapy" filter, a vocabulary tracker, and download/backup options.
- **Guide**: the ideas behind the practice, plus a button that downloads a repeating daily calendar reminder.

## Privacy

This is a static website with no server, no accounts, and no analytics. Everything you type is saved only in your own browser (`localStorage`) on your own device. The public site holds only the wheel and the guide text, never your entries.

Your entries stay in the browser and on the device where you wrote them. To move them somewhere else, use **Journal → Back up**, then **Restore** on the other device. Clearing your browser data deletes them, so back up now and then.

## How it's built

Plain HTML, CSS, and JavaScript, with no build step and no dependencies.

```
index.html        the page
css/styles.css    the look (supports light and dark mode)
js/data.js        the wheel words, and what each emotion wants  ← edit words here
js/wheel.js       draws the wheel
js/app.js         tabs, check-in, journal, reminders
```

To try it on your own computer, open `index.html` in a browser.

---

*This is a personal practice tool. It isn't meant for a crisis, and it doesn't replace professional care. If you're in crisis in the US, call or text 988.*
