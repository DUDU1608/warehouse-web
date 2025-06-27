import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Grid
} from "@mui/material";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Stack, Alert } from "@mui/material";

// Seller columns (now with Commodity at index 4)
const sellerColumns = [
  "Date", "Purchase from", "Mobile number", "RST No", "Commodity", "Quantity", "reduction",
  "Net Quantity", "Rate", "Cost", "Handling charge", "Total Cost", "Payment date",
  "PAYMENT DETAILS", "QUALITY"
];

// Stockist columns (now with Commodity at index 4)
const stockistColumns = [
  "Date", "Purchase from", "Name of Warehouse", "RST No", "Commodity", "Quantity", "Rate", "Total Cost",
  "Handling charge", "Margin", "Payment Date", "Cash Loan", "Date (Cash Loan)",
  "Loan Against Margin", "Date (Margin Loan)", "Total Loan"
];

// Helper: month difference (partial months rounded up, minimum 1)
function monthDiff(d1, d2) {
  let months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  if (d2.getDate() > d1.getDate()) months += 1;
  return Math.max(1, months);
}

// Helper: days between two dates (minimum 1)
function daysBetween(d1, d2) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.ceil((d2 - d1) / msPerDay));
}

// Robust date parser: MM/DD/YYYY, DD/MM/YYYY, or YYYY-MM-DD, or 06/14/25 as 2025-06-14
function parseDate(str) {
  if (!str) return null;
  let d = new Date(str);
  if (!isNaN(d)) return d;
  const parts = str.split("/");
  if (parts.length === 3) {
    let year = parts[2];
    if (year.length === 2) year = "20" + year;
    // Try MM/DD/YYYY
    d = new Date(`${year}-${parts[0]}-${parts[1]}`);
    if (!isNaN(d)) return d;
    // Try DD/MM/YYYY
    d = new Date(`${year}-${parts[1]}-${parts[0]}`);
    if (!isNaN(d)) return d;
  }
  return null;
}

// Format as DD/MM/YYYY
function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return "";
  const d = parseDate(dateStr);
  if (!d || isNaN(d)) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Currency & tons formatting for new summary cards
const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatTons = (value) => `${((value || 0) / 1000).toFixed(2)} MT`;

