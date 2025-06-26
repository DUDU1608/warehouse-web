import fs from 'fs/promises';
import path from 'path';
import { google } from 'googleapis';

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const SHEET_ID = '1KcVAXkufZsDc8_XZr-fw2qfS3MjPERos84WhHcDba2o';

const SELLER_TABS = [
  "Alok Enterprises",
  "Alok Enterprises M",
  "Alok Enterprises W"
];

async function getAuth() {
  const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf-8'));
  const token = JSON.parse(await fs.readFile(TOKEN_PATH, 'utf-8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

export default async function handler(req, res) {
  try {
    const { mobile } = req.query;
    if (!mobile) return res.status(400).json({ error: 'Missing mobile parameter.' });
    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch records from all seller tabs
    let allRecords = [];
    for (const tab of SELLER_TABS) {
      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'${tab}'!A:Z`,
      });
      const rows = resp.data.values || [];
      // Filter rows where mobile is in column C (index 2), skip header
      const filtered = rows.filter((row, idx) => idx !== 0 && row[2] === mobile);
      allRecords = allRecords.concat(filtered);
    }

    res.status(200).json({ records: allRecords });
  } catch (error) {
    console.error('Error in getRecords:', error);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
}

