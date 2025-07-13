# calc-ai-contrib

[![Test](https://github.com/WillBooster/calc-ai-contrib/actions/workflows/test.yml/badge.svg)](https://github.com/WillBooster/calc-ai-contrib/actions/workflows/test.yml)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

🤖 **Analyze AI vs Human contributions** in your GitHub repositories with beautiful visual reports.

## ✨ Features

- 📊 Multi-repository analysis with date ranges
- 🤖 AI vs Human contribution breakdown
- 🤝 Pair programming (AI & Human) detection
- 🎯 Smart filtering (files, users, commits)
- 🎨 Beautiful progress bars and reports

## 🚀 Quick Start

```bash
GH_TOKEN=[your_github_token_here] npx --yes calc-ai-contrib@latest --repo WillBooster/calc-ai-contrib --start-date 2025-07-10 --end-date 2025-07-10 --exclude-users "renovate[bot]" --ai-emails "bot@willbooster.com" "agent@willbooster.com"
```

## 📖 Usage Examples

```bash
export GH_TOKEN=[your_github_token_here]

# Analyze specific PRs
npx --yes calc-ai-contrib@latest -r owner/repo -p 123 456 789

# Analyze by date range
npx --yes calc-ai-contrib@latest -r owner/repo -s 2024-01-01 -e 2024-01-31

# Multiple repositories with date range
npx --yes calc-ai-contrib@latest -r owner/repo1 owner/repo2 -s 2024-01-01 -e 2024-01-31

# With AI detection (includes default AI emails)
npx --yes calc-ai-contrib@latest -r owner/repo -s 2024-01-01 -e 2024-01-31 --ai-emails "bot@company.com"

# Advanced filtering with date range
npx --yes calc-ai-contrib@latest -r owner/repo -s 2024-01-01 -e 2024-01-31 \
  --exclude-files "*.md" "test/**" \
  --exclude-users "dependabot"
```

### Key Options

| Option              | Description                                                                        |
| ------------------- | ---------------------------------------------------------------------------------- |
| `--repo` `-r`       | Repository(s) in `owner/repo` format                                               |
| `--pr-numbers` `-p` | PR numbers to analyze (e.g., 123 456 789)                                          |
| `--start-date` `-s` | Start date for analysis (YYYY-MM-DD format)                                        |
| `--end-date` `-e`   | End date for analysis (YYYY-MM-DD format)                                          |
| `--ai-emails`       | Additional AI emails (includes aider@aider.chat, noreply@anthropic.com by default) |
| `--exclude-files`   | Glob patterns to exclude files                                                     |
| `--exclude-users`   | Usernames to exclude                                                               |
| `--verbose` `-v`    | Show detailed progress                                                             |

**Note:** You must provide either `--pr-numbers` OR both `--start-date` and `--end-date`, but not both.

## 📊 Sample Output

```shell
npx --yes calc-ai-contrib@latest --repo WillBooster/gen-pr WillBooster/calc-ai-contrib --start-date 2025-07-01 --end-date 2025-07-13 --exclude-files "*.{md,yaml,yml}" "**/dist/**" "**/__generated__/**" "**/migrations/**" --exclude-users "renovate[bot]" --exclude-commit-messages "fix: apply changes by lint-fix and build" --ai-emails "bot@willbooster.com" "agent@willbooster.com" "you@example.com"
```

```
╔══════════════════════════════════════════════════╗
║           CONTRIBUTION ANALYSIS REPORT           ║
╠══════════════════════════════════════════════════╣
║ Date: 2025-07-01 to 2025-07-31 (PRs: 54)         ║
║ Total Edits: 7,158 (+4,206 / -2,952)             ║
╠══════════════════════════════════════════════════╣
║ AI: 11% | Pair: 19% | Human: 70%                 ║
║ Contributors: 2 AI, 2 Human                      ║
╚══════════════════════════════════════════════════╝

📊 DETAILED BREAKDOWN
────────────────────────────────────────

🤖 AI   : [██░░░░░░░░░░░░░░]  11% |      789 edits (+623 / -166)
🤝 Pair : [███░░░░░░░░░░░░░]  19% |    1,349 edits (+647 / -702)
👥 Human: [███████████░░░░░]  70% |    5,020 edits (+2,936 / -2,084)
🤖, 🤝, and 👥 represent contributions as identified by commit authors.

👤 INDIVIDUAL CONTRIBUTIONS
────────────────────────────────────────
exKAZUu (Sakamoto, Kazunori) <exkazuu@gmail.com>:
  [██████████████░░]  89% |    6,357 edits: (+3,575 / -2,782)
    Pair vs Human: [███░░░░░░░░░] 21% Pair / 79% Human

...
```

## 📄 License

Apache License 2.0
