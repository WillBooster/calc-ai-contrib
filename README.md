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
# npx
GH_TOKEN=[your_github_token_here] npx --yes calc-ai-contrib --repo WillBooster/calc-ai-contrib --pr-numbers 123 456 --exclude-users "renovate[bot]" --ai-emails "bot@willbooster.com" "agent@willbooster.com"

# bunx
GH_TOKEN=[your_github_token_here] bunx calc-ai-contrib --repo WillBooster/calc-ai-contrib --pr-numbers 123 456 --exclude-users "renovate[bot]" --ai-emails "bot@willbooster.com" "agent@willbooster.com"
```

## 📖 Usage Examples

```bash
# Basic analysis
GH_TOKEN=[your_github_token_here] bunx calc-ai-contrib -r owner/repo -p 123 456 789

# Multiple repositories
GH_TOKEN=[your_github_token_here] bunx calc-ai-contrib -r owner/repo1 owner/repo2 -p 123 456

# With AI detection
GH_TOKEN=[your_github_token_here] bunx calc-ai-contrib -r owner/repo -s 2024-01-01 -e 2024-01-31 --ai-emails "bot@company.com"

# Advanced filtering
GH_TOKEN=[your_github_token_here] bunx calc-ai-contrib -r owner/repo -s 2024-01-01 -e 2024-01-31 \
  --exclude-files "*.md" "test/**" \
  --exclude-users "dependabot"
```

### Key Options

| Option              | Description                                |
| ------------------- | ------------------------------------------ |
| `--repo` `-r`       | Repository(s) in `owner/repo` format       |
| `--pr-numbers` `-p` | PR numbers to analyze (e.g., 123 456 789) |
| `--ai-emails`       | Email patterns to identify AI contributors |
| `--exclude-files`   | Glob patterns to exclude files             |
| `--exclude-users`   | Usernames to exclude                       |
| `--verbose` `-v`    | Show detailed progress                     |

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
