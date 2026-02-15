import { chromium } from 'playwright';

async function testLogin() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture ALL network requests
  const networkLog: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('supabase') || request.url().includes('auth') || request.url().includes('login')) {
      networkLog.push(`>> ${request.method()} ${request.url()}`);
    }
  });
  page.on('response', (response) => {
    if (response.url().includes('supabase') || response.url().includes('auth') || response.url().includes('login')) {
      networkLog.push(`<< ${response.status()} ${response.url()}`);
    }
  });

  // Capture console logs
  const consoleLogs: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('Auth') || text.includes('auth') || text.includes('Login') || text.includes('login')
        || text.includes('Error') || text.includes('error') || text.includes('redirect') || text.includes('Redirect')
        || text.includes('Supabase') || text.includes('supabase') || text.includes('session')
        || text.includes('[Middleware]') || text.includes('onSubmit')) {
      consoleLogs.push(`[${msg.type()}] ${text}`);
    }
  });

  // Track page navigations
  const navigations: string[] = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      navigations.push(`NAV -> ${frame.url()}`);
    }
  });

  try {
    console.log('=== Step 1: Navigate to login page ===');
    await page.goto('http://localhost:3000/en/login', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('URL:', page.url());
    await page.screenshot({ path: '/tmp/login-01-initial.png', fullPage: true });

    // Find form elements
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const submitButton = await page.$('button[type="submit"]');

    console.log('Email:', !!emailInput, 'Password:', !!passwordInput, 'Submit:', !!submitButton);

    if (!emailInput || !passwordInput || !submitButton) {
      console.error('Form elements not found!');
      const bodyText = await page.innerText('body');
      console.log('Page text:', bodyText.substring(0, 2000));
      return;
    }

    console.log('\n=== Step 2: Fill credentials ===');
    await emailInput.fill('jynschultzemelling@gmail.com');
    await passwordInput.fill('GS_Toaks#2025!');
    await page.screenshot({ path: '/tmp/login-02-filled.png', fullPage: true });

    console.log('\n=== Step 3: Click submit ===');
    navigations.length = 0; // Reset navigation tracking
    networkLog.length = 0;  // Reset network tracking

    await submitButton.click();

    // Wait for response
    console.log('Waiting for network activity...');
    await page.waitForTimeout(5000);

    console.log('\n=== Step 4: After submit (5s) ===');
    console.log('URL:', page.url());
    await page.screenshot({ path: '/tmp/login-03-after-submit.png', fullPage: true });

    // Check for errors on page
    const errorElements = await page.$$('.text-destructive');
    for (const el of errorElements) {
      const text = await el.textContent();
      if (text?.trim()) console.log('ERROR ON PAGE:', text.trim());
    }

    const toasts = await page.$$('[data-sonner-toast]');
    for (const el of toasts) {
      const text = await el.textContent();
      if (text?.trim()) console.log('TOAST:', text.trim());
    }

    // Wait longer for redirects
    await page.waitForTimeout(5000);
    console.log('\n=== Step 5: Final state (10s) ===');
    console.log('URL:', page.url());
    await page.screenshot({ path: '/tmp/login-04-final.png', fullPage: true });

    // Check cookies
    const cookies = await context.cookies();
    const authCookies = cookies.filter(c => c.name.includes('supabase') || c.name.includes('auth') || c.name.includes('sb-'));
    console.log('\n=== Auth Cookies ===');
    authCookies.forEach(c => console.log(`  ${c.name} = ${c.value.substring(0, 50)}... (domain: ${c.domain})`));

    if (authCookies.length === 0) {
      console.log('  NO AUTH COOKIES FOUND!');
    }

  } catch (error) {
    console.error('Test error:', error);
    await page.screenshot({ path: '/tmp/login-error.png', fullPage: true });
  } finally {
    // Print all collected data
    if (navigations.length > 0) {
      console.log('\n=== Page Navigations ===');
      navigations.forEach(n => console.log(`  ${n}`));
    }

    if (networkLog.length > 0) {
      console.log('\n=== Auth Network Requests ===');
      networkLog.forEach(n => console.log(`  ${n}`));
    }

    if (consoleLogs.length > 0) {
      console.log('\n=== Relevant Console Logs ===');
      consoleLogs.forEach(l => console.log(`  ${l}`));
    }

    await browser.close();
  }
}

testLogin().catch(console.error);
