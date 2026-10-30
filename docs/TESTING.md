# Testing

## Automated checks

The latest run passed 45 tests. TypeScript validation and the production build also passed.

The suite covers guide citation references, scenario changes, stored guides, permission evidence, model failures, cancelled research, private address blocking, request size limits, private setup ownership and logo retrieval.

OAuth protocol fixtures cover pending status, account identity mismatches, unsupported managed routes, callback parameters that try to imply success, limited scope requests and failed authenticated reads. Fixtures are not presented as real provider approvals.

## Real services

A real GitHub managed OAuth connection completed with account consent. Composio reported ACTIVE. The authenticated profile request returned HTTP 200.

Live model and search requests produced saved investigations for providers outside the reference library. The final checked Discord investigation retained `identify` with its supporting phrase and explicit review unknowns.

A real public website inspection returned HTTP 200 for example.com while keeping ownership and approval unresolved.

## Browser checks

App search, library filters, unfamiliar app handoff, Gmail scenario changes, expandable runbooks, evidence drawers, setup preparation and manifest download were exercised in the browser.

Desktop and 390 pixel layouts were checked. The interface retained its content without horizontal page overflow. Actual logo images loaded for the saved providers.

## Secrets and privacy

Configured API key values were checked against generated client bundles and were not found. Real environment files and private runtime data are excluded from the submission.

Public guides can be read without a setup cookie. Private setup attempts return 404 to a browser without the matching owner cookie. Callback query parameters alone cannot create an active connection.

## Limits of these results

These checks do not prove every generated statement correct, every provider flow complete, or a production deployment secure. Provider approval and real Slack or Gmail consent are not verified by the automated suite.

## Hosted checks

The Render container built and started successfully. The public homepage, guide API and research health endpoint returned HTTP 200.

A new Figma investigation ran through the deployed browser interface, selected `file_content:read`, identified a public app review gate and saved a guide in Postgres.

A real database write was followed by a successful read from a separate process. The deployed private setup API created a Slack worksheet, manifest and runbook. The owner session received HTTP 200 for its workspace; a request without that cookie received HTTP 404.

The Figma test exposed a fallback that described review as wholly unresolved despite a documented blocker. The fallback now uses that blocker to create the next review action. A regression test covers this case.

The saved Figma share link remained readable after a successful Render redeployment. The final code also checks that a token exchange is not the only connection test in a generated runbook.

A manual source check clarified Figma draft test eligibility, moved development testing before public submission, and added an explicit file read check. Those are documented future developer actions. No authenticated Figma setup is claimed.
