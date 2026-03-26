import type { APIRoute } from 'astro';
import puppeteer from 'puppeteer';
import type { Browser } from 'puppeteer';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const langParam = url.searchParams.get('lang');
  const lang = langParam === 'es' ? 'es' : 'en';

  const origin = new URL(request.url).origin;
  const targetPath = lang === 'es' ? '/es' : '/';
  const targetUrl = `${origin}${targetPath}`;

  let browser: Browser | undefined;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // We set a height that matches your 'cheat' dimensions
    await page.setViewport({
      width: 900,
      height: 1600,
      deviceScaleFactor: 1
    });
    
    await page.goto(targetUrl, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('print');

    await page.addStyleTag({
      content: `
        .download-btn-container, .download-btn, footer, nav { 
          display: none !important; 
        }
        body, html { 
          background: white !important; 
          margin: 0 !important; 
          padding: 0 !important; 
        }
        .cv-paper {
          box-shadow: none !important;
          border: none !important;
          margin: 0 !important;
          width: 100% !important;
        }
      `
    });

    const pdfBuffer = await page.pdf({
      width: '235mm',
      height: '350mm',
      printBackground: true,
      margin: {
        top: '5mm',
        right: '5mm',
        bottom: '5mm',
        left: '5mm'
      }
    });

    // Convert Uint8Array to Buffer for Response
    const buffer = Buffer.from(pdfBuffer);
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="alexandre-borrazas-cv-${lang}.pdf"`
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);

    return new Response('Cannot generate PDF at this time.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
