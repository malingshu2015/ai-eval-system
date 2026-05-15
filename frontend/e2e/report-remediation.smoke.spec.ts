import { expect, test } from '@playwright/test'

const username = process.env.E2E_USERNAME || 'admin'
const password = process.env.E2E_PASSWORD || 'admin123'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByPlaceholder('用户名').fill(username)
  await page.getByPlaceholder('密码').fill(password)
  await page.getByTestId('login-submit').click()
  await expect(page).toHaveURL(/\/dashboard/)
}

test('报告发现可以转入整改并在整改详情关闭', async ({ page }) => {
  await login(page)

  const reportId = `e2e-report-${Date.now()}`
  const findingId = `e2e-finding-${Date.now()}`
  const reportName = 'E2E Web 渗透报告闭环验收'
  const findingTitle = '管理接口暴露'

  await page.evaluate(
    ({ reportId, findingId, reportName, findingTitle }) => {
      const now = new Date().toLocaleString()
      const report = {
        id: reportId,
        name: reportName,
        session: 'E2E 渗透任务',
        type: 'pentest',
        reportTemplate: 'web-pentest',
        target: 'https://e2e.example.test',
        model: 'e2e-model',
        agents: ['侦察顾问', '审核官'],
        date: now,
        generatedAt: now,
        critical: 0,
        high: 1,
        medium: 0,
        passRate: 72,
        content: '# E2E 报告\n\n核心发现已结构化。',
        findings: [],
        structuredFindings: [
          {
            id: findingId,
            taskId: reportId,
            title: findingTitle,
            description: '公网可访问的管理接口缺少访问控制。',
            severity: 'high',
            category: 'web-pentest',
            source: 'tool',
            affectedAsset: 'https://e2e.example.test/admin',
            evidenceStatus: 'verified',
            reviewStatus: 'verified',
            remediationAdvice: '限制管理入口来源，并补充访问控制和复测证据。',
            createdAt: now,
          },
        ],
        evidenceItems: [
          {
            id: `evidence-${findingId}`,
            findingId,
            type: 'command_output',
            sourceTool: 'e2e',
            summary: '管理接口返回 200',
            rawContent: 'GET /admin HTTP/1.1 -> 200 OK',
            confidence: 'high',
            collectedAt: now,
          },
        ],
        reviewResult: {
          id: `review-${reportId}`,
          taskId: reportId,
          reviewer: 'audit-agent',
          overallConfidence: 'high',
          verifiedFindingIds: [findingId],
          needsReviewFindingIds: [],
          rejectedFindingIds: [],
          evidenceGaps: [],
          conclusion: '审核官确认该发现具备证据，可转入整改。',
          createdAt: now,
        },
        dataSource: 'tool',
        reportVersion: 1,
      }

      window.localStorage.setItem('ai-eval-pentest-reports', JSON.stringify([report]))
      window.localStorage.setItem('ai-eval-remediation-tasks', JSON.stringify([]))
    },
    { reportId, findingId, reportName, findingTitle },
  )

  await page.goto(`/reports/${reportId}`)
  const reportDetail = page.getByTestId('report-detail')
  await expect(reportDetail).toBeVisible()
  await expect(reportDetail.getByRole('heading', { name: reportName, level: 1 })).toBeVisible()
  await page.getByTestId('create-remediation-button').first().click()

  const readRemediationId = () => page.evaluate((findingId) => {
      const raw = window.localStorage.getItem('ai-eval-remediation-tasks')
      const tasks = raw ? JSON.parse(raw) : []
      return tasks.find((task: { findingId: string }) => task.findingId === findingId)?.id as string | undefined
    }, findingId)

  await expect.poll(readRemediationId).toBeTruthy()
  const remediationId = await readRemediationId()
  expect(remediationId).toBeTruthy()

  await page.goto(`/remediations/${remediationId}`)
  await expect(page.getByTestId('remediation-detail')).toBeVisible()
  await expect(page.getByText(findingTitle)).toBeVisible()

  await page.getByTestId('remediation-status-select').click()
  await page.getByTitle('已关闭').click()
  await page.getByTestId('retest-result-input').fill('E2E 复测通过：管理入口已限制来源。')
  await page.getByTestId('save-remediation-button').click()
  await expect(page).toHaveURL(/\/remediations$/)

  const closedTask = await page.evaluate((remediationId) => {
    const raw = window.localStorage.getItem('ai-eval-remediation-tasks')
    const tasks = raw ? JSON.parse(raw) : []
    return tasks.find((task: { id: string }) => task.id === remediationId)
  }, remediationId)
  expect(closedTask.status).toBe('closed')
  expect(closedTask.retestResult).toContain('E2E 复测通过')
})
