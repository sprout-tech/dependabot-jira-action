import * as core from '@actions/core'
import fetch, {HeaderInit, RequestInit, Response} from 'node-fetch'
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
  label: string
  projectKey: string
  summary: string
  issueType: string
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
}

function getJiraAuthorizedHeader(): HeaderInit {
  const email = process.env.JIRA_USER_EMAIL
  const token = process.env.JIRA_API_TOKEN
  const authorization = Buffer.from(`${email}:${token}`).toString('base64')
  return {
    Authorization: `Basic ${authorization}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
}

export function getJiraApiUrlV3(path = '/'): string {
  const subdomain = process.env.JIRA_SUBDOMAIN
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

async function jiraApiSearch(
  params: SearchIssue
): Promise<ApiRequestSearchResponse> {
  try {
    const jql = `summary~"${params.summary}" AND labels="${params.label}" AND project=${params.projectKey} AND issuetype=${params.issueType}`
    const getUrl = `${getJiraSearchApiUrl()}?jql=${encodeURIComponent(jql)}`

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
  lastUpdatedAt
}: CreateIssue): Promise<ApiRequestResponse> {
  core.debug(`Checking to create jira issue for pull`)
  const existingIssuesResponse = await jiraApiSearch({
    summary,
    label,
    projectKey,
    issueType
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
                text: description,
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
