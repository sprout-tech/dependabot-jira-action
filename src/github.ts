import {getOctokit} from '@actions/github'

export interface GetPullRequestParams {
  apiToken: string
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
  const {apiToken, owner, repo} = params
  const octokit = getOctokit(apiToken)
  const dependabotLoginName = 'dependabot[bot]'
  const pulls: unknown = await octokit.request(
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
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  for (const pull of pulls) {
    if (pull?.user?.login === dependabotLoginName) {
      const item: PullRequestInfo = {
        url: pull.html_url,
        summary: `Dependabot alert - ${repo} - ${pull.title}`,
        description: pull.body,
        repoName: pull.repo.name,
        repoUrl: pull.repo.html_url,
        lastUpdatedAt: pull.updated_at
      }
      items.push(item)
    }
  }
  return items
}