const today = new Date();
const formatToday = () => today.toLocaleDateString("en-GB").replace(/\//g, "/");

// Helpers for Wheat/Maize totals
function sumByCommodity(records, qtyIdx = 5, commodityIdx = 4, target) {
  return (records || []).reduce((sum, row) =>
    row && row[commodityIdx] && row[commodityIdx].toLowerCase() === target
      ? sum + (parseFloat(row[qtyIdx]) || 0)
      : sum, 0);
}

export default function Dashboard() {
  const router = useRouter();
  const { mobile } = router.query;
  const [role, setRole] = useState(null);
  const [roles, setRoles] = useState([]);
  const [sellerName, setSellerName] = useState("");
  const [stockistTab, setStockistTab] = useState("");
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!mobile) return;
    fetch(`/api/userType?mobile=${mobile}`)
      .then(res => res.json())
      .then(data => {
        setRoles(data.roles || []);
        setSellerName(data.sellerName || "");
        setStockistTab(data.stockistTab || "");
        if (data.roles?.length === 1) setRole(data.roles[0]);
      });
  }, [mobile]);

  useEffect(() => {
    if (!role || !mobile) return;
    setRecords([]);
    setSummary({});
    setShowDetails(false);

    // Quantity index now 5; Commodity index now 4
    if (role === "seller") {
      fetch(`/api/getRecords?mobile=${mobile}`)
        .then(res => res.json())
        .then(data => {
          setRecords(data.records || []);
          setSummary({
            entryCount: data.records?.length || 0,
            totalQuantity: (data.records || []).reduce((sum, row) => sum + (parseFloat(row[5]) || 0), 0),
            wheatQty: sumByCommodity(data.records, 5, 4, "wheat"),
            maizeQty: sumByCommodity(data.records, 5, 4, "maize"),
            totalPayments: (data.records || []).reduce((sum, row) => sum + (parseFloat(row[11]) || 0), 0)
          });
        });
    }
    if (role === "stockist" && stockistTab) {
      fetch(`/api/getStockistRecords?mobile=${mobile}&tab=${encodeURIComponent(stockistTab)}`)
        .then(res => res.json())
        .then(data => {
          console.log("ALL RECORDS RAW", data.records);

          const today = new Date();

          // --- Warehouse Rental (pro-rated by days/30) ---
          const warehouseRental = (data.records || []).reduce((sum, row) => {
            if (!row[0] || !row[5]) return sum;
            const entryDate = parseDate(row[0]);
            if (!entryDate || isNaN(entryDate)) return sum;
            const qtyTons = (parseFloat(row[5]) || 0) / 1000;
            const days = daysBetween(entryDate, today);
            return sum + qtyTons * 100 * (days / 30);
          }, 0);

          // --- Cash Loan rows ---
          const filteredCashLoanRows = (data.records || []).filter(row =>
            row[11] && row[12] && !isNaN(parseDate(row[12]))
          );
          // --- Margin Loans and Repayments ---
          const marginLoans = (data.records || []).filter(row =>
            row[13] && row[14] && !isNaN(parseDate(row[14]))
          ).map(row => ({
            principal: parseFloat(row[13]) || 0,
            start: parseDate(row[14])
          }));
          const repayments = (data.records || []).filter(row =>
            row[9] && row[10] && !isNaN(parseDate(row[10]))
          ).map(row => ({
            amount: parseFloat(row[9]) || 0,
            date: parseDate(row[10])
          }));

          // --- Debug ---
          console.log("RECORDS LENGTH", data.records.length);
          filteredCashLoanRows.forEach((row, idx) => {
            const cashLoanDate = parseDate(row[12]);
            console.log("CashLoan Row", idx, "Amount", row[11], "Date", row[12], "Parsed Date", cashLoanDate);
          });
          marginLoans.forEach((loan, idx) => {
            console.log("MarginLoan", idx, loan);
          });
          repayments.forEach((r, idx) => {
            console.log("Repayment", idx, r);
          });

          // --- Interest Calculation ---
          const interestRate = 0.14;
          let totalInterest = 0;

          // Cash Loan Interest
          filteredCashLoanRows.forEach(row => {
            const cashLoan = parseFloat(row[11]) || 0;
            const cashLoanDate = parseDate(row[12]);
            const days = daysBetween(cashLoanDate, today);
            const interestForRow = cashLoan * interestRate * (days / 365);
            console.log(
              "CashLoan", cashLoan,
              "Date", row[12],
              "Days", days,
              "InterestForRow", interestForRow
            );
            totalInterest += interestForRow;
          });

          // Margin Loan Interest with Repayments
          marginLoans.forEach(loan => {
            let outstanding = loan.principal;
            let lastDate = loan.start;
            const relevantRepayments = repayments
              .filter(r => r.date > loan.start)
              .sort((a, b) => a.date - b.date);
            for (const r of relevantRepayments) {
              if (outstanding <= 0) break;
              const days = daysBetween(lastDate, r.date);
              const interestForPeriod = outstanding * interestRate * (days / 365);
              totalInterest += interestForPeriod;
              console.log(
                "MarginLoan",
                "Outstanding", outstanding,
                "From", lastDate,
                "To", r.date,
                "Days", days,
                "InterestForPeriod", interestForPeriod,
                "Repayment", r.amount
              );
              outstanding -= r.amount;
              if (outstanding < 0) outstanding = 0;
              lastDate = r.date;
            }
            if (outstanding > 0) {
              const days = daysBetween(lastDate, today);
              const interestForPeriod = outstanding * interestRate * (days / 365);
              totalInterest += interestForPeriod;
              console.log(
                "MarginLoan Remaining",
                "Outstanding", outstanding,
                "From", lastDate,
                "To", today,
                "Days", days,
                "InterestForPeriod", interestForPeriod
              );
            }
          });

          setRecords(data.records || []);
          setSummary({
            totalQuantity: (data.records || []).reduce((sum, row) => sum + (parseFloat(row[5]) || 0), 0),
            wheatQty: sumByCommodity(data.records, 5, 4, "wheat"),
            maizeQty: sumByCommodity(data.records, 5, 4, "maize"),
            totalCost: (data.records || []).reduce((sum, row) => sum + (parseFloat(row[7]) || 0), 0),
            totalCashLoan: (data.records || []).reduce((sum, row) => sum + (parseFloat(row[11]) || 0), 0),
            totalLoanMargin: (data.records || []).reduce((sum, row) => sum + (parseFloat(row[13]) || 0), 0)-(data.records || []).reduce((sum, row) => sum + (parseFloat(row[9]) || 0), 0),
            totalLoan: (data.records || []).reduce((sum, row) => sum + (parseFloat(row[15]) || 0), 0),
            warehouseRental,
            totalInterest
          });
        });
    }
  }, [role, mobile, stockistTab]);

  if (!mobile) return <div>Loading...</div>;
  if (!roles.length) return <div>Loading account type...</div>;

  if (roles.length === 2 && !role) {
    return (
      <Box maxWidth={400} mx="auto" mt={8} textAlign="center">
        <Typography variant="h6" mb={2}>Choose Your Role</Typography>
        <Button variant="contained" color="primary" onClick={() => setRole("seller")} fullWidth sx={{ mb: 2 }}>
          Seller Dashboard {sellerName && `(${sellerName})`}
        </Button>
        <Button variant="contained" color="secondary" onClick={() => setRole("stockist")} fullWidth>
          Stockist Dashboard {stockistTab && `(${stockistTab})`}
        </Button>
      </Box>
    );
  }

  if (role && !records.length) return <div>No records found for this number.</div>;

  // Seller Dashboard (unchanged except summary card for Wheat/Maize)
  if (role === "seller") {
    return (
      <Box maxWidth={1200} mx="auto" p={4}>
        <Typography variant="h5" mb={2}>Seller Dashboard</Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, bgcolor: "#e3f2fd" }}>
              <Typography>Total Vehicles</Typography>
              <Typography variant="h6">{summary.entryCount}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, bgcolor: "#e8f5e9" }}>
              <Typography>Total Quantity</Typography>
              <Typography variant="h6">{formatTons(summary.totalQuantity)}</Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Wheat: {formatTons(summary.wheatQty)} <br />
                Maize: {formatTons(summary.maizeQty)}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, bgcolor: "#fffde7" }}>
              <Typography>Total Payments</Typography>
              <Typography variant="h6">{summary.totalPayments?.toLocaleString()}</Typography>
            </Paper>
          </Grid>
        </Grid>
        <Button variant="contained" color="primary" onClick={() => setShowDetails(s => !s)} sx={{ mb: 2 }}>
          {showDetails ? "Hide Details" : "Details"}
        </Button>
        {showDetails && (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {sellerColumns.map((c, i) => <TableCell key={i}>{c}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((row, idx) => (
                  <TableRow key={idx}>
                    {sellerColumns.map((_, i) =>
                      <TableCell key={i}>
                        {(i === 0 || i === 12)
                          ? formatDateDDMMYYYY(row[i])
                          : (row[i] || "")}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  }

  // Stockist Dashboard
  if (role === "stockist") {
    return (
      <Box maxWidth={1200} mx="auto" p={4}>
        <Typography variant="h4" align="center" mb={3} fontWeight={700}>
          Stockist Dashboard{stockistTab ? `: ${stockistTab}` : ""}
        </Typography>
        <Grid container spacing={2} justifyContent="center" alignItems="stretch" mb={2}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Paper elevation={3} sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="subtitle1" color="text.secondary">Total Quantity</Typography>
              <Typography variant="h4" fontWeight={600} color="primary">
                {formatTons(summary.totalQuantity)}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Wheat: {formatTons(summary.wheatQty)} <br />
                Maize: {formatTons(summary.maizeQty)}
              </Typography>
              <WarehouseIcon sx={{ fontSize: 34, color: "teal", mt: 1 }} />
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Paper elevation={3} sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="subtitle1" color="text.secondary">Total Cost</Typography>
              <Typography variant="h4" fontWeight={600}>
                {formatCurrency(summary.totalCost)}
              </Typography>
              <Box height={34} />
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Paper elevation={3} sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="subtitle1" color="text.secondary">Total Cash Loan</Typography>
              <Typography variant="h4" fontWeight={600}>
                {formatCurrency(summary.totalCashLoan)}
              </Typography>
              <Box height={34} />
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Paper elevation={3} sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="subtitle1">Total Loan<br />Against Margin</Typography>
              <Typography variant="h4" fontWeight={700}>
                {formatCurrency(summary.totalLoanMargin)}
              </Typography>
              <Box height={34} />
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Paper elevation={3} sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="subtitle1" color="text.secondary">Total Loan</Typography>
              <Typography variant="h4" fontWeight={600}>
                {formatCurrency(summary.totalLoan)}
              </Typography>
              <Box height={34} />
            </Paper>
          </Grid>
        </Grid>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="center"
          alignItems="center"
          mb={2}
        >
          <Alert icon={<InfoOutlinedIcon />} severity="success" sx={{ bgcolor: "#e6f9ed" }}>
            <b>Total Warehouse Rental till {formatToday()}:</b> {formatCurrency(summary.warehouseRental)}
          </Alert>
          <Alert icon={<InfoOutlinedIcon />} severity="warning" sx={{ bgcolor: "#fff9e6" }}>
            <b>Total Interest till {formatToday()}:</b> {formatCurrency(summary.totalInterest)}
          </Alert>
        </Stack>
        <Box textAlign="center" mb={4}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            sx={{ px: 6, borderRadius: 2, fontWeight: 600 }}
            onClick={() => setShowDetails(s => !s)}
          >
            DETAILS
          </Button>
        </Box>
        {showDetails && (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {stockistColumns.map((c, i) => <TableCell key={i}>{c}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((row, idx) => (
                  <TableRow key={idx}>
                    {stockistColumns.map((_, i) =>
                      <TableCell key={i}>
                        {(i === 0 || i === 10 || i === 12 || i === 14)
                          ? formatDateDDMMYYYY(row[i])
                          : (row[i] || "")}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  }

  return <div>Loading...</div>;
}

