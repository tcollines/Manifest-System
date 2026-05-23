const https = require('https');
const fs = require('fs');

https.get('https://www.cognitoforms.com/Phaneroo3/MENGATHERTransportedPrecapture', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    // Look for Cognito.load("...", { JSON })
    const regex = /Cognito\.load\(".*?",\s*({[\s\S]*?})\);/m;
    const match = data.match(regex);
    if (match && match[1]) {
      fs.writeFileSync('cognito_schema.json', match[1]);
      console.log('Schema extracted successfully!');
    } else {
      console.log('Could not find Cognito.load in the page source.');
    }
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
