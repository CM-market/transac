import React, { useState } from "react";
import {
  requestOtp,
  revokeDeviceCertificate,
  reissueDeviceCertificate,
} from "../services/keyManagement/deviceCertificateService";
import { apiAuthService } from "../services/keyManagement/apiAuthService";

type ActionType = "revoke" | "reissue" | null;

const DeviceCertificateActions: React.FC = () => {
  const [step, setStep] = useState<
    "idle" | "phone" | "otp" | "processing" | "done" | "error"
  >("idle");
  const [action, setAction] = useState<ActionType>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleActionClick = (type: ActionType) => {
    setAction(type);
    setStep("phone");
    setFeedback(null);
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("processing");
    setFeedback(null);
    try {
      await requestOtp(phone);
      setStep("otp");
    } catch (err: any) {
      setStep("error");
      setFeedback(err.message || "Failed to send OTP. Please try again.");
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("processing");
    setFeedback(null);
    try {
      if (action === "revoke") {
        await revokeDeviceCertificate(phone, otp);
        setStep("done");
        setFeedback("Device certificate revoked successfully.");
      } else if (action === "reissue") {
        const result = await reissueDeviceCertificate(phone, otp);
        apiAuthService.setBearerToken(result.jwt);
        setStep("done");
        setFeedback(
          "Device certificate reissued and JWT updated successfully.",
        );
      }
    } catch (err: any) {
      setStep("error");
      setFeedback(
        err.message || "Failed to process request. Please try again.",
      );
    }
  };

  const reset = () => {
    setStep("idle");
    setAction(null);
    setPhone("");
    setOtp("");
    setFeedback(null);
  };

  return (
    <div>
      {step === "idle" && (
        <div className="space-y-4">
          <button
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
            onClick={() => handleActionClick("revoke")}
          >
            Revoke Device Certificate
          </button>
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
            onClick={() => handleActionClick("reissue")}
          >
            Reissue Device Certificate
          </button>
        </div>
      )}

      {step === "phone" && (
        <form onSubmit={handlePhoneSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Enter your phone number to verify:
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-2 w-full border rounded px-3 py-2"
              required
              pattern="^\\+?[0-9]{7,15}$"
              placeholder="+237XXXXXXXXX"
            />
          </label>
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded"
          >
            Send OTP
          </button>
          <button
            type="button"
            className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded"
            onClick={reset}
          >
            Cancel
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleOtpSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Enter the OTP sent to your phone:
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="mt-2 w-full border rounded px-3 py-2"
              required
              pattern="^[0-9]{4,8}$"
              placeholder="Enter OTP"
            />
          </label>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
          >
            {action === "revoke" ? "Revoke Certificate" : "Reissue Certificate"}
          </button>
          <button
            type="button"
            className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded"
            onClick={reset}
          >
            Cancel
          </button>
        </form>
      )}

      {step === "processing" && (
        <div className="mt-6 text-center text-blue-600">Processing...</div>
      )}

      {step === "done" && (
        <div className="mt-6 text-center text-green-600">
          {feedback}
          <button
            className="block mx-auto mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded"
            onClick={reset}
          >
            Done
          </button>
        </div>
      )}

      {step === "error" && (
        <div className="mt-6 text-center text-red-600">
          {feedback}
          <button
            className="block mx-auto mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded"
            onClick={reset}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default DeviceCertificateActions;
