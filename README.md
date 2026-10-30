# LaunchPath

[Live demo](https://launchpath-adipatel399.onrender.com) · [Source](https://github.com/adipatel399/Launchpath)

LaunchPath helps developers understand what it takes to set up an OAuth app and get it ready for users.

Search for an app, open its guide, and see what to do next. If the app is missing, the research agent reads provider documentation and creates a guide that can be shared.

## What is included

1. Reviewed guides for GitHub, Slack and Gmail. They cover different registration, permission and approval problems.
2. Live research for other apps, with sources and open questions.
3. Setup steps with an owner and a clear completion check.
4. Separate estimates for configuration effort and approval waiting time.
5. A preparation worksheet, an agent runbook and a Slack manifest draft where applicable.
6. An optional managed OAuth test connection through Composio.
7. A website readiness check for public pages and redirect configuration.

The assignment asks for a few varied apps and a live generation flow. The catalog can grow towards 100 apps without adding app specific screens.

## Run it locally

Use Node.js 22.14 or newer.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open <http://127.0.0.1:3000>.

If `.env.local` already exists, keep it. Do not overwrite working keys.

The reviewed guides, exports and public website checks work without model keys. For live research, add `GEMINI_API_KEY` and `TAVILY_API_KEY`. Keys can be created through [Google AI Studio](https://aistudio.google.com/apikey) and [Tavily](https://app.tavily.com). Available free usage depends on the account and its quota.

Add `COMPOSIO_API_KEY` from a test project to try a real managed connection. This key is separate from the research keys. Keep all keys on the server and out of research inputs. The hosted demo uses the operator’s Composio test project. Run locally with your own project key if you want connections in your own project.

## Check the project

```sh
npm test
npm run typecheck
npm run build
npm start
```

The current suite has 45 passing checks. A real GitHub managed connection was also tested with account consent. Composio reported ACTIVE, and an authenticated `GET /user` returned HTTP 200.

## Why I chose this approach

The first question is whether the developer needs to register their own OAuth app. Composio may already provide the app identity, but the user still needs to sign in and approve access.

I kept registration, user consent, provider review, Marketplace listing and customer administrator approval separate. A working connection does not prove that an app is approved for wider release.

GitHub demonstrates the app type decision. Slack demonstrates distribution and workspace gates. Gmail shows how the requested permissions can change the approval path.

The agent does useful work before asking the developer to take over. It researches, prepares files and can start a supported managed connection. Sign in, consent, business statements and provider decisions stay with the appropriate person.

## How research works

The agent searches for documentation, retrieves readable pages, extracts requirements and runs a second review with a targeted follow up search. Each saved guide retains its sources and the use case it was researched for.

Permission recommendations need a matching phrase in a retrieved source. Unsupported recommendations are withheld. Missing review information stays unknown. A failed search does not mean the app lacks OAuth.

## Project structure

`app` contains pages and API routes. `components` contains the interface. `lib` contains research, website inspection and setup logic. `data` contains reviewed guides and provider configuration. `tests` contains automated checks.

Local runs save generated guides and private setup attempts under `.data`. Hosted runs can use Postgres through `DATABASE_URL`, so records survive application restarts. Local runtime files and all real environment files are excluded from the repository.

## Limits

Generated guidance needs a human check before consequential setup or review decisions. Model and search services can fail or hit quota limits.

Only the GitHub managed consent flow has been tested with a real account from start to finish. Slack and Gmail have protocol tests, but their real consent flows have not been completed. No custom provider registration or provider approval is claimed.

Website checks inspect public HTML. They do not establish compliance, ownership or review status.

This version is intended for a local demonstration or a controlled reviewer deployment. It needs real user accounts, stronger abuse controls and shared storage before being opened as a service for multiple users.

## Submission notes

The demo runs on Render with Postgres storage. New guide links survive app restarts. The free web service can take about a minute to wake up after inactivity. The free database expires on 29 November 2026, so it must be upgraded or moved before then if the demo needs to remain available.

For your own deployment, set `APP_URL` to its HTTPS origin and configure `DATABASE_URL` for persistence. The Dockerfile and startup migration are included.

See [demo steps](docs/DEMO.md), [findings](docs/FINDINGS.md), [test results](docs/TESTING.md) and [deployment notes](docs/DEPLOYMENT.md).

Brand marks belong to their respective owners. Interface icons use Lucide. The fonts are DM Sans and Manrope.
