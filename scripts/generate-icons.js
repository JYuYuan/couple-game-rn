const fs = require('fs');
const { execSync } = require('child_process');

// 检查是否安装了 ImageMagick 或其他转换工具
function checkImageMagick() {
  try {
    execSync('convert -version', { stdio: 'pipe' });
    return 'convert';
  } catch {
    try {
      execSync('magick -version', { stdio: 'pipe' });
      return 'magick';
    } catch {
      return null;
    }
  }
}

// 图标配置
const iconConfigs = [
  {
    name: 'icon.png',
    size: 1024,
    description: '主应用图标'
  },
  {
    name: 'android-icon-foreground.png',
    size: 432,
    description: 'Android 自适应图标前景'
  },
  {
    name: 'android-icon-background.png',
    size: 432,
    description: 'Android 自适应图标背景 (纯色)',
    isBackground: true
  },
  {
    name: 'android-icon-monochrome.png',
    size: 432,
    description: 'Android 单色图标',
    isMonochrome: true
  },
  {
    name: 'splash-icon.png',
    size: 200,
    description: '启动屏图标'
  },
  {
    name: 'favicon.png',
    size: 32,
    description: '网页图标'
  }
];

async function generateIcons() {
  const converter = checkImageMagick();
  const svgPath = './assets/images/gamepad-icon.svg';

  if (!fs.existsSync(svgPath)) {
    console.error('❌ SVG 文件不存在:', svgPath);
    return;
  }

  if (!converter) {
    console.log('⚠️  未检测到 ImageMagick，请手动转换图标:');
    console.log('\n你可以使用以下在线工具转换 SVG 到 PNG:');
    console.log('1. https://convertio.co/svg-png/');
    console.log('2. https://svgtopng.com/');
    console.log('3. https://cloudconvert.com/svg-to-png');
    console.log('\n或安装 ImageMagick: brew install imagemagick');

    console.log('\n需要生成的图标尺寸:');
    iconConfigs.forEach(config => {
      console.log(`- ${config.name}: ${config.size}x${config.size}px (${config.description})`);
    });
    return;
  }

  console.log('🎮 开始生成游戏手柄图标...');

  for (const config of iconConfigs) {
    try {
      const outputPath = `./assets/images/${config.name}`;

      if (config.isBackground) {
        // 生成纯色背景
        const cmd = `${converter} -size ${config.size}x${config.size} "gradient:white-#6366f1-#8b5cf6" "${outputPath}"`;
        execSync(cmd);
      } else if (config.isMonochrome) {
        // 生成单色版本
        const cmd = `${converter} -density 300 "${svgPath}" -colorspace Gray -resize ${config.size}x${config.size} "${outputPath}"`;
        execSync(cmd);
      } else {
        // 生成普通彩色图标
        const cmd = `${converter} -density 300 -background transparent "${svgPath}" -resize ${config.size}x${config.size} "${outputPath}"`;
        execSync(cmd);
      }

      console.log(`✅ 已生成 ${config.name} (${config.size}x${config.size})`);
    } catch (error) {
      console.error(`❌ 生成 ${config.name} 失败:`, error.message);
    }
  }

  console.log('\n🎉 图标生成完成！');
  console.log('\n如果需要调整图标样式，请编辑 assets/images/gamepad-icon.svg 文件');
}

// 如果直接运行此脚本
if (require.main === module) {
  generateIcons().catch(console.error);
}

module.exports = { generateIcons, iconConfigs };