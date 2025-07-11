#!/bin/bash

changed_files="$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD)"

run_if_changed() {
  if echo "$changed_files" | grep --quiet -E "$1"; then
    eval "$2"
  fi
}

run_if_changed "\..+-version" "awk '{print \$1}' .tool-versions | xargs -I{} asdf plugin add {}"
run_if_changed "\..+-version" "asdf plugin update --all"
run_if_changed "\..+-version" "asdf install"
run_if_changed "package\.json" "bun install"
