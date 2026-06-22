import { test, expect } from '@playwright/test';

/**
 * E2E check for the admin-scheduled agent<->MSME meeting feature.
 * Requires nestjs-backend + msme-scheme-frontend dev servers running, and the
 * seed data produced by `nestjs-backend/scripts/playwright-seed.js` (see env
 * vars below, copied from that script's JSON output).
 */
const API_BASE_URL = process.env.E2E_API_BASE_URL || 'http://localhost:3001';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD!;
const AGENT_ID = process.env.E2E_AGENT_ID!;
const MSME_USER_ID = process.env.E2E_MSME_USER_ID!;
const CASE_ID = process.env.E2E_CASE_ID!;

function inFutureDateTimeLocal(minutesFromNow: number) {
  const d = new Date(Date.now() + minutesFromNow * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

test('admin can schedule, reschedule, cancel and complete a meeting; MSME sees it appear/disappear', async ({ page, request }) => {
  // ── Admin login ────────────────────────────────────────────────────────────
  await test.step('admin logs in', async () => {
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/admin/dashboard**', { timeout: 15000 });
  });

  const adminToken = await page.evaluate(() => localStorage.getItem('admin_token'));
  expect(adminToken).toBeTruthy();

  // ── Pre-condition: assign the seeded test agent via the real API (not the
  // focus of this test, but required before a meeting can be scheduled) ─────
  await test.step('assign agent to the test case', async () => {
    const res = await request.put(`${API_BASE_URL}/api/cases/${CASE_ID}/assign`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { agentId: Number(AGENT_ID) },
    });
    expect(res.ok()).toBeTruthy();
  });

  await page.goto(`/admin/dashboard/cases/${CASE_ID}`);
  await expect(page.getByText('Playwright Test Agent')).toBeVisible();

  const dialog = page.locator('[role="dialog"]');

  // ── Schedule ───────────────────────────────────────────────────────────────
  await test.step('admin schedules a meeting', async () => {
    await page.getByRole('button', { name: 'Schedule Meeting' }).click();
    await dialog.locator('#meeting-datetime').fill(inFutureDateTimeLocal(60));
    await dialog.locator('#meeting-link').fill('https://meet.google.com/playwright-test');
    await dialog.getByRole('button', { name: 'Schedule', exact: true }).click();
    await expect(page.getByText('Meeting scheduled', { exact: true })).toBeVisible();
  });

  await test.step('MSME sees the upcoming meeting via the API', async () => {
    const res = await request.get(`${API_BASE_URL}/api/cases/msme/${CASE_ID}/meeting?msmeUserId=${MSME_USER_ID}`);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.meeting).toBeTruthy();
    expect(body.meeting.platform).toBe('GOOGLE_MEET');
    expect(body.meeting.status).toBe('SCHEDULED');
  });

  // ── Negative: cannot schedule a second meeting while one is active ────────
  await test.step('scheduling a second meeting while one is active is rejected', async () => {
    const res = await request.post(`${API_BASE_URL}/api/cases/${CASE_ID}/meeting`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        platform: 'ZOOM',
        scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        meetingLink: 'https://zoom.us/test',
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body.message)).toContain('already scheduled');
  });

  // ── Reschedule (postpone) ──────────────────────────────────────────────────
  let reschedRes: any;
  await test.step('admin reschedules the meeting', async () => {
    await page.getByRole('button', { name: 'Reschedule' }).click();
    await dialog.locator('#meeting-datetime').fill(inFutureDateTimeLocal(24 * 60));
    await dialog.getByRole('button', { name: 'Reschedule', exact: true }).click();
    await expect(page.getByText('Meeting rescheduled', { exact: true })).toBeVisible();

    const res = await request.get(`${API_BASE_URL}/api/cases/msme/${CASE_ID}/meeting?msmeUserId=${MSME_USER_ID}`);
    reschedRes = await res.json();
    expect(reschedRes.meeting.status).toBe('SCHEDULED');
  });

  // ── Cancel ─────────────────────────────────────────────────────────────────
  await test.step('admin cancels the meeting', async () => {
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await dialog.getByLabel('Reason (optional)').fill('Playwright test cancellation');
    await dialog.getByRole('button', { name: 'Cancel Meeting' }).click();
    await expect(page.getByText('Meeting cancelled', { exact: true })).toBeVisible();
    await expect(page.getByText('No meeting scheduled')).toBeVisible();
  });

  await test.step('MSME no longer sees a meeting after cancellation', async () => {
    const res = await request.get(`${API_BASE_URL}/api/cases/msme/${CASE_ID}/meeting?msmeUserId=${MSME_USER_ID}`);
    const body = await res.json();
    expect(body.meeting).toBeFalsy();
  });

  // ── Schedule again, then mark as done ──────────────────────────────────────
  await test.step('admin schedules a new meeting and marks it done', async () => {
    await page.getByRole('button', { name: 'Schedule Meeting' }).click();
    await dialog.locator('#meeting-datetime').fill(inFutureDateTimeLocal(60));
    await dialog.locator('#meeting-link').fill('https://meet.google.com/playwright-test-2');
    await dialog.getByRole('button', { name: 'Schedule', exact: true }).click();
    await expect(page.getByText('Meeting scheduled', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Mark as Done' }).click();
    await expect(page.getByText('Meeting marked as done', { exact: true })).toBeVisible();
    await expect(page.getByText('No meeting scheduled')).toBeVisible();
  });

  await test.step('MSME no longer sees a meeting after completion', async () => {
    const res = await request.get(`${API_BASE_URL}/api/cases/msme/${CASE_ID}/meeting?msmeUserId=${MSME_USER_ID}`);
    const body = await res.json();
    expect(body.meeting).toBeFalsy();
  });
});
