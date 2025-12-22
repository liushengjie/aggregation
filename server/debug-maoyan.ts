import { chromium } from 'playwright';

async function debugMaoyan() {
  const browser = await chromium.launch({ headless: true });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'zh-CN',
  });
  
  const page = await context.newPage();
  
  console.log('\n=== Testing piaofang dashboard (movie) ===');
  try {
    await page.goto('https://piaofang.maoyan.com/dashboard', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    await page.waitForTimeout(3000);
    
    // 获取表格结构
    const tableStructure = await page.evaluate(() => {
      const result: any = {
        headers: [],
        rows: [],
      };
      
      // 获取表头
      document.querySelectorAll('.dashboard-table th, table th').forEach(th => {
        result.headers.push(th.textContent?.trim());
      });
      
      // 获取前5行数据
      document.querySelectorAll('.dashboard-table tbody tr, table tbody tr').forEach((row, i) => {
        if (i >= 5) return;
        
        const cells: string[] = [];
        row.querySelectorAll('td').forEach(td => {
          cells.push(td.textContent?.trim() || '');
        });
        result.rows.push(cells);
      });
      
      return result;
    });
    
    console.log('Headers:', tableStructure.headers);
    console.log('Rows:', tableStructure.rows);
    
  } catch (e) {
    console.error('Error:', e);
  }
  
  console.log('\n=== Debug complete ===');
  await browser.close();
}

debugMaoyan().catch(console.error);
