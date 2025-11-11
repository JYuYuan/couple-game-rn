#!/usr/bin/env node

/**
 * Post-build script for Expo Web
 * 构建后处理脚本 - 复制 SEO 文件到 dist 目录
 *
 * Usage: node scripts/post-build.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

console.log('🚀 Starting post-build process...\n');

// 确保 dist 目录存在
if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ Error: dist directory not found!');
  console.error('Please run "npm run build:web" first.');
  process.exit(1);
}

// 需要复制的文件列表
const filesToCopy = [
  { src: 'public/robots.txt', dest: 'dist/robots.txt', name: 'robots.txt' },
  { src: 'public/sitemap.xml', dest: 'dist/sitemap.xml', name: 'sitemap.xml' },
  { src: 'public/manifest.json', dest: 'dist/manifest.json', name: 'manifest.json (if not exists)' },
  { src: 'public/og-image.png', dest: 'dist/og-image.png', name: 'og-image.png' },
  { src: 'public/twitter-card.png', dest: 'dist/twitter-card.png', name: 'twitter-card.png' },
  { src: 'public/apple-touch-icon.png', dest: 'dist/apple-touch-icon.png', name: 'apple-touch-icon.png' },
  { src: 'public/favicon-32x32.png', dest: 'dist/favicon-32x32.png', name: 'favicon-32x32.png' },
  { src: 'public/favicon-16x16.png', dest: 'dist/favicon-16x16.png', name: 'favicon-16x16.png' },
];

let copiedCount = 0;
let skippedCount = 0;

// 复制文件
filesToCopy.forEach(({ src, dest, name }) => {
  const srcPath = path.join(ROOT_DIR, src);
  const destPath = path.join(ROOT_DIR, dest);

  // 对于 manifest.json，如果目标已存在则跳过（Expo 可能已生成）
  if (name.includes('manifest.json') && fs.existsSync(destPath)) {
    console.log(`⏭️  Skipped ${name} (already exists in dist)`);
    skippedCount++;
    return;
  }

  if (fs.existsSync(srcPath)) {
    try {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Copied ${name}`);
      copiedCount++;
    } catch (error) {
      console.error(`❌ Failed to copy ${name}:`, error.message);
    }
  } else {
    console.log(`⚠️  ${name} not found (optional)`);
    skippedCount++;
  }
});

// 创建 .nojekyll 文件
const nojekyllPath = path.join(DIST_DIR, '.nojekyll');
try {
  fs.writeFileSync(nojekyllPath, '');
  console.log('✅ Created .nojekyll file');
  copiedCount++;
} catch (error) {
  console.error('❌ Failed to create .nojekyll:', error.message);
}

// 验证关键文件
console.log('\n📋 Verifying critical SEO files:');
const criticalFiles = [
  'dist/robots.txt',
  'dist/sitemap.xml',
  'dist/index.html',
];

let allCriticalFilesExist = true;
criticalFiles.forEach(file => {
  const filePath = path.join(ROOT_DIR, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file} (${stats.size} bytes)`);
  } else {
    console.log(`❌ ${file} - MISSING!`);
    allCriticalFilesExist = false;
  }
});

// 检查 index.html 中的 SEO meta 标签
console.log('\n🔍 Checking SEO meta tags in index.html:');
const indexPath = path.join(DIST_DIR, 'index.html');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf-8');

  const checks = [
    { name: 'Title tag', regex: /<title>.*情侣游戏.*<\/title>/ },
    { name: 'Description meta', regex: /<meta.*name="description"/ },
    { name: 'Keywords meta', regex: /<meta.*name="keywords"/ },
    { name: 'OG title', regex: /<meta.*property="og:title"/ },
    { name: 'OG image', regex: /<meta.*property="og:image"/ },
    { name: 'JSON-LD', regex: /<script.*type="application\/ld\+json"/ },
  ];

  checks.forEach(({ name, regex }) => {
    if (regex.test(indexContent)) {
      console.log(`✅ ${name}`);
    } else {
      console.log(`⚠️  ${name} - Not found (might be dynamically added)`);
    }
  });
}

// 统计信息
console.log('\n📊 Summary:');
console.log(`   ✅ Copied: ${copiedCount} files`);
console.log(`   ⏭️  Skipped: ${skippedCount} files`);
console.log(`   📁 Output: ${DIST_DIR}`);

if (allCriticalFilesExist) {
  console.log('\n🎉 Post-build completed successfully!');
  console.log('   Ready for deployment to pages branch.');
} else {
  console.log('\n⚠️  Warning: Some critical files are missing!');
  console.log('   Please check the build output.');
  process.exit(1);
}
