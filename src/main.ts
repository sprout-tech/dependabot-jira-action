import * as core from '@actions/core'
import {PullRequestInfo, getDependabotPullRequests} from './github'
import {createJiraIssue} from './jira'

async function run(): Promise<void> {
  try {
    core.setOutput(
      'Start dependabot jira issue creation',
      new Date().toTimeString()
    )
    const label: string = core.getInput('label')
    const projectKey: string = core.getInput('projectKey')
    const issueType: string = core.getInput('issueType')
    const repo: string = core.getInput('githubRepo')
    const owner: string = core.getInput('githubOwner')
    const apiToken: string = core.getInput('githubToken')
    core.debug(`label ${label}`)
    core.debug(`projectKey ${projectKey}`)
    core.debug(`issueType ${issueType}`)

    const dependabotPulls: PullRequestInfo[] = await getDependabotPullRequests({
      apiToken,
      repo,
      owner
    })
    core.debug(`response ${dependabotPulls}`)
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
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
