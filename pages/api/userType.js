import fs from 'fs/promises';
import path from 'path';
import { google } from 'googleapis';

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

export default async function handler(req, res) {
  try {
    const { mobile } = req.query;
    if (!mobile) return res.status(400).json({ error: 'Missing mobile parameter.' });

    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Sellers/Buyers lookup
    const sellersResp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'Contact details'!A:C"
    });
    const sellers = sellersResp.data.values || [];
    const foundSeller = sellers.find((row, idx) => idx !== 0 && (row[0] === mobile || row[0] === "+91" + mobile));

    // Stockist lookup
    const stockistsResp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'Stockist Contact details'!A:C"
    });
    const stockists = stockistsResp.data.values || [];
    const foundStockist = stockists.find((row, idx) => idx !== 0 && (row[0] === mobile || row[0] === "+91" + mobile));

    const roles = [];
    let sellerName = null;
    let stockistTab = null;
    if (foundSeller) {
      roles.push("seller");
      sellerName = foundSeller[1];
    }
    if (foundStockist) {
      roles.push("stockist");
      stockistTab = foundStockist[1];
    }
    if (roles.length === 0) {
      return res.status(404).json({ error: "Mobile number not found." });
    }
    return res.status(200).json({ roles, sellerName, stockistTab });
  } catch (error) {
    res.status(500).json({ error: 'Failed to look up user type.' });
  }
}

