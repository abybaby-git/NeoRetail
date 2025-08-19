const bcrypt = require('bcrypt');

// Replace this with the string you want to hash
const plainTextPassword = 'staff';

const run = async () => {
  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(plainTextPassword, saltRounds);
    console.log(`Plain: ${plainTextPassword}`);
    console.log(`Hash: ${hash}`);
  } catch (err) {
    console.error('Error hashing password:', err);
  }
};

run();
