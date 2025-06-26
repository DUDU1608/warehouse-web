import { google } from 'googleapis';

const SHEET_ID = '1KcVAXkufZsDc8_XZr-fw2qfS3MjPERos84WhHcDba2o'; // Your Sheet ID

async function getAuth() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  oAuth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  return oAuth2Client;
}

export default async function handler(req, res) {
  try {
    const { mobile } = req.query;
    if (!mobile) {
      return res.status(400).json({ error: 'Missing mobile parameter.' });
    }

    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Step 1: Get the Name/tab from Contact details tab (assume columns: Mobile, Name, Address)
    const contactsResp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'Contact details'!A:C"
    });

    const contacts = contactsResp.data.values || [];
    const found = contacts.find((row, idx) =>
      idx !== 0 && (row[0] === mobile || row[0] === "+91" + mobile)
    );

    if (!found) {
      return res.status(404).json({ error: "Mobile number not found in contact details." });
    }

    const tabName = found[1]; // Name column as tab name

    // Step 2: Fetch that stockist's tab
    const dataResp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `'${tabName}'!A:Z`
    });

    const rows = dataResp.data.values || [];

    // Step 3: Compute summary
    const totalVehicles = rows.length - 1; // Minus header
    const totalQuantity = rows.slice(1).reduce((sum, row) => sum + (parseFloat(row[4]) || 0), 0);
    const totalCost = rows.slice(1).reduce((sum, row) => sum + (parseFloat(row[6]) || 0), 0);
    const totalCashLoan = rows.slice(1).reduce((sum, row) => sum + (parseFloat(row[10]) || 0), 0);
    const totalLoanMargin = rows.slice(1).reduce((sum, row) => sum + (parseFloat(row[12]) || 0), 0);

    res.status(200).json({
      tabName,
      summary: {
        totalVehicles,
        totalQuantity,
        totalCost,
        totalCashLoan,
        totalLoanMargin
      },
      records: rows.slice(1) // exclude header
    });
  } catch (error) {
    console.error('Error in getStockistRecords:', error);
    res.status(500).json({ error: 'Failed to fetch stockist records' });
  }
}

