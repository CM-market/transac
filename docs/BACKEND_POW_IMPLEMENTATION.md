# Backend Proof of Work (POW) Implementation

This document details the implementation of the Proof of Work (POW) system in the backend of the Transac application.

## Overview

The POW system is a security measure designed to protect against denial-of-service attacks and spam. It requires clients to solve a computational puzzle before they can access certain resources. This process ensures that the client has expended a certain amount of computational effort, making it more difficult for malicious actors to overwhelm the system.

## Modules

The POW implementation is contained within the `crypto` module, which is organized into the following submodules:

-   `pow`: Contains the core logic for the POW service, including challenge generation and verification.
-   `middleware`: Implements the Axum middleware for validating incoming requests.

## Core Components

### `PowService`

The `PowService` is the heart of the POW system. It is responsible for:

-   **Challenge Generation:** The `generate_challenge()` method creates a new `PowChallenge` with a unique ID, a random string of data, a difficulty level, and an expiration time. The challenge is then stored in memory.
-   **Solution Verification:** The `verify_solution()` method takes a `PowSolution` from the client and checks it against the stored challenge. It verifies the following:
    -   The challenge exists and has not expired.
    -   The hash in the solution is correct.
    -   The hash meets the difficulty requirement (i.e., it has the required number of leading zeros).

### Middleware

The `crypto_validation_middleware` is an Axum middleware that intercepts incoming requests and checks for a valid authorization token. In the current implementation, it checks for a bearer token in the `Authorization` header.

## API Endpoints

The POW system exposes the following two API endpoints:

-   `POST /api/v1/pow/challenge`: Generates and returns a new POW challenge to the client.
-   `POST /api/v1/pow/verify`: Verifies a POW solution submitted by the client. If the solution is valid, it returns a temporary authorization token.

## Configuration

The POW system can be configured with the following environment variables, which are defined in the `Config` struct in `src/config.rs`:

-   `POW_DIFFICULTY`: The number of leading zeros required in the hash of a valid solution.
-   `POW_TIMEOUT_MINUTES`: The number of minutes a challenge is valid for.

## Error Handling

The `AppError` enum in `src/error.rs` defines the custom error types for the application. The POW system uses the `Validation` variant to return errors related to invalid challenges or solutions.