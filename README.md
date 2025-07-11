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
# Analyze specific PRs
GH_TOKEN=[your_github_token_here] bunx calc-ai-contrib --repo WillBooster/calc-ai-contrib --pr-numbers 123 456 --exclude-users "renovate[bot]" --ai-emails "bot@willbooster.com"

# Analyze by date range
GH_TOKEN=[your_github_token_here] bunx calc-ai-contrib --repo WillBooster/calc-ai-contrib --start-date 2024-01-01 --end-date 2024-01-31 --ai-emails "bot@willbooster.com"
```

## 📖 Usage Examples

```bash
# Analyze specific PRs
GH_TOKEN=[your_github_token_here] bunx calc-ai-contrib -r owner/repo -p 123 456 789

# Analyze by date range
GH_TOKEN=[your_github_token_here] bunx calc-ai-contrib -r owner/repo -s 2024-01-01 -e 2024-01-31

# Multiple repositories with date range
GH_TOKEN=[your_github_token_here] bunx calc-ai-contrib -r owner/repo1 owner/repo2 -s 2024-01-01 -e 2024-01-31

# With AI detection (includes default AI emails)
GH_TOKEN=[your_github_token_here] bunx calc-ai-contrib -r owner/repo -s 2024-01-01 -e 2024-01-31 --ai-emails "bot@company.com"

# Advanced filtering with date range
GH_TOKEN=[your_github_token_here] bunx calc-ai-contrib -r owner/repo -s 2024-01-01 -e 2024-01-31 \
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

```
╔══════════════════════════════════════════════════╗
║           CONTRIBUTION ANALYSIS REPORT           ║
╠══════════════════════════════════════════════════╣
║ Date: 2024-01-01 to 2024-01-31 (PRs: 45)         ║
║ Total Edits: 12,847 (+8,234 / -4,613)            ║
╠══════════════════════════════════════════════════╣
║ AI vs Human: [████░░░░░░░░░░░░░░░░░░] 18% / 82%   ║
║ Contributors: 2 AI, 5 Human                      ║
╚══════════════════════════════════════════════════╝

📊 DETAILED BREAKDOWN
🤖 AI   : [███░░░░░░░░░░░░░]  18% |    2,312 Edits (+1,456 / -856)
🤝 Pair : [█░░░░░░░░░░░░░░░░]   3% |      385 Edits (+234 / -151)
👥 Human: [████████████░░░░]  79% |   10,150 Edits (+6,544 / -3,606)

👤 TOP CONTRIBUTORS
alice-dev (Alice Developer): 62% | 7,965 Edits
WillBooster (Agent): 12% | 1,547 Edits
bot-assistant (AI): 6% | 765 Edits
```

## 📄 License

Apache License 2.0
