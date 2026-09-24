// What this repo holds that the personal-data gate would otherwise read as a
// person's details.
export default {
  // Test members are invented, and a pension library's members need a date
  // of birth: every one under tests/ is a constructed case (a leap-day
  // birthday, a first-of-the-month placeholder), never a real person's.
  allow: [/^tests\//],
};
