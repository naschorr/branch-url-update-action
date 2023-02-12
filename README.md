# Branch URL Update Action

Updates repository-specific links in text files (Markdown, reStructuredText, etc) to point to the current branch. Avoid manually updating your feature branches when merging, and keep everything in sync!

## Example Workflow .yaml

This will likely be updated to no longer be necessary, and simply invoking the action like any other will handle these steps. However, that enhancement hasn't been completed yet.

```yaml
name: Branch URL Update Action

on:
  push:
    branches-ignore:
      - 'main'
      - 'master'
  pull_request:
    branches:
      - 'main'
      - 'master'
      # And any other protected branches here too

jobs:
  branch_url_update_action:
    runs-on: ubuntu-latest
    name: Update branch URLs to use the current branch
    steps:
      - name: Checkout the repository
        uses: actions/checkout@v3.2.0

      - name: Extract target/current branch name
        shell: bash
        run: |
          if [ ! -z "$GITHUB_BASE_REF" ]; then
            echo "##[set-output name=branch;]$(echo $GITHUB_BASE_REF)"
          elif [ ! -z "$GITHUB_REF_NAME" ]; then
            echo "##[set-output name=branch;]$(echo $GITHUB_REF_NAME)"
          else
            return 1
          fi
        id: extract_branch

      - name: Update branch URLs to use the current branch
        id: update
        uses: naschorr/branch-url-update-action@v1
        with:
          target-branch: ${{ steps.extract_branch.outputs.branch }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Commit changes back into repository
        if: "${{ success() && steps.update.outputs.updated-files != '' }}"
        uses: stefanzweifel/git-auto-commit-action@v4
        with:
          commit_message: "Updated repository branch names"

      - name: Get the updated file paths
        run: echo "Files ${{ steps.update.outputs.updated-files }}"
```

## How It Works

Let's say you've got a `README.md` that looks like:

```markdown
# Hello World!

![Hello world example](https://raw.githubusercontent.com/username/hello_world/master/resources/example.png)

Dolores natus quibusdam asperiores. Error sed commodi sunt et qui rerum odio voluptatibus. Eveniet dolor vitae et odit ut. Rem necessitatibus quis harum dolorem eaque.
...
```

And you want to update the example image to reflect some changes that you're working on in your feature branch (let's say the new file is called "example_ux.png"). Updating the `README.md` to point to this new URL is trivial:

```markdown
# Hello World!

![Hello world example](https://raw.githubusercontent.com/username/hello_world/feature/resources/example_ux.png)

Dolores natus quibusdam asperiores. Error sed commodi sunt et qui rerum odio voluptatibus. Eveniet dolor vitae et odit ut. Rem necessitatibus quis harum dolorem eaque.
...
```

However, once your feature is complete and ready to be merged back in, you'll need to edit the URL to point to the main branch version of that new asset. This creates an annoying loop of testing in your feature branch to ensure correctness and proper design to then updating all of those changes to point back to main. Sure, you could leave your assets pointing to that old feature branch, but then what happens when you start pruning stale branches?

This action alleviates that by taking care of keeping those URLs pointing to the current branch! It'll help by both updating those URLs on push (except main), and updating them for merge requests to main. Using the above `README.md` example, if you were to open a pull request to the `main` branch, the action would update your file to look like:

```markdown
# Hello World!

![Hello world example](https://raw.githubusercontent.com/username/hello_world/main/resources/example_ux.png)

Dolores natus quibusdam asperiores. Error sed commodi sunt et qui rerum odio voluptatibus. Eveniet dolor vitae et odit ut. Rem necessitatibus quis harum dolorem eaque.
...
```
