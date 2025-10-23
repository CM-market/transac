import { useCallback, useEffect, useRef, useState } from "react";
import {
  useCrateServicePostApiV1PowChallenge,
  useCrateServicePostApiV1PowVerify,
} from "../openapi-rq/queries/queries";
import { performProofOfWork } from "../services/computation/proofOfWork";
import { apiAuthService } from "../services/keyManagement/apiAuthService";
import type {
  PowChallengeResponse,
  PowSolution,
  VerificationRequest,
} from "../openapi-rq/requests/types.gen";

export interface AuthenticationStatus {
  // Overall status
  isComplete: boolean;
  isLoading: boolean;
  error: string | null;

  // POW status
  powStatus: string;
  isPowComputing: boolean;

  // Certificate
  devCert: string | null;
}

const useSimplifiedAuthFlow = () => {
  const [status, setStatus] = useState<AuthenticationStatus>({
    isComplete: false,
    isLoading: true,
    error: null,
    powStatus: "Initializing...",
    isPowComputing: false,
    devCert: null,
  });

  const hasStartedRef = useRef(false);
  const isInitializedRef = useRef(false);

  // Use TanStack Query mutations for Proof of Work
  const { mutateAsync: getPowChallenge } =
    useCrateServicePostApiV1PowChallenge();
  const { mutateAsync: verifyPowSolution } =
    useCrateServicePostApiV1PowVerify();

  // Check for existing auth token
  const checkExistingAuth = useCallback(async () => {
    const authToken = localStorage.getItem("authToken");
    if (authToken) {
      try {
        // Validate token if needed
        apiAuthService.setBearerToken(authToken);

        setStatus((prev) => ({
          ...prev,
          isComplete: true,
          isLoading: false,
        }));
        return true;
      } catch (error) {
        // Token invalid, remove it
        localStorage.removeItem("authToken");
      }
    }
    return false;
  }, []);

  // Perform Proof of Work
  const performPow = useCallback(async () => {
    try {
      setStatus((prev) => ({
        ...prev,
        powStatus: "Requesting challenge...",
        isPowComputing: true,
      }));

      // Get challenge from server
      const challenge = await getPowChallenge();

      setStatus((prev) => ({
        ...prev,
        powStatus: "Computing proof of work...",
      }));

      // Compute the solution
      const solution = await performProofOfWork(
        challenge.challenge_data,
        challenge.difficulty,
      );

      setStatus((prev) => ({
        ...prev,
        powStatus: "Verifying solution...",
      }));

      // Create the solution object
      const powSolution: PowSolution = {
        challenge_id: challenge.challenge_id,
        nonce: solution.nonce,
        hash: solution.hash,
      };

      // Create the verification request
      const verificationRequest: VerificationRequest = {
        solution: powSolution,
        public_key: "",
        relay_id: crypto.randomUUID(),
      };

      // Verify the solution
      const response = await verifyPowSolution({
        requestBody: verificationRequest,
      });

      // Store the token
      if (response.token) {
        localStorage.setItem("authToken", response.token);
        apiAuthService.setBearerToken(response.token);
      }

      setStatus((prev) => ({
        ...prev,
        isComplete: true,
        isLoading: false,
        isPowComputing: false,
        powStatus: "Verification complete",
        devCert: null, // No device certificate in simplified flow
      }));

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to complete proof of work";

      setStatus((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
        isPowComputing: false,
        powStatus: "Verification failed",
      }));

      return false;
    }
  }, [getPowChallenge, verifyPowSolution]);

  // Initialize authentication flow
  const initializeAuth = useCallback(async () => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    try {
      // First check if we already have a valid token
      const isAuthenticated = await checkExistingAuth();
      if (isAuthenticated) return;

      // If not authenticated, perform POW
      await performPow();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Authentication initialization failed";

      setStatus((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    }
  }, [checkExistingAuth, performPow]);

  // Start authentication on component mount
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      initializeAuth();
    }
  }, [initializeAuth]);

  return status;
};

export default useSimplifiedAuthFlow;
