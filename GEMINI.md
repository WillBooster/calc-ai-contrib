## Project Information

- Name: calc-ai-contrib
- Description: undefined
- Package Manager: bun

## General Instructions

- After making code changes, run `bun check-for-ai` to perform type checking and linting.
- Once you have checked your changes, commit them to the current branch using the `--no-verify` option. Make sure to add a new line at the end of your commit message with: `Co-authored-by: WillBooster (Gemini CLI) <agent@willbooster.com>`.
- When your work is fully complete, run `bun check-all-for-ai` to execute all tests (note: this may take up to 30 minutes).

## Coding Style

- When adding new functions or classes, define them below any functions or classes that call them to maintain clear call order.
