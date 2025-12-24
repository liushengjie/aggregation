/**
 * SVG 转 PNG 转换脚本
 * 需要先安装: npm install --save-dev sharp
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = {
  'logo.svg': [
    { size: 400, name: 'logo-400.png' },
    { size: 800, name: 'logo-800.png' },
    { size: 200, name: 'logo-200.png' }
  ],
  'logo-simple.svg': [
    { size: 240, name: 'logo-simple-240.png' },
    { size: 480, name: 'logo-simple-480.png' },
    { size: 120, name: 'logo-simple-120.png' }
  ],
  'logo-icon.svg': [
    { size: 128, name: 'logo-icon-128.png' },
    { size: 256, name: 'logo-icon-256.png' },
    { size: 64, name: 'logo-icon-64.png' }
  ]
};

async function convertSvgToPng() {
  const baseDir = __dirname;
  
  console.log('开始转换 SVG 到 PNG...\n');
  
  for (const [svgFile, outputSizes] of Object.entries(sizes)) {
    const svgPath = path.join(baseDir, svgFile);
    
    // 检查 SVG 文件是否存在
    if (!fs.existsSync(svgPath)) {
      console.log(`⚠️  跳过: ${svgFile} 不存在`);
      continue;
    }
    
    console.log(`处理: ${svgFile}`);
    
    for (const { size, name } of outputSizes) {
      try {
        const outputPath = path.join(baseDir, name);
        await sharp(svgPath)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toFile(outputPath);
        
        console.log(`  ✅ 生成: ${name} (${size}x${size})`);
      } catch (error) {
        console.error(`  ❌ 错误: ${name} - ${error.message}`);
      }
    }
    
    console.log('');
  }
  
  console.log('转换完成！');
}

// 运行转换
convertSvgToPng().catch(console.error);

