# Password recovery

At `/admin` or `/portal`, select **Forgot password?**, enter the account email, and request a new email. The email opens `/reset-password`, verifies the one-time recovery token, and shows **Choose a new password**. A successful password update opens `/portal`, which directs administrators to `/admin`. Access roles and project assignments are unchanged.

Supabase's recovery email template is versioned in `supabase/templates/recovery.html`. Apply its contents in Authentication → Email templates → Reset password (or the Auth configuration API). It uses `TokenHash` and an explicit recovery type, so links work in a fresh browser without a browser-specific PKCE verifier. The template currently targets the production URL `https://powertek-app.vercel.app`; update that URL when moving to a custom domain.

Keep `https://powertek-app.vercel.app/reset-password` in Supabase's redirect allowlist. Preserve existing invite, portal, admin, and preview entries. The sign-in forms also explicitly request this redirect. A root Site URL by itself cannot display a password form.

Older recovery callbacks landing at `/`, `/portal`, or `/admin` forward their query/fragment to the dedicated page before the Auth SDK consumes them. The page supports token-hash, implicit session, and PKCE callbacks. It removes credentials from the browser URL before creating the SDK and runs one explicit exchange to avoid competing callback handlers. Reloading the form uses the verified session. Explicit expired/invalid callbacks show a fresh-link action even if another session is already signed in.

Do not paste email links or tokens into chat/logs. Do not generate an administrator password or use a real account to test password changes.

Validation: `python tests/recovery-browser.py` with the development server running. It uses the real browser SDK with synthetic Auth responses and intercepts email/password-update requests. It covers both sign-in request destinations, cross-browser token verification, password mismatch/update, administrator redirect, legacy callbacks, reload, PKCE, and expired/used/missing links. `python tests/dashboard-browser.py` verifies the existing invitation and sign-in flows.
