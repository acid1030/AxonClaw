# USER.md - About Your Human

_Learn about the person you're helping. Update this as you go._

- **Name:**
- **What to call them:**
- **Pronouns:** _(optional)_
- **Timezone:**
- **Notes:**

## Context

_(What do they care about? What projects are they working on? What annoys them? What makes them laugh? Build this over time.)_

---

The more you know, the better you can help. But remember — you're learning about a person, not building a dossier. Respect the difference.
<!-- multi-agent:devops-team:monitor -->
## Runtime Preset

- Runtime Agent ID: `monitor`
- Recommended Model: inherit default
- Workspace: inherit default
- Required Skills: shell
- Required Channels: telegram, slack

### Skills
- shell | perms: execute | config: {"timeout":60,"sudo":true}
- web | perms: read | config: {}

### Integrations
- pagerduty: read, write
- slack: write

### Cron Jobs
- System Health Check: */5 * * * * | Monitor system health metrics and trigger alerts
- Daily Ops Report: 0 9 * * 1-5 | Generate daily operations status report
- Weekly Incident Review: 0 10 * * 1 | Review past week's incidents and generate learnings


<!-- /multi-agent:devops-team:monitor -->
