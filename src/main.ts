import * as core from '@actions/core'
import {PullRequestInfo, getDependabotPullRequests} from './github'
import {createJiraIssue} from './jira'

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

    const dependabotPulls: PullRequestInfo[] = await getDependabotPullRequests({
      repo,
      owner
    })
    for (const pull of dependabotPulls) {
      await createJiraIssue({
        label,
        projectKey,
        issueType,
        ...pull
      })
    }
    core.setOutput(
      'Start dependabot jira issue creation complete success',
      new Date().toTimeString()
    )
  } catch (error) {
    if (error instanceof Error) {
      core.debug(error.message)
      core.setFailed(error.message)
    }
  }
}

run()
