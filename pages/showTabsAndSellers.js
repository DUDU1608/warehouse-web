import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Button,
} from "@mui/material";

export default function ShowTabsAndSellers() {
  const [tabNames, setTabNames] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/getTabsAndSellers")
      .then((res) => res.json())
      .then((data) => {
        setTabNames(data.tabNames || []);
        setSellers(data.sellers || []);
        setErr(data.error || null);
        setLoading(false);
      })
      .catch((e) => {
        setErr("Failed to fetch data");
        setLoading(false);
      });
  }, []);

  return (
    <Box maxWidth={600} mx="auto" mt={6} p={2}>
      <Typography variant="h4" align="center" mb={3}>
        Sheet Tabs & Unique Sellers
      </Typography>
      {loading ? (
        <Box textAlign="center" my={5}>
          <CircularProgress />
        </Box>
      ) : err ? (
        <Paper sx={{ p: 3, bgcolor: "#fffbe6", mb: 2 }}>
          <Typography color="error">{err}</Typography>
        </Paper>
      ) : (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" mb={1}>
              All Sheet Tab Names
            </Typography>
            <List dense>
              {tabNames.map((tab) => (
                <ListItem key={tab} sx={{ px: 1 }}>
                  <ListItemText primary={tab} />
                </ListItem>
              ))}
            </List>
          </Paper>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" mb={1}>
              Unique Sellers (from 3 tabs)
            </Typography>
            <List dense>
              {sellers.map((seller) => (
                <ListItem key={seller} sx={{ px: 1 }}>
                  <ListItemText primary={seller} />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 1 }} />
            <Typography fontSize="small" color="gray">
              (Total Sellers: {sellers.length})
            </Typography>
          </Paper>
        </>
      )}
      <Box textAlign="center" mt={4}>
        <Button variant="outlined" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </Box>
    </Box>
  );
}

