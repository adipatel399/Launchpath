# What I checked and learned

The initial reference documentation was reviewed on 29 October 2026. These are scoped findings, not claims that every provider has been fully tested.

## Managed OAuth changes the starting point

[Composio documentation](https://docs.composio.dev/toolkits/managed-auth) explains that it can provide the registered OAuth app. Users still authorize their own accounts. The interface starts with that choice so a developer does not register a custom app unnecessarily.

## GitHub

The custom registration page redirected to sign in in a clean browser. No custom GitHub app was created in that attempt.

A separate managed connection was completed through Composio with account consent. The requested scope was `read:user`. The server matched the connection, user and toolkit identity before accepting ACTIVE status. A real authenticated profile request returned HTTP 200.

Only status, time and a description were retained. Profile responses and provider tokens were not saved by LaunchPath. This proves a test connection, not custom registration or approval.

[GitHub scope documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps) also recommends considering GitHub Apps when finer permissions are needed.

## Slack

The creation dialog exposed the app name and workspace selection. Creation could not continue without an authorized workspace session. This became an early account access requirement in the guide.

[Slack Marketplace requirements](https://docs.slack.dev/slack-marketplace/slack-marketplace-app-guidelines-and-requirements/) distinguish listing eligibility from a working installation. The guide makes that decision visible before submission preparation.

The preparation flow produced a downloadable manifest requesting `chat:write`. Its JSON was checked locally. Slack has not accepted or installed that draft.

## Gmail

[Google scope documentation](https://developers.google.com/workspace/gmail/api/auth/scopes) classifies `gmail.send` as sensitive and `gmail.readonly` as restricted. Handling restricted data on a server can introduce assessment requirements.

The guide changes the permission map, assessment step and blocker information when the developer selects sending only. Internal audience eligibility still needs to be checked for the actual organization.

## Live investigation

Notion, Linear and Discord were investigated with real model and search requests. Discord was outside the reference library. Its final checked run recommended `identify`, retained the matching official source phrase, and left wider release requirements unresolved.

An earlier Notion run treated an API label as a permission. This led to exact permission evidence checks and withdrawal of older unchecked permission maps.

A table extraction problem joined adjacent cells and rejected valid evidence. Preserving cell boundaries fixed it. Search timeouts and incomplete second reviews remain visible rather than being replaced with invented conclusions.

## What remains unverified

No custom provider app registration, provider review submission, security assessment or approval was completed. Real Slack and Gmail consent flows remain untested. Customer policies and provider waiting times cannot be established from one test account.
