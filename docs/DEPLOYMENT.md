# Deployment

The demo is deployed at <https://launchpath-adipatel399.onrender.com>. Source is at <https://github.com/adipatel399/Launchpath>.

The web service and Postgres database both use Render’s free plans. The database expires on 29 November 2026. No paid plan was enabled. Upgrade or move the database before that date to keep the saved guides available.

## Requirements

Use a Node host that supports long requests and Postgres or persistent writable storage. Research can take several minutes and streams progress events to the browser.

Run `npm ci`, `npm run build`, then start Next on the interface and port required by the host. The local `npm start` command binds to the loopback interface by default.

Configure the research keys on the server. Use a separate Composio test project for connection demonstrations. Set `APP_URL` to the public HTTPS origin so authorization returns to the right application.

Keep generated guides and private setup attempts on persistent storage. Ephemeral storage can lose shareable guides after a restart or redeployment.

## Reviewer access

Keep the deployment controlled. This version has browser ownership cookies for private setup attempts and process local request limits. It does not have a full user account system or distributed abuse protection.

Before opening it to unrelated public users, add user authentication, per user authorization and shared request limits. Do not expose a project key through client code or publish runtime data.

## Final submission

Include the working public demo link and the public source repository link. Run the documented demo against the deployed version, including a newly generated guide. Verify its share link in another browser session.

## Container deployment

The Dockerfile builds the application as a standalone Node server and runs it as a user without root access. It listens on port 3000 and accepts the host supplied PORT value.

Set runtime keys through the hosting provider. The build context excludes real environment files, private attempts and local working notes.

For hosted persistence, set `DATABASE_URL` to the Render database in the same region. Container startup applies the schema in `migrations/001_records.sql` before starting the server. Local runs without a database keep file storage.

The free Render database expires after 30 days. Record its actual expiry in the handoff and upgrade or move the database before then if the demo must stay available. No paid plan is enabled automatically. A local file storage deployment would instead need a persistent disk at `/app/.data`.
