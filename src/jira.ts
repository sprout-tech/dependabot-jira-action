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
  issueId: string
): Promise<ApiRequestResponse> {
  core.debug(`Checking to create jira issue for pull`)
  const body = {
    fields: {
      resolution: {
        name: 'Done'
      }
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
  const data = await jiraApiPost({
    url: getJiraApiUrlV3(`/issue/${issueId}/transitions`),
    data: body
  })
  core.debug(`Create issue success`)
  return {data}
}
