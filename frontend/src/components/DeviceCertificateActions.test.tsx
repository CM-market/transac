import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DeviceCertificateActions from "./DeviceCertificateActions";

// Mock the service functions
jest.mock("../services/keyManagement/deviceCertificateService", () => ({
  requestOtp: jest.fn(),
  revokeDeviceCertificate: jest.fn(),
  reissueDeviceCertificate: jest.fn(),
}));
jest.mock("../services/keyManagement/apiAuthService", () => ({
  apiAuthService: { setBearerToken: jest.fn() },
}));

const { requestOtp, revokeDeviceCertificate, reissueDeviceCertificate } = require("../services/keyManagement/deviceCertificateService");
const { apiAuthService } = require("../services/keyManagement/apiAuthService");

describe("DeviceCertificateActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders action buttons initially", () => {
    render(<DeviceCertificateActions />);
    expect(screen.getByText(/Revoke Device Certificate/i)).toBeInTheDocument();
    expect(screen.getByText(/Reissue Device Certificate/i)).toBeInTheDocument();
  });

  it("shows phone input after clicking revoke", () => {
    render(<DeviceCertificateActions />);
    fireEvent.click(screen.getByText(/Revoke Device Certificate/i));
    expect(screen.getByLabelText(/Enter your phone number/i)).toBeInTheDocument();
  });

  it("shows OTP input after submitting phone and simulates OTP request", async () => {
    requestOtp.mockResolvedValueOnce();
    render(<DeviceCertificateActions />);
    fireEvent.click(screen.getByText(/Reissue Device Certificate/i));
    fireEvent.change(screen.getByPlaceholderText(/\+237XXXXXXXXX/i), { target: { value: "+1234567890" } });
    fireEvent.click(screen.getByText(/Send OTP/i));
    await waitFor(() => expect(requestOtp).toHaveBeenCalledWith("+1234567890"));
    expect(screen.getByLabelText(/Enter the OTP/i)).toBeInTheDocument();
  });

  it("shows error feedback if OTP request fails", async () => {
    requestOtp.mockRejectedValueOnce(new Error("OTP error"));
    render(<DeviceCertificateActions />);
    fireEvent.click(screen.getByText(/Reissue Device Certificate/i));
    fireEvent.change(screen.getByPlaceholderText(/\+237XXXXXXXXX/i), { target: { value: "+1234567890" } });
    fireEvent.click(screen.getByText(/Send OTP/i));
    await waitFor(() => expect(screen.getByText(/OTP error/i)).toBeInTheDocument());
  });

  it("shows success feedback after successful revocation", async () => {
    requestOtp.mockResolvedValueOnce();
    revokeDeviceCertificate.mockResolvedValueOnce();
    render(<DeviceCertificateActions />);
    fireEvent.click(screen.getByText(/Revoke Device Certificate/i));
    fireEvent.change(screen.getByPlaceholderText(/\+237XXXXXXXXX/i), { target: { value: "+1234567890" } });
    fireEvent.click(screen.getByText(/Send OTP/i));
    await waitFor(() => expect(requestOtp).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText(/Enter OTP/i), { target: { value: "123456" } });
    fireEvent.click(screen.getByText(/Revoke Certificate/i));
    await waitFor(() => expect(revokeDeviceCertificate).toHaveBeenCalledWith("+1234567890", "123456"));
    expect(screen.getByText(/Device certificate revoked successfully/i)).toBeInTheDocument();
  });

  it("shows success feedback after successful reissue", async () => {
    requestOtp.mockResolvedValueOnce();
    reissueDeviceCertificate.mockResolvedValueOnce({ jwt: "test.jwt.token" });
    render(<DeviceCertificateActions />);
    fireEvent.click(screen.getByText(/Reissue Device Certificate/i));
    fireEvent.change(screen.getByPlaceholderText(/\+237XXXXXXXXX/i), { target: { value: "+1234567890" } });
    fireEvent.click(screen.getByText(/Send OTP/i));
    await waitFor(() => expect(requestOtp).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText(/Enter OTP/i), { target: { value: "123456" } });
    fireEvent.click(screen.getByText(/Reissue Certificate/i));
    await waitFor(() => expect(reissueDeviceCertificate).toHaveBeenCalledWith("+1234567890", "123456"));
    expect(apiAuthService.setBearerToken).toHaveBeenCalledWith("test.jwt.token");
    expect(screen.getByText(/Device certificate reissued and JWT updated successfully/i)).toBeInTheDocument();
  });

  it("shows error feedback if revocation fails", async () => {
    requestOtp.mockResolvedValueOnce();
    revokeDeviceCertificate.mockRejectedValueOnce(new Error("Revoke error"));
    render(<DeviceCertificateActions />);
    fireEvent.click(screen.getByText(/Revoke Device Certificate/i));
    fireEvent.change(screen.getByPlaceholderText(/\+237XXXXXXXXX/i), { target: { value: "+1234567890" } });
    fireEvent.click(screen.getByText(/Send OTP/i));
    await waitFor(() => expect(requestOtp).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText(/Enter OTP/i), { target: { value: "123456" } });
    fireEvent.click(screen.getByText(/Revoke Certificate/i));
    await waitFor(() => expect(screen.getByText(/Revoke error/i)).toBeInTheDocument());
  });

  it("shows error feedback if reissue fails", async () => {
    requestOtp.mockResolvedValueOnce();
    reissueDeviceCertificate.mockRejectedValueOnce(new Error("Reissue error"));
    render(<DeviceCertificateActions />);
    fireEvent.click(screen.getByText(/Reissue Device Certificate/i));
    fireEvent.change(screen.getByPlaceholderText(/\+237XXXXXXXXX/i), { target: { value: "+1234567890" } });
    fireEvent.click(screen.getByText(/Send OTP/i));
    await waitFor(() => expect(requestOtp).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText(/Enter OTP/i), { target: { value: "123456" } });
    fireEvent.click(screen.getByText(/Reissue Certificate/i));
    await waitFor(() => expect(screen.getByText(/Reissue error/i)).toBeInTheDocument());
  });
});