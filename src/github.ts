import {getOctokit} from '@actions/github'

export interface GetPullRequestParams {
  owner: string
  repo: string
}

export interface GetPullRequestByIdParams {
  owner: string
  repo: string
  issueNumber: string
}

export interface PullRequest {
  url: string
  summary: string
  description: string
  repoName: string
  repoUrl: string
  lastUpdatedAt: string
  pullNumber: string
}

interface GetPullRequestByIdResponse {
  id: number
  url: string
  state: string
}

export async function getDependabotOpenPullRequests(
  params: GetPullRequestParams
): Promise<PullRequest[]> {
  const {owner, repo} = params
  const githubApiKey = process.env.GITHUB_API_TOKEN || ''
  const octokit = getOctokit(githubApiKey)
  const dependabotLoginName = 'dependabot[bot]'
  const {data} = await octokit.request(
    'GET /repos/{owner}/{repo}/pulls?state=open',
    {
      owner,
      repo,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  )
  const items = []
  for (const pull of data) {
    if (pull?.user?.login === dependabotLoginName) {
      const item: PullRequest = {
        url: pull.html_url,
        summary: `Dependabot alert - ${repo} - ${pull.title}`,
        description: pull.body,
        repoName: pull.base.repo.name,
        repoUrl: pull.base.repo.html_url.replace('***', owner),
        lastUpdatedAt: pull.updated_at,
        pullNumber: pull.number
      }
      items.push(item)
    }
  }
  return items
}

export async function getPullRequestByIssueId(
  params: GetPullRequestByIdParams
): Promise<GetPullRequestByIdResponse> {
  const {owner, repo, issueNumber} = params
  const githubApiKey = process.env.GITHUB_API_TOKEN || ''
  const octokit = getOctokit(githubApiKey)
  const {data} = await octokit.request(
    'GET /repos/{owner}/{repo}/pulls/{pull_number}',
    {
      owner,
      repo,
      pull_number: Number(issueNumber),
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  )

  return data
}
