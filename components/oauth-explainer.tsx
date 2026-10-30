import {
  ArrowRight,
  AppWindow,
  KeyRound,
  UserRoundCheck,
  ShieldCheck,
} from "lucide-react";
export default function OAuthExplainer({
  expanded = false,
}: {
  expanded?: boolean;
}) {
  return (
    <details className="oauth-explainer" open={expanded || undefined}>
      <summary>
        <KeyRound size={17} />
        <span>What is an OAuth app, and what are we helping you set up?</span>
        <span className="explainer-summary-note">A 30-second explanation</span>
      </summary>
      <div className="explainer-body">
        <p>
          <strong>
            OAuth is the permission flow behind “Connect Gmail” or “Add to
            Slack.”
          </strong>{" "}
          Users sign in with the provider and choose whether your product may
          access their account. They do not give your agent their password.
        </p>
        <div className="oauth-stages">
          <div>
            <AppWindow size={20} />
            <strong>1. Register your product</strong>
            <span>
              Create an OAuth app identity with the provider: name, redirect
              address and permissions. Composio may already supply this
              identity.
            </span>
          </div>
          <ArrowRight size={16} />
          <div>
            <UserRoundCheck size={20} />
            <strong>2. A user authorizes it</strong>
            <span>
              Each user signs in and approves the permissions. That creates one
              account connection.
            </span>
          </div>
          <ArrowRight size={16} />
          <div>
            <ShieldCheck size={20} />
            <strong>3. Prepare for wider release</strong>
            <span>
              Complete any applicable provider review, distribution requirements
              and customer-admin approvals.
            </span>
          </div>
        </div>
        <p className="explainer-assignment">
          This guide focuses on the developer’s registration and approval path.
          “Let LaunchPath help” prepares setup artifacts and can start a
          supported test connection. A test connection does not mean your own
          OAuth app is registered or approved.
        </p>
      </div>
    </details>
  );
}
