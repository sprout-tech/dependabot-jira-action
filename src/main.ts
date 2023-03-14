import * as core from '@actions/core'
import {
  syncJiraWithClosedDependabotPulls,
  syncJiraWithOpenDependabotPulls
} from './actions'

async function run(): Promise<void> {
  try {
    core.setOutput(
      'Start dependabot jira issue creation',
      new Date().toTimeString()
    )
    const label: string = core.getInput('jiraIssueLabel')
    const projectKey: string = core.getInput('jiraProjectKey')
    const issueType: string = core.getInput('jiraIssueType')
    const repo: string = core.getInput('githubRepo')
    const owner: string = core.getInput('githubOwner')
    // First close jira issue that are closed in github
    await syncJiraWithClosedDependabotPulls({
      repo,
      owner,
      label,
      projectKey,
      issueType
    })
    // Then open new issues in jira from open dependabot issues
    await syncJiraWithOpenDependabotPulls({
      repo,
      owner,
      label,
      projectKey,
      issueType
    })
  } catch (error) {
    if (error instanceof Error) {
      core.debug(error.message)
      core.setFailed(error.message)
    }
  }
}

run()
