import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Grid
} from "@mui/material";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import EmojiNatureIcon from "@mui/icons-material/EmojiNature";
import AgricultureIcon from "@mui/icons-material/Agriculture";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Stack, Alert } from "@mui/material";

// Seller columns (add Commodity at E/column 4)
const sellerColumns = [
  "Date", "Purchase from", "Mobile number", "RST No", "Commodity", "Quantity", "reduction",
  "Net Quantity", "Rate", "Cost", "Handling charge", "Total Cost", "Payment date",
  "PAYMENT DETAILS", "QUALITY"
];

// Stockist columns (add Commodity at E/column 4)
const stockistColumns = [
  "Date", "Purchase from", "Name of Warehouse", "RST No", "Commodity", "Quantity", "Rate", "Total Cost",
  "Handling charge", "Margin", "Payment Date", "Cash Loan", "Date (Cash Loan)",
  "Loan Against Margin", "Date (Margin Loan)", "Total Loan"
];

// Helper: date parser
function parseDate(str) {
  if (!str) return null;
  let d = new Date(str);
  if (!isNaN(d)) return d;
  const parts = str.split("/");
  if (parts.length === 3) {
    let year = parts[2];
    if (year.length === 2) year = "20" + year;
    d = new Date(`${year}-${parts[0]}-${parts[1]}`);
    if (!isNaN(d)) return d;
    d = new Date(`${year}-${parts[1]}-${parts[0]}`);
    if (!isNaN(d)) return d;
  }
  return null;
}
function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return "";
  const d = parseDate(dateStr);
  if (!d || isNaN(d)) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
