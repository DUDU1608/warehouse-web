import { google } from 'googleapis';

// Scopes for read-only Sheets access
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

async function authorize() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground' // or your chosen redirect URI
  );

  oAuth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return oAuth2Client;
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
    console.error("OAuth error:", e);
    res.status(500).json({ error: e.toString() });
  }
}

