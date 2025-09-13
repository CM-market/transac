/**
 * Device Certificate Service: Handles OTP and device certificate actions.
 */
export async function requestOtp(phone: string): Promise<void> {
  const res = await fetch("/api/device/request-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to request OTP");
  }
}

export async function revokeDeviceCertificate(phone: string, otp: string): Promise<void> {
  const res = await fetch("/api/device/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, otp }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to revoke device certificate");
  }
}

export async function reissueDeviceCertificate(phone: string, otp: string): Promise<{ jwt: string }> {
  const res = await fetch("/api/device/reissue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, otp }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to reissue device certificate");
  }
  return await res.json();
}