const formatTons = (value) => `${((value || 0) / 1000).toFixed(2)} MT`;
const today = new Date();
const formatToday = () => today.toLocaleDateString("en-GB").replace(/\//g, "/");

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

  // Utility for per-commodity calculations
  const getQtyByCommodity = (records, qtyIdx, commIdx, target) =>
    records.reduce(
      (sum, row) =>
        (row[commIdx] || "").toLowerCase() === target ? sum + (parseFloat(row[qtyIdx]) || 0) : sum,
      0
    );

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

    // Seller
    if (role === "seller") {
      fetch(`/api/getRecords?mobile=${mobile}`)
        .then(res => res.json())
        .then(data => {
          const wheatQty = getQtyByCommodity(data.records, 5, 4, "wheat");
          const maizeQty = getQtyByCommodity(data.records, 5, 4, "maize");
          setRecords(data.records || []);
          setSummary({
            entryCount: data.records?.length || 0,
            totalQuantity: data.records.reduce((sum, row) => sum + (parseFloat(row[5]) || 0), 0),
            totalPayments: data.records.reduce((sum, row) => sum + (parseFloat(row[11]) || 0), 0),
            wheatQty, maizeQty
          });
        });
    }

    // Stockist
    if (role === "stockist" && stockistTab) {
      fetch(`/api/getStockistRecords?mobile=${mobile}&tab=${encodeURIComponent(stockistTab)}`)
        .then(res => res.json())
        .then(data => {
          const rows = data.records || [];
          // --- Warehouse Rental ---
          const warehouseRental = rows.reduce((sum, row) => {
            const entryDate = parseDate(row[0]);
            const qtyTons = (parseFloat(row[5]) || 0) / 1000;
            if (!entryDate || isNaN(entryDate)) return sum;
            const days = Math.max(1, Math.ceil((today - entryDate) / (24 * 60 * 60 * 1000)));
            return sum + qtyTons * 100 * (days / 30);
          }, 0);

          // --- Cash Loan, Margin Loan, etc. ---
          const totalCashLoan = rows.reduce((sum, row) => sum + (parseFloat(row[11]) || 0), 0);
          const totalLoanMargin = rows.reduce((sum, row) => sum + (parseFloat(row[13]) || 0), 0) -
            rows.reduce((sum, row) => sum + (parseFloat(row[9]) || 0), 0);
          const totalLoan = rows.reduce((sum, row) => sum + (parseFloat(row[15]) || 0), 0);
          const totalCost = rows.reduce((sum, row) => sum + (parseFloat(row[7]) || 0), 0);

          // Per-commodity
          const wheatQty = getQtyByCommodity(rows, 5, 4, "wheat");
          const maizeQty = getQtyByCommodity(rows, 5, 4, "maize");

          // -- Interest calculation (same as before)
          const filteredCashLoanRows = rows.filter(row =>
            row[11] && row[12] && !isNaN(parseDate(row[12]))
          );
          const marginLoans = rows.filter(row =>
            row[13] && row[14] && !isNaN(parseDate(row[14]))
          ).map(row => ({
            principal: parseFloat(row[13]) || 0,
            start: parseDate(row[14])
          }));
          const repayments = rows.filter(row =>
            row[9] && row[10] && !isNaN(parseDate(row[10]))
          ).map(row => ({
            amount: parseFloat(row[9]) || 0,
            date: parseDate(row[10])
          }));
          const interestRate = 0.14;
          let totalInterest = 0;
          filteredCashLoanRows.forEach(row => {
            const cashLoan = parseFloat(row[11]) || 0;
            const cashLoanDate = parseDate(row[12]);
            const days = Math.max(1, Math.ceil((today - cashLoanDate) / (24 * 60 * 60 * 1000)));
            const interestForRow = cashLoan * interestRate * (days / 365);
            totalInterest += interestForRow;
          });
          marginLoans.forEach(loan => {
            let outstanding = loan.principal;
            let lastDate = loan.start;
            const relevantRepayments = repayments
              .filter(r => r.date > loan.start)
              .sort((a, b) => a.date - b.date);
            for (const r of relevantRepayments) {
              if (outstanding <= 0) break;
              const days = Math.max(1, Math.ceil((r.date - lastDate) / (24 * 60 * 60 * 1000)));
              const interestForPeriod = outstanding * interestRate * (days / 365);
              totalInterest += interestForPeriod;
              outstanding -= r.amount;
              if (outstanding < 0) outstanding = 0;
              lastDate = r.date;
            }
            if (outstanding > 0) {
              const days = Math.max(1, Math.ceil((today - lastDate) / (24 * 60 * 60 * 1000)));
              const interestForPeriod = outstanding * interestRate * (days / 365);
              totalInterest += interestForPeriod;
            }
          });

          setRecords(rows);
          setSummary({
            totalQuantity: rows.reduce((sum, row) => sum + (parseFloat(row[5]) || 0), 0),
            totalCost,
            totalCashLoan,
            totalLoanMargin,
            totalLoan,
            warehouseRental,
            totalInterest,
            wheatQty, maizeQty
          });
        });
    }
  }, [role, mobile, stockistTab]);

  if (!mobile) return <div>Loading...</div>;
  if (!roles.length) return <div>Loading account type...</div>;

  // Seller Dashboard
  if (role === "seller") {
    return (
      <Box maxWidth={1200} mx="auto" p={4}>
        <Typography variant="h4" align="center" mb={3} fontWeight={700}>Seller Dashboard</Typography>
        <Grid container spacing={2} mb={2}>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, bgcolor: "#e3f2fd", textAlign: "center" }}>
              <Typography variant="subtitle2">Total Vehicles</Typography>
              <Typography variant="h5" fontWeight={700}>{summary.entryCount}</Typography>
              <WarehouseIcon sx={{ fontSize: 32, color: "#1976d2", mt: 1 }} />
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, bgcolor: "#fffde7", textAlign: "center" }}>
              <Typography variant="subtitle2">Total Quantity</Typography>
              <Typography variant="h5" fontWeight={700}>{formatTons(summary.totalQuantity)}</Typography>
              <Stack direction="row" justifyContent="center" spacing={2} mt={1}>
                <AgricultureIcon sx={{ color: "#bc6c25" }} />
                <Typography variant="body2" color="text.secondary">Wheat: {formatTons(summary.wheatQty)}</Typography>
                <EmojiNatureIcon sx={{ color: "#388e3c" }} />
                <Typography variant="body2" color="text.secondary">Maize: {formatTons(summary.maizeQty)}</Typography>
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, bgcolor: "#e8f5e9", textAlign: "center" }}>
              <Typography variant="subtitle2">Total Payments</Typography>
              <Typography variant="h5" fontWeight={700}>{formatCurrency(summary.totalPayments)}</Typography>
              <MonetizationOnIcon sx={{ fontSize: 32, color: "#43a047", mt: 1 }} />
            </Paper>
          </Grid>
        </Grid>
        <Button variant="contained" color="primary" onClick={() => setShowDetails(s => !s)} sx={{ mb: 2, borderRadius: 2 }}>
          {showDetails ? "Hide Details" : "Details"}
        </Button>
        {showDetails && (
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {sellerColumns.map((c, i) => <TableCell key={i}>{c}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((row, idx) => (
                  <TableRow key={idx} sx={{ backgroundColor: idx % 2 ? "#fafafa" : "#fff" }}>
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
        <Typography variant="h4" align="center" mb={3} fontWeight={700}>Stockist Dashboard{stockistTab ? `: ${stockistTab}` : ""}</Typography>
        <Grid container spacing={2} justifyContent="center" alignItems="stretch" mb={2}>
          <Grid item xs={12} sm={4} md={2.4}>
            <Paper elevation={3} sx={{ p: 3, textAlign: "center", bgcolor: "#fffde7" }}>
              <Typography variant="subtitle1" color="text.secondary">Total Quantity</Typography>
              <Typography variant="h5" fontWeight={700}>{formatTons(summary.totalQuantity)}</Typography>
              <Typography variant="body2" color="text.secondary">
                <span style={{ color: "#bc6c25" }}>Wheat: {formatTons(summary.wheatQty)}</span> <br />
                <span style={{ color: "#388e3c" }}>Maize: {formatTons(summary.maizeQty)}</span>
              </Typography>
              <WarehouseIcon sx={{ fontSize: 32, color: "#bc6c25", mt: 1 }} />
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4} md={2.4}>
            <Paper elevation={3} sx={{ p: 3, textAlign: "center", bgcolor: "#e3f2fd" }}>
              <Typography variant="subtitle1" color="text.secondary">Total Cost</Typography>
              <Typography variant="h5" fontWeight={700}>{formatCurrency(summary.totalCost)}</Typography>
              <MonetizationOnIcon sx={{ fontSize: 32, color: "#1976d2", mt: 1 }} />
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4} md={2.4}>
            <Paper elevation={3} sx={{ p: 3, textAlign: "center", bgcolor: "#e8f5e9" }}>
              <Typography variant="subtitle1" color="text.secondary">Total Cash Loan</Typography>
              <Typography variant="h5" fontWeight={700}>{formatCurrency(summary.totalCashLoan)}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Paper elevation={3} sx={{ p: 3, textAlign: "center", bgcolor: "#ffe0b2" }}>
              <Typography variant="subtitle1" color="text.secondary">Total Loan Against Margin</Typography>
              <Typography variant="h5" fontWeight={700}>{formatCurrency(summary.totalLoanMargin)}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Paper elevation={3} sx={{ p: 3, textAlign: "center", bgcolor: "#ede7f6" }}>
              <Typography variant="subtitle1" color="text.secondary">Total Loan</Typography>
              <Typography variant="h5" fontWeight={700}>{formatCurrency(summary.totalLoan)}</Typography>
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
          <TableContainer component={Paper} sx={{ maxHeight: 450 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {stockistColumns.map((c, i) => <TableCell key={i}>{c}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((row, idx) => (
                  <TableRow key={idx} sx={{ backgroundColor: idx % 2 ? "#fafafa" : "#fff" }}>
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

  // Role chooser fallback
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

  return <div>Loading...</div>;
}

