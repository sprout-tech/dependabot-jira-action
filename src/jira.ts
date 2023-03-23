import * as core from '@actions/core'
import fetch, {HeaderInit, RequestInit, Response} from 'node-fetch'
import {createIssueNumberString} from './actions'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as TurndownService from 'turndown'

interface ApiPostParams {
  url: string
  data: object
}

interface ApiRequestResponse {
  data: object
}

interface ApiRequestSearchResponse {
  issues: object[]
}
interface SearchIssue {
  jql: string
}

export interface CreateIssue {
  label: string
  projectKey: string
  summary: string
  description: string
  issueType: string
  url: string
  repoName: string
  repoUrl: string
  lastUpdatedAt: string
  pullNumber: string
}

function getJiraAuthorizedHeader(): HeaderInit {
  const email = process.env.JIRA_USER_EMAIL
  const token = process.env.JIRA_API_TOKEN
  core.info(`email ${email}`)
  const authorization = Buffer.from(`${email}:${token}`).toString('base64')
  return {
    Authorization: `Basic ${authorization}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
}

export function getJiraApiUrlV3(path = '/'): string {
  const subdomain = process.env.JIRA_SUBDOMAIN
  core.info(`subdomain ${subdomain}`)
  const url = `https://${subdomain}.atlassian.net/rest/api/3${path}`
  return url
}

export function getJiraSearchApiUrl(): string {
  const subdomain = process.env.JIRA_SUBDOMAIN
  const url = `https://${subdomain}.atlassian.net/rest/api/2/search`
  return url
}

async function jiraApiPost(params: ApiPostParams): Promise<ApiRequestResponse> {
  try {
    const {url, data} = params
    const fetchParams: RequestInit = {
      body: JSON.stringify(data),
      headers: getJiraAuthorizedHeader(),
      method: 'POST'
    }
    const response: Response = await fetch(url, fetchParams)
    if (response.status === 201) {
      const responseData = await response.json()
      return {data: responseData}
    } else {
      const error = await response.json()
      const errors = Object.values(error.errors)
      const message = errors.join(',')
      throw Error(message)
    }
  } catch (e) {
    throw new Error('Post error')
  }
}

export async function jiraApiSearch({
  jql
}: SearchIssue): Promise<ApiRequestSearchResponse> {
  try {
    const getUrl = `${getJiraSearchApiUrl()}?jql=${encodeURIComponent(jql)}`
    core.info(`jql ${jql}`)
    const requestParams: RequestInit = {
      method: 'GET',
      headers: getJiraAuthorizedHeader()
    }
    const response = await fetch(getUrl, requestParams)
    if (response.status === 200) {
      return await response.json()
    } else {
      const error = await response.json()
      const errors = Object.values(error.errorMessages)
      const message = errors.join(',')
      throw Error(message)
    }
  } catch (e) {
    core.error('Error getting the existing issue')
    throw new Error('Error getting the existing issue')
  }
}

export async function createJiraIssue({
  label,
  projectKey,
  summary,
  description,
  issueType = 'Bug',
  repoName,
  repoUrl,
  url,
  lastUpdatedAt,
  pullNumber
}: CreateIssue): Promise<ApiRequestResponse> {
  core.debug(`Checking to create jira issue for pull`)
  const jql = `summary~"${summary}" AND description~=${createIssueNumberString(
    pullNumber
  )} AND labels="${label}" AND project=${projectKey} AND issuetype=${issueType}`
  const existingIssuesResponse = await jiraApiSearch({
    jql
  })
  if (
    existingIssuesResponse &&
    existingIssuesResponse.issues &&
    existingIssuesResponse.issues.length > 0
  ) {
    core.debug(`Has existing issue skipping`)
    return {data: existingIssuesResponse.issues[0]}
  }
  core.debug(`Did not find exising, trying create`)
  const turndownService = new TurndownService()
  const markdown = turndownService.turndown(description)
  const body = {
    fields: {
      labels: [label],
      project: {
        key: projectKey
      },
      summary,
      description: {
        content: [
          {
            content: [
              {
                text: markdown,
                type: 'text'
              }
            ],
            type: 'paragraph'
          },
          {
            content: [
              {
                text: `Application repo: ${repoName}`,
                type: 'text'
              }
            ],
            type: 'paragraph'
          },
          {
            content: [
              {
                text: `Application url: ${repoUrl}`,
                type: 'text'
              }
            ],
            type: 'paragraph'
          },
          {
            content: [
              {
                text: `Pull request last updated at: ${lastUpdatedAt}`,
                type: 'text'
              }
            ],
            type: 'paragraph'
          },
          {
            content: [
              {
                text: `Pull request url: ${url}`,
                type: 'text'
              }
            ],
            type: 'paragraph'
          },
          {
            content: [
              {
                text: createIssueNumberString(pullNumber),
                type: 'text'
              }
            ],
            type: 'paragraph'
          }
        ],
        type: 'doc',
        version: 1
      },
      issuetype: {
        name: issueType
      }
    },
    update: {}
  }
  const data = await jiraApiPost({
    url: getJiraApiUrlV3('/issue'),
    data: body
  })
  core.debug(`Create issue success`)
  return {data}
}

export async function closeJiraIssue(
  issueId: string,
  transitionName = 'done'
): Promise<ApiRequestResponse> {
  core.debug(`Closing jira issue`)
  core.debug(`issueId ${issueId}`)
  const body = {
    transition: {
      id: -1
    },
    update: {
      comment: [
        {
          add: {
            body: {
              content: [
                {
                  content: [
                    {
                      text: 'Closed by dependabot',
                      type: 'text'
                    }
                  ],
                  type: 'paragraph'
                }
              ],
              type: 'doc',
              version: 1
            }
          }
        }
      ]
    }
  }

  const transitionsResponse = await fetch(
    getJiraApiUrlV3(`/issue/${issueId}/transitions`),
    {
      method: 'GET',
      headers: getJiraAuthorizedHeader()
    }
  )
  if (transitionsResponse.status === 200) {
    const transitionsData = await transitionsResponse.json()
    const transition = transitionsData.transitions.find(
      (item: {name: string}) => {
        if (item.name.toLowerCase() === transitionName.toLowerCase()) {
          return item
        }
      }
    )
    body.transition.id = transition.id
    const updateIssueResponse = await fetch(
      getJiraApiUrlV3(`/issue/${issueId}/transitions`),
      {
        body: JSON.stringify(body),
        headers: getJiraAuthorizedHeader(),
        method: 'POST'
      }
    )
    if (updateIssueResponse.status === 204) {
      return {
        data: {
          success: true
        }
      }
    } else {
      try {
        const error = await updateIssueResponse.json()
        core.error(error)
      } catch (e) {
        core.error('error in updateIssueResponse.json()')
      }
      throw new Error('Failed to update issue')
    }
  } else {
    try {
      const error = await transitionsResponse.json()
      core.error(error)
    } catch (e) {
      core.error('error in transitionsResponse.json()')
    }
    throw new Error('Failed get transition id')
  }
}
