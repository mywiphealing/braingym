Brings the `member-email-notifications` work into `main` (it is already what www.mywiphealing.com runs) and adds a proper "Request changes" flow on top.

## Member emails, roles, surveys and password reset (from `member-email-notifications`)
- Resend emails for RSVPs, proposal status changes, new Circles and daily reminders (`notify.js`, Vercel cron `/api/cron/reminders`).
- Community roles, post-Circle survey, My progress, password reset and change password.
- "Request changes" status (`needs_revision`) so a host can edit and resubmit a proposal.

## Request changes: edit and flag, not a one-line prompt
- **Admin** (`admin-harmoni.html`): "Request changes…" opens the proposal as an editable form. The admin can edit fields directly (re-validated like the host's form), tick **Ask host to revise** on any field with a note, and write an overall note. The card shows what was asked and, after resubmit, what the host changed.
- **Server** (`app.js`): `POST /api/admin/harmoni/events/:id/request-changes` `{ note, edits, flags }`, stored as `data.revision`; on resubmit `revision.hostChanges` records the host's changes.
- **Host** (`circle/index.html`): the revise screen opens with **📝 Here's what you need to revise** (message, fields to update, edits made, each with **Go to it →**). Each question shows its flag or edit. My Circles shows "N things to revise".
- **Email**: the "To revise" email lists flagged fields and edits.

## Sign-in links and logs
- The home page forwards Supabase sign-in/reset links that land there to `/circle/`; `/circle/` explains expired or reused links.
- Vercel logs show `Email sent: …` for every email, and why when an admin action sends the host no email.

## Before merging
- Vercel Production needs `RESEND_API_KEY`.
- Supabase → Auth → URL Configuration: Site URL `https://www.mywiphealing.com`; Redirect URLs include `https://www.mywiphealing.com/circle/**`.

## Testing
- Local server with a seeded proposal (email and Supabase off); admin flow and host revise screen checked in headless Chromium, including note-only and empty requests; home-page link forwarding checked.
- The host's resubmit (`PUT`) was not run end to end, because it needs a real member login.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_0153zma5RXhR8qyRmQZEA8dd
