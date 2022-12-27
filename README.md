# Branch URL Update Action 
Updates GitHub links in text files (Markdown, reStructuredText, etc) to point to the current branch. Avoid manually updating your feature branches when merging, and keep everything in sync!

## Example workflow .yaml
```
on: [push]

jobs:
  branch_url_update_action:
    runs-on: ubuntu-latest
    name: Update branch URLs to use the current branch
    steps:
      - name: Checkout the repository
        uses: actions/checkout@v3.2.0

      - name: Extract current branch name
        shell: bash
        run: echo "##[set-output name=branch;]$(echo $GITHUB_REF_NAME)"
        id: extract_branch

      - name: Update branch URLs to use the current branch
        id: update
        uses: naschorr/current-branch-text-updater-action@v1
        with:
          target-branch: ${{ steps.extract_branch.outputs.branch }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Commit changes back into repository
        uses: stefanzweifel/git-auto-commit-action@v4
        with:
          commit_message: "Updated repository branch names"

      - name: Get the updated file paths
        run: echo "Files ${{ steps.update.outputs.updated-files }}"
```
