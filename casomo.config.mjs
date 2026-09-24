// Every gate this repo configures, one key each: `personalData` for
// check-personal-data, `privateRefs` for check-private-refs.
const config = {
  personalData: {
    // Test members are invented, and a pension library's members need a date
    // of birth: every one under tests/ is a constructed case (a leap-day
    // birthday, a first-of-the-month placeholder), never a real person's.
    allow: [/^tests\//],
  },
  // This repo is public, so it is checked without asking `gh`.
  privateRefs: {visibility: 'public'},
};

export default config;
