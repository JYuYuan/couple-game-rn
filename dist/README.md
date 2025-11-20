# Public 文件夹 - SEO 资源说明

这个文件夹包含了所有需要公开访问的静态资源，包括 SEO 优化所需的文件。

## 📁 当前文件

✅ `favicon.png` - 网站图标（已存在）
✅ `manifest.json` - PWA 配置文件（已存在）
✅ `robots.txt` - 搜索引擎爬虫配置（已存在）
✅ `sitemap.xml` - 网站地图（已存在）

## 🖼️ 需要添加的 SEO 图片资源

为了完整的 SEO 优化，请添加以下图片到 `public/` 文件夹：

### 1. **Open Graph 图片** (必需)
- 文件名: `og-image.png`
- 尺寸: **1200 x 630 像素**
- 用途: 在 Facebook、LinkedIn 等社交媒体分享时显示
- 格式: PNG 或 JPG
- 内容建议: 应用的主视觉图，包含标题和简短描述

### 2. **Twitter 卡片图片** (必需)
- 文件名: `twitter-card.png`
- 尺寸: **1200 x 628 像素** (或 800 x 418)
- 用途: 在 Twitter 分享时显示
- 格式: PNG 或 JPG
- 内容建议: 与 og-image 类似，但可以针对 Twitter 优化

### 3. **网站 Logo** (推荐)
- 文件名: `logo.png`
- 尺寸: **512 x 512 像素** (正方形)
- 用途: 结构化数据中的组织 logo
- 格式: PNG (背景透明)
- 内容建议: 应用的主 logo，背景透明

### 4. **Apple Touch Icon** (推荐)
- 文件名: `apple-touch-icon.png`
- 尺寸: **180 x 180 像素**
- 用途: iOS 设备添加到主屏幕时的图标
- 格式: PNG
- 内容建议: 简化版的应用图标，确保在小尺寸下清晰可见

## 🎨 快速创建图片的方法

### 方法 1: 使用现有的 assets 图标
如果你的 `assets/images/icon.png` 已经是高质量图片，可以：

```bash
# 复制并重命名现有图标（需要调整尺寸）
cp assets/images/icon.png public/logo.png

# 如果已经有合适尺寸的图片，可以直接复制
cp assets/images/icon.png public/apple-touch-icon.png
```

### 方法 2: 使用在线工具
- [Canva](https://www.canva.com/) - 免费设计工具，有现成模板
- [Figma](https://www.figma.com/) - 专业设计工具
- [OG Image Generator](https://og-image.vercel.app/) - Open Graph 图片生成器

### 方法 3: 使用 AI 生成
- [DALL-E](https://openai.com/dall-e-2)
- [Midjourney](https://www.midjourney.com/)
- [Stable Diffusion](https://stablediffusionweb.com/)

## 🔄 临时占位图

如果你暂时没有设计好的图片，可以先使用占位图：

```bash
# 创建简单的占位图（需要 ImageMagick）
# macOS 安装: brew install imagemagick

# OG Image (1200x630)
convert -size 1200x630 xc:#ff6b9d \
  -font Arial -pointsize 60 -fill white \
  -gravity center -annotate +0+0 "情侣游戏合集" \
  public/og-image.png

# Twitter Card (1200x628)
cp public/og-image.png public/twitter-card.png

# Logo (512x512)
convert -size 512x512 xc:none \
  -font Arial -pointsize 80 -fill #ff6b9d \
  -gravity center -annotate +0+0 "QQ" \
  public/logo.png

# Apple Touch Icon (180x180)
convert public/logo.png -resize 180x180 public/apple-touch-icon.png
```

## ✅ 验证清单

添加图片后，确保：

- [ ] 所有图片文件都在 `public/` 文件夹中
- [ ] 图片尺寸符合推荐规格
- [ ] 图片文件大小合理（一般 < 500KB）
- [ ] OG 图片在社交媒体预览中显示正常
- [ ] Logo 有透明背景（PNG 格式）
- [ ] 所有图片在高分辨率设备上清晰

## 📚 相关链接

- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards Guide](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Schema.org - Organization](https://schema.org/Organization)
- [Apple Developer - Web Icons](https://developer.apple.com/design/human-interface-guidelines/foundations/app-icons/)
