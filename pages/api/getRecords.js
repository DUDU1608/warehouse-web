import { google } from 'googleapis';

const SHEET_ID = '1KcVAXkufZsDc8_XZr-fw2qfS3MjPERos84WhHcDba2o';

const SELLER_TABS = [
  "Alok Enterprises",
  "Alok Enterprises M",
  "Alok Enterprises W"
];

async function getAuth() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground' // Or a dummy value
  );

  client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  return client;
}

export default async function handler(req, res) {
  try {
    const { mobile } = req.query;
    if (!mobile) {
      return res.status(400).json({ error: 'Missing mobile parameter' });
    }

    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    let allRecords = [];

    for (const tab of SELLER_TABS) {
      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'${tab}'!A:Z`,
      });
      const rows = resp.data.values || [];

      const filtered = rows.filter((row, idx) => idx !== 0 && row[2] === mobile);
      allRecords = allRecords.concat(filtered);
    }

    res.status(200).json({ records: allRecords });
  } catch (error) {
    console.error('Error in getRecords:', error);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
}

