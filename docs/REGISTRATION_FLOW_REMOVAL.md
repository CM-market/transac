# Registration Flow Removal Documentation

## Overview

This document describes the changes made to remove the WebAuthn registration flow from the Transac application as requested. The registration flow was causing errors in the browser, likely due to permission issues with the WebAuthn API.

## Changes Made

### 1. Created a Simplified Authentication Flow

- Created a new `useSimplifiedAuthFlow.ts` hook that replaces the complex authentication flow
- Removed WebAuthn registration steps, keeping only the Proof of Work verification
- Simplified the authentication status interface to remove WebAuthn-specific fields

### 2. Updated App Component

- Modified `App.tsx` to use the simplified authentication flow
- Updated `AppRoutes.tsx` to import the authentication status type from the simplified flow

### 3. Removed WebAuthn Dependencies

- Removed WebAuthn-related packages from `package.json`:
  - `@adorsys-gis/storage`
  - `@adorsys-gis/web-auth`
  - `@adorsys-gis/web-auth-logger`
  - `@adorsys-gis/web-auth-prf`
  - `@adorsys-gis/web-auth-storage`
- Updated `vite.config.ts` to remove references to these packages

### 4. Simplified PasswordManager

- Replaced the complex WebAuthn-based PasswordManager with a simplified version
- Removed WebAuthn registration and authentication logic
- Added a stub for `initializeDOMElements` to maintain compatibility
- Simplified the password generation to use only secure random values

## Benefits

1. **Improved Reliability**: Removed the WebAuthn registration that was causing errors
2. **Simplified Authentication**: Streamlined the authentication process to use only Proof of Work
3. **Reduced Dependencies**: Eliminated several external dependencies, making the application more maintainable
4. **Better User Experience**: Users no longer encounter permission errors related to WebAuthn

## Testing

The changes have been tested by:
1. Successfully building the frontend application
2. Verifying that all TypeScript errors have been resolved

## Future Considerations

If WebAuthn registration needs to be re-implemented in the future:

1. Re-add the WebAuthn dependencies
2. Create a more robust implementation that handles permission denials gracefully
3. Consider making WebAuthn optional rather than required
4. Add better error handling and user feedback for WebAuthn failures