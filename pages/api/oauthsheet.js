import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import open from 'open';

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

// Scopes for read-only Sheets access
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

async function authorize() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]
  );

  // Check if token already exists
  if (fs.existsSync(TOKEN_PATH)) {
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8')));
    return oAuth2Client;
  }

  // Get new token
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline', scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  await open(authUrl);

  throw new Error('Please authorize this app using the URL above, then paste the code handling logic here.');
}

export default async function handler(req, res) {
  try {
    const auth = await authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    // Replace with your Sheet ID and range
    const SHEET_ID = '1KcVAXkufZsDc8_XZr-fw2qfS3MjPERos84WhHcDba2o';
    const range = 'A1:C3';

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range,
    });

    res.status(200).json({ rows: result.data.values });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
}

