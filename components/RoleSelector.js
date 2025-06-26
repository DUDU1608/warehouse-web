import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function RoleSelector({ mobile }) {
  const router = useRouter();
  const [roles, setRoles] = useState([]);
  const [sellerName, setSellerName] = useState("");
  const [stockistTab, setStockistTab] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mobile) return;
    fetch(`/api/userType?mobile=${mobile}`)
      .then(res => res.json())
      .then(data => {
        setRoles(data.roles || []);
        setSellerName(data.sellerName || "");
        setStockistTab(data.stockistTab || "");
        setLoading(false);
        // If only one role, redirect immediately
        if (data.roles?.length === 1) {
          if (data.roles[0] === "seller") router.replace(`/dashboard?mobile=${mobile}`);
          else if (data.roles[0] === "stockist") router.replace(`/dashboard?mobile=${mobile}&tab=${encodeURIComponent(data.stockistTab)}`);
        }
      });
  }, [mobile]);

  if (loading) return <div>Checking your account...</div>;
  if (roles.length === 0) return <div>No records found for this mobile number.</div>;
  if (roles.length === 1) return <div>Redirecting...</div>;

  // If both roles found, let user choose
  return (
    <div style={{ maxWidth: 400, margin: "60px auto", textAlign: "center" }}>
      <h2>Choose Your Role</h2>
      <button
        style={{ padding: 14, fontSize: 18, margin: 16, width: "90%" }}
        onClick={() => router.push(`/dashboard?mobile=${mobile}`)}
      >
        Seller Dashboard {sellerName && `(${sellerName})`}
      </button>
      <button
        style={{ padding: 14, fontSize: 18, margin: 16, width: "90%" }}
        onClick={() => router.push(`/dashboard?mobile=${mobile}&tab=${encodeURIComponent(stockistTab)}`)}
      >
        Stockist Dashboard {stockistTab && `(${stockistTab})`}
      </button>
    </div>
  );
}

