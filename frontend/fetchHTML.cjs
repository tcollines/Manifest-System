const https = require('https');
const fs = require('fs');

https.get('https://www.cognitoforms.com/Phaneroo3/MGPTransportedPrecapture', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('cognito_page.html', data);
    console.log('Saved to cognito_page.html');
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
