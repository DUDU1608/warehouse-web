// components/OtpLogin.js
import { useRef, useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../utils/firebaseClient";

export default function OtpLogin({ onSuccess }) {
  const [step, setStep] = useState("input"); // input, otp, success, error
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState("");
  const recaptchaRef = useRef(null);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        recaptchaRef.current,
        {
          size: "invisible",
          callback: () => {},
        },
        auth
      );
    }
  };

  const sendOtp = async () => {
    setError("");
    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(auth, "+91" + phone, appVerifier);
      setConfirmation(confirmationResult);
      setStep("otp");
    } catch (err) {
      setError(err.message);
    }
  };

  const verifyOtp = async () => {
    setError("");
    try {
      await confirmation.confirm(otp);
      setStep("success");
      if (onSuccess) onSuccess(phone);
    } catch (err) {
      setError("Invalid OTP. Try again.");
    }
  };

  return (
    <div style={{ maxWidth: 350, margin: "40px auto", border: "1px solid #ddd", borderRadius: 8, padding: 24 }}>
      <h2>Login with Mobile OTP</h2>
      {step === "input" && (
        <>
          <input
            type="text"
            placeholder="Enter mobile (10 digits)"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0,10))}
            style={{ width: "100%", padding: 8, margin: "16px 0" }}
          />
          <button style={{ width: "100%", padding: 10 }} onClick={sendOtp} disabled={phone.length !== 10}>
            Send OTP
          </button>
          <div ref={recaptchaRef} />
        </>
      )}
      {step === "otp" && (
        <>
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0,6))}
            style={{ width: "100%", padding: 8, margin: "16px 0" }}
          />
          <button style={{ width: "100%", padding: 10 }} onClick={verifyOtp} disabled={otp.length !== 6}>
            Verify OTP
          </button>
        </>
      )}
      {step === "success" && (
        <div style={{ color: "green" }}>✅ Login successful! Welcome.</div>
      )}
      {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}
    </div>
  );
}

