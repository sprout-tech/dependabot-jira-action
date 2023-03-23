function getJiraAuthorizedHeader() {
  const email = 'alex@sprouttechlab.com'
  const token =
    'ATATT3xFfGF0l4cNoKhY1Fy8cwYjQkjdhaxdmz5vSLmbFSmIYl_RVYUJtpNquhItglZv6RCxnHdoYcE7HT15kiUxnKlzyGyRFbYSo7oDKOzvGVccM8atLKtJg-MZXK7t6EaR3lXCdT7fZm8PbXGpwsY0PwFOchpZwOlcx9wHBsLikQqNWPUI2dQ=211EBE91'
  console.log(`email ${email}`)
  const authorization = Buffer.from(`${email}:${token}`).toString('base64')
  return {
    Authorization: `Basic ${authorization}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
}
function getJiraApiUrlV3(path = '/') {
  const subdomain = 'sprout-tech'
  console.log(`subdomain ${subdomain}`)
  const url = `https://${subdomain}.atlassian.net/rest/api/3${path}`
  return url
}

async function jiraApiPost(params) {
  try {
    const {url, data} = params
    const fetchParams = {
      body: JSON.stringify(data),
      headers: getJiraAuthorizedHeader(),
      method: 'POST'
    }
    const response = await fetch(url, fetchParams)
    if (response.status === 201) {
      const responseData = await response.json()
      return {data: responseData}
    } else {
      const error = await response.json()
      console.log('error', error)
      const errors = Object.values(error.errors)
      const message = errors.join(',')
      throw Error(message)
    }
  } catch (e) {
    console.log(e)
    throw new Error('Post error')
  }
}
async function jiraApiGet(url) {
  try {
    const requestParams = {
      method: 'GET',
      headers: getJiraAuthorizedHeader()
    }
    const response = await fetch(url, requestParams)
    if (response.status === 200) {
      return await response.json()
    } else {
      const error = await response.json()
      console.log('error', error)
      const errors = Object.values(error.errorMessages)
      const message = errors.join(',')
      throw Error(message)
    }
  } catch (e) {
    throw new Error('Error getting the existing issue')
  }
}

async function closeJiraIssue(issueId, transitionName = 'done') {
  console.log(`Closing jira issue`)
  console.log(`issueId ${issueId}`)
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
    console.log('transitionsResponse', transitionsResponse)
    const transitionsData = await transitionsResponse.json()
    console.log('transitions', transitionsData.transitions)
    const transition = transitionsData.transitions.find(item => {
      console.log('transition', item)
      if (item.name.toLowerCase() === transitionName.toLowerCase()) {
        return item
      }
    })
    body.transition.id = transition.id
    console.log('body', body)
    const updateIssueResponse = await fetch(
      getJiraApiUrlV3(`/issue/${issueId}/transitions`),
      {
        body: JSON.stringify(body),
        headers: getJiraAuthorizedHeader(),
        method: 'POST'
      }
    )
    if (updateIssueResponse.status === 204) {
      return 'Success'
    } else {
      try {
        const error = await updateIssueResponse.json()
        console.error(error)
      } catch (e) {}
      throw new Error('Failed to update issue')
    }
  } else {
    throw new Error('Failed get transition id')
  }
}

closeJiraIssue('TGA-19')
  .then(response => {
    console.log('response', response)
  })
  .catch(e => {
    console.error(e)
  })
