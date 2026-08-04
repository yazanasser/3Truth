# Security operations

## Immediate credential action

The previous Node gateway contained a Gmail app password in source. The value has been removed, along with the mail/OTP endpoint and `nodemailer`, but deletion does not revoke a credential. Revoke that app password in the Google account immediately, review sign-in activity, and rotate any related secret that may have shared scope.

## Authentication and authorization

The client now uses Firebase passwordless email-link authentication. It never receives an OTP secret, derives a password from an email address, creates a fake user, or writes plan entitlements. Firebase must have Email Link sign-in enabled and must authorize the production callback domain.

`firestore.rules` denies all browser writes and permits a signed-in user to read only `/users/{uid}` for their own UID. Subscription or role changes must be performed by a trusted server using verified payment events; Admin SDK operations bypass client rules and therefore require separate service-account controls and audit logging.

## Gateway controls

- exact-origin CORS allowlist (`ALLOWED_ORIGINS`)
- one-megabyte JSON default (`JSON_BODY_LIMIT`)
- bounded multipart uploads (`MAX_UPLOAD_BYTES`)
- security headers and suppressed Express fingerprinting
- sanitized client errors
- health-probed Python circuit breaker with modality-specific timeouts
- local-only model loading unless an explicit provisioning session sets `ALLOW_MODEL_DOWNLOADS=1`

Terminate TLS at a trusted reverse proxy, add authenticated rate limiting before public exposure, store logs outside the web root, and never log uploaded evidence bodies.

