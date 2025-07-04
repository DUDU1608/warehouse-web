import fs from 'fs/promises';
import path from 'path';
import { google } from 'googleapis';

// Use your existing getAuth logic
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const SHEET_ID = '1KcVAXkufZsDc8_XZr-fw2qfS3MjPERos84WhHcDba2o';

async function getAuth() {
  const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf-8'));
  const token = JSON.parse(await fs.readFile(TOKEN_PATH, 'utf-8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

const SELLER_TABS = [
  "Alok Enterprises",
  "Alok Enterprises M",
  "Alok Enterprises W"
];

export default async function handler(req, res) {
  try {
    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Fetch all tab names
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
      fields: 'sheets.properties'
    });
    const tabNames = spreadsheet.data.sheets.map(sheet => sheet.properties.title);

    // 2. Fetch all sellers from B column of seller tabs
    let sellers = [];
    for (const tab of SELLER_TABS) {
      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'${tab}'!B2:B`, // B2:B to skip header
      });
      if (resp.data.values) {
        sellers = sellers.concat(resp.data.values.flat().filter(Boolean));
      }
    }
    // Get unique seller names
    const uniqueSellers = [...new Set(sellers)];

    res.status(200).json({ tabs: tabNames, sellers: uniqueSellers });
  } catch (error) {
    console.error('Error in listTabsAndSellers:', error);
    res.status(500).json({ error: 'Failed to fetch tab/seller names' });
  }
}

