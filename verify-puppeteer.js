const puppeteer = require('puppeteer');

async function verifyPuppeteer() {
  console.log('Verifying Puppeteer...');
  console.log('Puppeteer version:', puppeteer.version);
  console.log('PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);
  console.log('PUPPETEER_SKIP_CHROMIUM_DOWNLOAD:', process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD);
  
  let browser = null;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
    });
    
    console.log('Browser launched successfully!');
    const page = await browser.newPage();
    await page.goto('https://example.com');
    const title = await page.title();
    console.log('Page title:', title);
    
    console.log('✅ Puppeteer is working correctly!');
  } catch (error) {
    console.error('❌ Error verifying Puppeteer:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

verifyPuppeteer(); 