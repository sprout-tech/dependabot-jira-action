import {getOctokit} from '@actions/github'

export interface GetPullRequestParams {
  owner: string
  repo: string
}

export interface PullRequestInfo {
  url: string
  summary: string
  description: string
  repoName: string
  repoUrl: string
  lastUpdatedAt: string
}

export async function getDependabotPullRequests(
  params: GetPullRequestParams
): Promise<PullRequestInfo[]> {
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
      const item: PullRequestInfo = {
        url: pull.html_url,
        summary: `Dependabot alert - ${repo} - ${pull.title}`,
        description: pull.body,
        repoName: pull.base.repo.name,
        repoUrl: pull.base.repo.html_url,
        lastUpdatedAt: pull.updated_at
      }
      items.push(item)
    }
  }
  return items
}
