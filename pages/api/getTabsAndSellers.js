import fs from "fs/promises";
import path from "path";
import { google } from "googleapis";

const SHEET_ID = "1KcVAXkufZsDc8_XZr-fw2qfS3MjPERos84WhHcDba2o";
const CREDENTIALS_PATH = path.join(process.cwd(), "secret/credentials.json");
const TOKEN_PATH = path.join(process.cwd(), "secret/token.json");

// The three main tabs you want to scan for seller names
const SELLER_TABS = [
  "Alok Enterprises",
  "Alok Enterprises M",
  "Alok Enterprises W"
];

async function getAuth() {
  const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, "utf-8"));
  const token = JSON.parse(await fs.readFile(TOKEN_PATH, "utf-8"));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

export default async function handler(req, res) {
  try {
    const auth = await getAuth();
    const sheets = google.sheets({ version: "v4", auth });

    // 1. Fetch all tab names
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });
    const tabNames = meta.data.sheets.map(s => s.properties.title);

    // 2. Fetch sellers from column B (index 1) in each main seller tab
    let sellerSet = new Set();
    for (const tab of SELLER_TABS) {
      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'${tab}'!B2:B`,
      });
      const names = (resp.data.values || []).map(r => r[0]).filter(Boolean);
      names.forEach(name => sellerSet.add(name));
    }
    res.status(200).json({
      tabNames,
      sellers: Array.from(sellerSet),
    });
  } catch (error) {
    console.error("getTabsAndSellers error", error);
    res.status(500).json({ error: "Failed to fetch tab/seller names" });
  }
}

