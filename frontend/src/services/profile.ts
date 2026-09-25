import { apiAuthService } from "./keyManagement/apiAuthService";

/**
 * Editable profile fields shown to other users.
 */
export interface Profile {
  id: string;
  device_id: string;
  name: string;
  phone: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Payload used to create/update a profile.
 */
export interface ProfilePayload {
  name: string;
  phone?: string | null;
  location?: string | null;
}

/**
 * Build the Authorization header from the in-memory token or localStorage,
 * mirroring the pattern used across seller components.
 */
function authHeaders(): HeadersInit {
  const token =
    apiAuthService.getCurrentToken() || localStorage.getItem("authToken");
  return token
    ? {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      }
    : { "Content-Type": "application/json" };
}

/**
 * `true` when the user has a bearer token available for authenticated requests.
 */
export function hasAuthToken(): boolean {
  return Boolean(
    apiAuthService.getCurrentToken() || localStorage.getItem("authToken"),
  );
}

/**
 * Fetch the current user's profile.
 *
 * Returns `null` when the profile has not been created yet (404).
 * Throws an `Error` with the server message on other failures.
 */
export async function getProfile(): Promise<Profile | null> {
  const response = await fetch("/api/v1/profiles/me", {
    headers: authHeaders(),
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Failed to fetch profile (${response.status})`);
  }
  const data = await response.json();
  return data.profile as Profile;
}

/**
 * Create or update the current user's profile and return the saved profile.
 *
 * Throws an `Error` with the server message (e.g. invalid Cameroon phone)
 * when the request is rejected.
 */
export async function updateProfile(payload: ProfilePayload): Promise<Profile> {
  const response = await fetch("/api/v1/profiles/me", {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Failed to update profile (${response.status})`);
  }
  const data = await response.json();
  return data.profile as Profile;
}
