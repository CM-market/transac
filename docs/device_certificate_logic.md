# Device Certificate Logic and Revocation Flow

## 1. Device Certificate (JWT) Generation After PoW

- After successful Proof-of-Work (PoW), the backend issues a device certificate as a signed JWT.
- The JWT includes the following claims:
  - `device_id`: Unique identifier for the device.
  - `user_role`: Defaults to `"buyer"`.
  - `phone_number`: The phone number should be optional and only be included if the device has a store and has verified its phone number then it's role should be updated to seller.

## 2. Role Escalation: Buyer to Seller

- When a device creates a store, the backend updates the device's `user_role` to `"seller"`.
- This is done by reissuing a new JWT for the device with `user_role: "seller"`.
- The device must use the new JWT for all subsequent authenticated requests.

## 3. Device Revocation (Seller-Only)

- Only devices with `user_role: "seller"` can initiate device revocation.
- To revoke a device:
  1. The device must present a valid JWT with `user_role: "seller"`.
  2. The user must verify the phone number associated with their store (e.g., via a Whatsapp message).
  3. Upon successful verification, the backend sets `is_revocked = true` in the `REVOCATION` table for the device's id .
  4. All JWTs for that device id are now blacklisted.

## 4. JWT Validation and Middleware

- On every authenticated request:
  1. The backend validates the JWT and extracts `device_id`, `user_role`, and `phone_number`.
  2. The backend checks the `REVOCATION` table for the device id; if revoked, authentication fails.
  3. For revocation endpoints, the backend checks that `user_role` is `"seller"` and verifies the phone number.

## 5. Key Implementation Steps

- **JWT Issuance:** After PoW, issue JWT with `device_id` and `user_role: "buyer"`.
- **Role Escalation:** On store creation, reissue JWT with `user_role: "seller"` and `phone number`.
- **Revocation Restriction:** Only allow revocation if `user_role` is `"seller"` and phone verification passes.
- **Revocation Logic:** Set `is_revocked = true` in `REVOCATION` for the store's phone number.
- **Authentication:** Always check revocation status and enforce role-based access for revocation.

## 6. Maintainability Notes

- All role and device logic is enforced at the application level; no schema changes are required.
- JWTs must be reissued on role change (buyer → seller).
- Revocation is always tied to the phone number associated with the store.
- Only sellers (devices with a store) can revoke devices, ensuring buyers cannot perform revocation.
- All sensitive actions require phone verification for security.
