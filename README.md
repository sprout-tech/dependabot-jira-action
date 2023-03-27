
# Dependaobot to JIRA Issue Sync Action

Use this github action to create Jira issue from the dependabot pull requests created in your repo.

# Usage

See [action.yml](action.yml)

```yaml
name: Update JIRA with dependabot issues
on:
  schedule:
    - cron: '0 */8 * * *'
jobs:
  jira:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: read
    steps:
      - name: Dependabot JIRA Action
        uses: sprout-tech/dependabot-jira-action@v1.2.1
        with:
          jiraIssueLabel: dependabot
          jiraProjectKey: TGA
          jiraIssueType: Bug
          githubRepo: dependabot-jira-action
          githubOwner: sprout-tech
        env:
          JIRA_SUBDOMAIN: ${{ secrets.JIRA_SUBDOMAIN }}
          JIRA_USER_EMAIL: ${{ secrets.JIRA_USER_EMAIL }}
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
          GITHUB_API_TOKEN: ${{ secrets.CUSTOM_GITHUB_TOKEN }}
```

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)


## Development

> Node 18.x

Install the dependencies  
```bash
$ npm install
```

Build the typescript and package it for distribution
```bash
$ npm run build && npm run package
```

Run the tests :heavy_check_mark:  
```bash
$ npm test

 PASS  ./index.test.js
  ✓ throws invalid number (3ms)
  ✓ wait 500 ms (504ms)
  ✓ test runs (95ms)

...
```

## Documention for action.yml

The action.yml defines the inputs and output for your action.

Update the action.yml with your name, description, inputs and outputs for your action.

See the [documentation](https://help.github.com/en/articles/metadata-syntax-for-github-actions)


See the [toolkit documentation](https://github.com/actions/toolkit/blob/master/README.md#packages) for the various packages.

## Publish to a distribution branch

Actions are run from GitHub repos so we will checkin the packed dist folder. 

Then run [ncc](https://github.com/zeit/ncc) and push the results:
```bash
$ npm run package
$ git add dist
$ git commit -a -m "New version with dependencies"
$ git push origin releases/v1
```

Note: We recommend using the `--license` option for ncc, which will create a license file for all of the production node modules used in your project.

Your action is now published! :rocket: 

See the [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)

## Validate

You can now validate the action by referencing `./` in a workflow in your repo (see [test.yml](.github/workflows/test.yml))

```yaml
permissions:
  pull-requests: read
steps:
  - uses: actions/checkout@v2
  - uses: ./
    with:
      jiraIssueLabel: dependabot
      jiraProjectKey: TGA
      jiraIssueType: Bug
      githubRepo: dependabot-jira-action
      githubOwner: sprout-tech
    environment:
      JIRA_SUBDOMAIN: ${{ env.JIRA_SUBDOMAIN }}
      JIRA_USER_EMAIL: ${{ env.JIRA_USER_EMAIL }}
      JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
      GITHUB_API_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

See the [actions tab](https://github.com/actions/typescript-action/actions) for runs of this action! :rocket:

## Usage:

After testing you can [create a v1 tag](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md) to reference the stable and latest V1 action
