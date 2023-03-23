import * as process from 'process'
import {expect, test} from '@jest/globals'
import {getJiraApiUrlV3, getJiraSearchApiUrl, htmlToMarkdown} from '../src/jira'

test('test create jira api url', async () => {
  const subdomain = 'test-domain'
  const path = '/tester'
  process.env['JIRA_SUBDOMAIN'] = subdomain
  expect(getJiraApiUrlV3(path)).toEqual(
    `https://${subdomain}.atlassian.net/rest/api/3${path}`
  )
})

test('test create jira search url', async () => {
  const subdomain = 'test-domain'
  process.env['JIRA_SUBDOMAIN'] = subdomain
  expect(getJiraSearchApiUrl()).toEqual(
    `https://${subdomain}.atlassian.net/rest/api/2/search`
  )
})

test('test html to markdown', async () => {
  const html = '<h1>Hello world!</h1>'
  const markdown = htmlToMarkdown(html)
  expect(markdown).toEqual('Hello world!\n' + '============')
})
