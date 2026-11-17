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
    hue: 285,
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
    hue: 160,
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

// What each core emotion is asking for, and ideas for giving it that.
const NEEDS = {
  Happy: {
    wants: "to be shared",
    ideas: [
      "Tell someone about it — a text, a call, a hug.",
      "Write it down so you can come back to it later.",
      "Pause and savor it for a moment before moving on.",
    ],
    ifNot:
      "If there's no one to share it with right now, share it with yourself: write it down, or say it out loud.",
  },
  Sad: {
    wants: "comfort",
    ideas: [
      "Reach out to someone who feels safe.",
      "Offer yourself comfort: a blanket, a warm drink, a kind word to yourself.",
      "Let yourself feel it without rushing it away.",
    ],
    ifNot:
      "If comfort isn't available from others right now, what's one small way you could comfort yourself?",
  },
  Disgust: {
    wants: "space",
    ideas: [
      "Step away — physically or mentally — from what's bothering you.",
      "Set or restate a boundary.",
      "Give yourself a little distance before deciding what to do.",
    ],
    ifNot:
      "If you can't get physical space, can you find a little mental space — a short walk, a few breaths, a break?",
  },
  Anger: {
    wants: "change",
    ideas: [
      "Name the specific thing that needs to change.",
      "Ask: is this change within my control?",
      "If it is, what's one step toward that change?",
    ],
    ifNot:
      "If change isn't an option, practice radical acceptance: accept that this can't change right now, and validate that the anger wants change. Both can be true.",
  },
  Fear: {
    wants: "information",
    ideas: [
      "What do you need to know? Go get the information.",
      "Make a plan based on what you find out.",
      "Separate what you know from what you're imagining.",
    ],
    ifNot:
      "If you're still stuck after gathering information and making a plan, write it down and bring it to your therapist.",
  },
  Surprise: {
    wants: "time",
    ideas: [
      "Give yourself time to take it in before reacting.",
      "It's okay to say “I need a minute.”",
      "Come back to it once things have settled.",
    ],
    ifNot:
      "If you can't take time right now, can you set aside a little time later to process it?",
  },
};

// The basic needs to check before anything else.
const BASICS = [
  { id: "tired", label: "Tired", need: "rest" },
  { id: "hungry", label: "Hungry", need: "food" },
  { id: "thirsty", label: "Thirsty", need: "water" },
  { id: "triggered", label: "Triggered", need: "safety and grounding" },
];
