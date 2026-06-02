import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });
  
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.toString());
  });

  await page.goto('http://localhost:5173/login');
  
  await page.type('input[type="email"]', 'hello@test.com');
  await page.type('input[type="password"]', '123456');
  await page.click('button[type="submit"]');
  
  await page.waitForNavigation();
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
