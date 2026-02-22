
import jwt from 'jsonwebtoken';

const token_part = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYXpvcmptenN3ZWN0eHZha3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MTEyNjgsImV4cCI6MjA4MjM4NzI2OH0'; // This is just a part, but let's try to decode what we have.
// Actually I'll use the anon key from earlier which was HS256? 
// No, the the user's token is ES256.

// Let's create a script that just logs what jwt.decode gives.
const token = process.argv[2];
if (token) {
    const decoded = jwt.decode(token);
    console.log(JSON.stringify(decoded, null, 2));
} else {
    console.log('No token provided');
}
