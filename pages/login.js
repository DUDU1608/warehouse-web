import { useState } from "react";
import dynamic from "next/dynamic";
import { Box, Typography, Paper } from "@mui/material";

// Dynamic import for Firebase/SSR issues
const OtpLogin = dynamic(() => import("../components/OtpLogin"), { ssr: false });
const RoleSelector = dynamic(() => import("../components/RoleSelector"), { ssr: false });

export default function LoginPage() {
  const [mobile, setMobile] = useState("");

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f3f6f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Paper elevation={4} sx={{ p: 4, width: 350 }}>
        <Typography variant="h5" align="center" gutterBottom>
          Warehouse Login
        </Typography>
        <Typography variant="body1" align="center" mb={3}>
          Please login with your registered mobile number.
        </Typography>
        {!mobile ? (
          <OtpLogin onSuccess={setMobile} />
        ) : (
          <RoleSelector mobile={mobile} />
        )}
      </Paper>
    </Box>
  );
}

