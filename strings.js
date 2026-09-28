// All interface text lives here, so another language can be added later.
// Where a key holds a list, the app shows one line at random and never
// the same one twice in a row.

const STRINGS = {
  appName: 'Excitement Compass',

  nav: {
    home: 'Home',
    river: 'River',
    lookBack: 'Look back',
    about: 'About',
  },

  home: {
    findPull: 'Find my pull',
    addRiver: 'Add to the river log',
    activeLabel: 'You are following',
    doneLetGo: 'Done, let go',
    idleLines: [
      'What feels most alive right now?',
      "You don't need the whole map. Just the next step.",
      'Small steps count. Follow the pull you can follow.',
      'Excitement is a direction, not a destination.',
      "Begin with what's in front of you.",
      'If nothing excites you, choose what feels lightest.',
      'Step back. See the whole film. Then choose the next frame.',
      'Every choice opens a different path. Which one is calling you?',
      'What would you do if you trusted the bigger picture?',
    ],
  },

  choose: {
    title: 'What could you do next?',
    findPull: 'Find my pull',
    comparePrompt: 'Which pulls you more?',
    aboutTheSame: 'About the same',
  },

  act: {
    onIt: "I'm on it",
    notPossible: 'Not possible right now',
    nextLines: [
      "That's fine. Here's the next strongest pull you can follow.",
      "Not now isn't never. Here's what you can do now.",
      'The path bends. Follow the next pull.',
      'Not every door opens today. This one does.',
    ],
  },

  release: {
    prompt: 'What happened?',
    skip: 'Skip',
    closingLines: [
      'Released.',
      'Done. Let it land wherever it lands.',
      "You showed up fully. The rest isn't yours to carry.",
      'Let it go. Notice what comes back.',
      "The outcome isn't the measure. The doing was.",
      'Open hands.',
      'One more fragment falls into place.',
      "You don't need to see the whole picture. You're part of it.",
    ],
  },

  river: {
    title: 'River',
    empty: 'Small coincidences are where the pieces start to connect. Note them here.',
    tags: {
      sign: 'sign',
      synchronicity: 'synchronicity',
      feeling: 'feeling',
      idea: 'idea',
    },
  },

  lookBack: {
    title: 'Look back',
    subtitle: 'Step back and see the whole film.',
    empty: "Your path will appear here as you walk it. Later, you'll see the whole film.",
  },

  about: {
    title: 'About',
    lines: [
      'Do what lights you up.',
      'Give it everything.',
      'Let go of how it turns out.',
    ],
    body: [
      "Excitement is information. The pull you feel toward one thing over another is your own inner compass. You don't need to know where it leads. You only need to follow the strongest pull you can act on right now, one step at a time.",
      "When you can't do the most exciting thing, do the next one you can. When something is done, let it go. What comes back, like a coincidence, a new idea or an open door, often shows you the next step.",
      "People across many traditions have pointed to this same simple practice: act fully, and don't cling to the results. This app is a small tool to help you remember it.",
      'Everything you write stays on this device. Nothing is sent anywhere.',
    ],
    creditBefore: 'A free gift from ',
    creditName: 'Fragments of Coherence',
    creditAfter: ', a publication about consciousness, meaning and the bigger picture.',
    creditUrl: 'https://fragmentsofcoherence.substack.com',
  },

  storage: {
    unavailable: "This browser isn't letting the app save. You can still use it, but nothing will be kept after you close it.",
  },
};
