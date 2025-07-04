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
    console.log("Request for mobile:", mobile);

    if (!mobile) {
      console.log("No mobile param");
      return res.status(400).json({ error: 'Missing mobile parameter.' });
    }

    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Step 1: Get the Name/tab from Contact details tab
    console.log("Fetching contacts...");
    const contactsResp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'Contact details'!A:C"
    });
    const contacts = contactsResp.data.values || [];
    console.log("Contacts loaded:", contacts.length);

    // Search for this mobile (with or without +91)
    const found = contacts.find((row, idx) =>
      idx !== 0 && (row[0] === mobile || row[0] === "+91" + mobile)
    );
    console.log("Contact found:", found);

    if (!found) {
      console.log("Mobile not found in contacts");
      return res.status(404).json({ error: "Mobile number not found in contact details." });
    }

    const tabName = found[1];
    if (!tabName) {
      console.log("No tabName for contact", found);
      return res.status(404).json({ error: "No tab/sheet name for this contact." });
    }
    console.log("Tab name for user:", tabName);

    // Step 2: Fetch that stockist's tab
    let dataResp, rows;
    try {
      dataResp = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'${tabName}'!A:Z`
      });
      rows = dataResp.data.values || [];
      console.log(`Fetched ${rows.length} rows from tab ${tabName}`);
    } catch (tabErr) {
      console.error(`Error fetching tab '${tabName}':`, tabErr.message);
      return res.status(500).json({ error: "Stockist tab missing or error loading data" });
    }

    // Step 3: Compute summary (defensively)
    let summary = {};
    try {
      summary = {
        totalVehicles: rows.length - 1,
        totalQuantity: rows.slice(1).reduce((sum, row) => sum + (parseFloat(row[4]) || 0), 0),
        totalCost: rows.slice(1).reduce((sum, row) => sum + (parseFloat(row[6]) || 0), 0),
        totalCashLoan: rows.slice(1).reduce((sum, row) => sum + (parseFloat(row[10]) || 0), 0),
        totalLoanMargin: rows.slice(1).reduce((sum, row) => sum + (parseFloat(row[12]) || 0), 0)
      };
    } catch (calcErr) {
      console.error("Summary calculation failed:", calcErr);
      summary = {};
    }

    res.status(200).json({
      tabName,
      summary,
      records: rows.slice(1)
    });
  } catch (error) {
    console.error('Error in getStockistRecords:', error);
    res.status(500).json({ error: 'Failed to fetch stockist records', details: error.message });
  }
}
