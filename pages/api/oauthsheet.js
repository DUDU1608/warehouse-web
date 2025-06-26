import { google } from 'googleapis';

const SHEET_ID = '1KcVAXkufZsDc8_XZr-fw2qfS3MjPERos84WhHcDba2o';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

async function authorize() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://oauth2.googleapis.com/token' // Redirect URI is unused during refresh
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

    // Define your target range here
    const range = 'A1:C3';

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range,
    });

    res.status(200).json({ rows: result.data.values });
  } catch (error) {
    console.error("OAuthSheet API error:", error);
    res.status(500).json({ error: 'Failed to fetch data from Google Sheets.' });
  }
}

