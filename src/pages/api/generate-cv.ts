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

    await page.setViewport({
      width: 900,
      height: 1600,
      deviceScaleFactor: 1
    });
    
    await page.goto(targetUrl, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('print');

    // INJECT STYLES: Scaling and visibility fixes
    await page.addStyleTag({
      content: `
        .download-btn-container, .download-btn, nav, .hide-on-print { 
          display: none !important; 
        }

        .print-footer {
          display: flex !important;
          justify-content: center !important;
          width: 100% !important;
          margin-top: auto !important;
        }

        /* Remove browser margins to prevent shifting */
        /* And center content */
        body, html { 
          background: white !important; 
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          display: flex !important;
          justify-content: center;
          overflow: hidden;
        }
        
        .cv-paper {
          box-shadow: none !important;
          border: none !important;
          margin: 0 !important;
          padding: 30px !important; /* Real margin */
          width: 100% !important;
          max-width: none !important;
          min-height: 100% !important;
          
          /* Downsize content */
          zoom: 0.9; 
          
          display: flex;
          flex-direction: column;
          box-sizing: border-box; /* Padding dont affect total width/height */
        }
      `
    });

    // A4 standard 210 mm x 297 mm
    const pdfBuffer = await page.pdf({
      width: '210mm',
      height: '355mm',
      printBackground: true,
      displayHeaderFooter: false,
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
      }
    });

    const buffer = Buffer.from(pdfBuffer);
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 
          `attachment; filename="alexandre-borrazas-cv-${lang}.pdf"`
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response('Error', { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
};