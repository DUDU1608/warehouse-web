const { google } = require('googleapis');

const getAuth = async () => {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground' // You can keep localhost or a dummy URI here since refresh_token is already provided
  );

  client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  return client;
};

module.exports = getAuth;

