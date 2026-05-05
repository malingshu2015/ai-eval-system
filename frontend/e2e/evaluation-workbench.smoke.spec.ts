import { expect, test } from '@playwright/test'

const username = process.env.E2E_USERNAME || 'admin'
const password = process.env.E2E_PASSWORD || 'admin123'

type ChecklistTemplate = {
  id: string
  target_type: string
  categories?: Array<{
    items?: Array<{ id: string }>
  }>
}

test('评估工作台核心路径可加载并展示 PoC 结果面板', async ({ page }) => {
  await page.goto('/login')
  await page.getByPlaceholder('用户名').fill(username)
  await page.getByPlaceholder('密码').fill(password)
  await page.getByTestId('login-submit').click()
  await expect(page).toHaveURL(/\/dashboard/)

  const token = await page.evaluate(() => {
    const raw = window.localStorage.getItem('ai-eval-auth')
    if (!raw) return null
    return JSON.parse(raw).state?.token as string | null
  })
  expect(token).toBeTruthy()

  const authHeaders = { Authorization: `Bearer ${token}` }
  const templatesResponse = await page.request.get('/api/v1/checklists', { headers: authHeaders })
  expect(templatesResponse.ok()).toBeTruthy()

  const templates = (await templatesResponse.json()) as ChecklistTemplate[]
  const template = templates.find((item) => item.target_type === 'llm' && item.categories?.[0]?.items?.[0])
    || templates.find((item) => item.categories?.[0]?.items?.[0])
  expect(template, '需要至少一个包含检查项的模板').toBeTruthy()

  const sessionName = `E2E 工作台冒烟验收 ${Date.now()}`
  const createResponse = await page.request.post('/api/v1/evaluations', {
    headers: authHeaders,
    data: {
      name: sessionName,
      target_type: template!.target_type,
      target_url: 'local://e2e-smoke-target',
      target_description: '浏览器 E2E 冒烟验收临时目标 [model:e2e-smoke:latest]',
      template_id: template!.id,
      report_template: 'llm-security',
    },
  })
  expect(createResponse.ok()).toBeTruthy()
  const session = await createResponse.json()

  try {
    await page.goto(`/evaluations/${session.id}`)
    await expect(page.getByTestId('evaluation-workbench')).toBeVisible()
    await expect(page.getByText('未能加载评估数据')).not.toBeVisible()
    await expect(page.getByText(sessionName)).toBeVisible()
    await expect(page.getByTestId('export-report-button')).toBeVisible()

    await page.getByTestId('result-tab').click()
    await expect(page.getByTestId('poc-panel')).toBeVisible()
    await expect(page.getByText('自动化 PoC 执行状态')).toBeVisible()
  } finally {
    await page.request.delete(`/api/v1/evaluations/${session.id}`, { headers: authHeaders })
  }
})
