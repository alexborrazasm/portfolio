import puppeteer from 'puppeteer';
import fs from 'fs';

async function generatePDF() {
  // Launch browser with necessary arguments for CI environments
  const browser = await puppeteer.launch({
    headless: "shell",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport to match the CV design aspect ratio
    await page.setViewport({
      width: 1200,
      height: 2000,
      deviceScaleFactor: 2
    });

    // Navigate to the local preview server started by Astro
    await page.goto('http://localhost:4321/', { waitUntil: 'networkidle0' });
    await page.emulateMediaType('print');

    // INJECT STYLES: Ensure clean PDF output by hiding UI elements and fixing layout
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
          padding: 30px !important;
          width: 100% !important;
          max-width: none !important;
          min-height: 100% !important;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
      `
    });

    // Generate PDF with A4-ish custom dimensions and native scaling
    const pdfBuffer = await page.pdf({
      scale: 0.9,
      width: '210mm',
      height: '355mm',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
      }
    });

    // Ensure the output directory exists within the 'dist' folder
    const dir = './dist/pdfs';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(`${dir}/alexandre-borrazas-en-cv.pdf`, pdfBuffer);
    console.log(`✅ PDF generated successfully: alexandre-borrazas-en-cv.pdf`);

  } catch (error) {
    console.error('❌ Error during PDF generation:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

generatePDF();