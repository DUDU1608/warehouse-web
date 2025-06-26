console.log("SERVICE ACCOUNT EMAIL:", process.env.SHEETS_PROJECT_EMAIL)
console.log("PRIVATE KEY LOADED:", !!process.env.SHEETS_PRIVATE_KEY, "Length:", process.env.SHEETS_PRIVATE_KEY ? process.env.SHEETS_PRIVATE_KEY.length : 'undefined')
console.log("SHEET ID:", process.env.SHEET_ID)
import { google } from 'googleapis';

export default async function handler(req, res) {
  try {
    const auth = new google.auth.JWT(
      process.env.SHEETS_PROJECT_EMAIL,
      null,
      process.env.SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );
    const sheets = google.sheets({ version: 'v4', auth });
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'A1:C3', // change as needed
    });
    res.status(200).json({ rows: result.data.values });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.toString() });
  }
}

