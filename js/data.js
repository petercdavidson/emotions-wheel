// Emotions Wheel data.
// Order matters: everything is listed clockwise, starting at the top-left
// of the wheel (the "Hurt" slice of Anger), so the drawing matches the
// printed wheel. Each middle-ring word has two outer-ring words.

const WHEEL = [
  {
    name: "Anger",
    wants: "change",
    hue: 8,
    children: [
      ["Hurt", ["Embarrassed", "Devastated"]],
      ["Threatened", ["Insecure", "Jealous"]],
      ["Hateful", ["Resentful", "Violated"]],
      ["Mad", ["Furious", "Enraged"]],
      ["Aggressive", ["Provoked", "Hostile"]],
      ["Frustrated", ["Infuriated", "Irritated"]],
      ["Distant", ["Withdrawn", "Suspicious"]],
      ["Critical", ["Skeptical", "Sarcastic"]],
    ],
  },
  {
    name: "Disgust",
    wants: "space",
    hue: 80,
    children: [
      ["Disapproval", ["Judgmental", "Loathing"]],
      ["Disappointed", ["Repugnant", "Revolted"]],
      ["Awful", ["Revulsion", "Detestable"]],
      ["Avoidance", ["Aversion", "Hesitant"]],
    ],
  },
  {
    name: "Sad",
    wants: "comfort",
    hue: 212,
    children: [
      ["Guilty", ["Remorseful", "Ashamed"]],
      ["Abandoned", ["Ignored", "Victimized"]],
      ["Despair", ["Powerless", "Vulnerable"]],
      ["Depressed", ["Inferior", "Empty"]],
      ["Lonely", ["Abandoned", "Isolated"]],
      ["Bored", ["Apathetic", "Indifferent"]],
    ],
  },
  {
    name: "Happy",
    wants: "to be shared",
    hue: 44,
    children: [
      ["Optimistic", ["Inspired", "Open"]],
      ["Intimate", ["Playful", "Sensitive"]],
      ["Peaceful", ["Hopeful", "Loving"]],
      ["Powerful", ["Provocative", "Courageous"]],
      ["Accepted", ["Respected", "Fulfilled"]],
      ["Proud", ["Important", "Confident"]],
      ["Interested", ["Amused", "Inquisitive"]],
      ["Joyful", ["Ecstatic", "Liberated"]],
    ],
  },
  {
    name: "Surprise",
    wants: "time",
    hue: 160,
    children: [
      ["Excited", ["Energetic", "Eager"]],
      ["Amazed", ["Awe", "Astonished"]],
      ["Confused", ["Perplexed", "Disillusioned"]],
      ["Startled", ["Dismayed", "Shocked"]],
    ],
  },
  {
    name: "Fear",
    wants: "information",
    hue: 285,
    children: [
      ["Scared", ["Terrified", "Frightened"]],
      ["Anxious", ["Overwhelmed", "Worried"]],
      ["Insecure", ["Inadequate", "Inferior"]],
      ["Submissive", ["Worthless", "Insignificant"]],
      ["Rejected", ["Inadequate", "Alienated"]],
      ["Humiliated", ["Disrespected", "Ridiculed"]],
    ],
  },
];

// Guidance for each core emotion.
//   guidance / ifNot: taken directly from the practice as taught. Leave null when nothing was given.
//   ideas: general suggestions written for this site. These are interpretations, not guidance,
//          and are shown only behind an "Ideas" button with a label saying so.
const NEEDS = {
  Happy: {
    needsPrefix: "This emotion needs", // reads better than "My body needs to be shared"
    guidance: null,
    ifNot: null,
    ideas: [
      "Tell someone about it.",
      "Write it down.",
    ],
  },
  Sad: {
    guidance: null,
    ifNot: null,
    ideas: [
      "Reach out to someone who feels safe.",
      "Find a small way to comfort yourself.",
    ],
  },
  Disgust: {
    guidance: null,
    ifNot: null,
    ideas: [
      "Step away from what's bothering you, physically or mentally.",
      "Take a little distance before deciding what to do.",
    ],
  },
  Anger: {
    guidance: null,
    ifNot:
      "Radical acceptance: accept that change isn't an option, and validate that the anger wants change.",
    ideas: [
      "Name the specific thing that needs to change.",
      "Ask whether that change is within your control.",
    ],
  },
  Fear: {
    guidance: null,
    ifNot: "If you're still stuck, write it down and bring it to your therapist.",
    ideas: [
      "Write down what you need to know.",
      "Separate what you know from what you're imagining.",
    ],
  },
  Surprise: {
    guidance: null,
    ifNot: null,
    ideas: [
      "Give yourself a moment before reacting.",
      "Come back to it later, once things have settled.",
    ],
  },
};

// The basic needs to check before anything else.
const BASICS = ["Tired", "Hungry", "Thirsty", "Triggered"];
