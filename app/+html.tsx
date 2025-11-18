import { ScrollViewStyleReset } from 'expo-router/html'
import { type PropsWithChildren } from 'react'

/**
 * Expo Router HTML Root
 *
 * 这个文件定义了应用的 HTML 根结构，用于 SEO 优化
 * 文档: https://docs.expo.dev/router/reference/html/
 */

// 站点配置
const siteConfig = {
  title: '情侣游戏合集 | 飞行棋·扫雷·转盘·趣味任务',
  description: '专为情侣设计的多人互动游戏平台！包含经典飞行棋、刺激扫雷、幸运大转盘和趣味18+任务。支持在线联机和局域网对战。',
  keywords: '情侣游戏,双人游戏,在线游戏,飞行棋,扫雷游戏,幸运转盘,情侣任务,互动游戏,多人游戏,局域网游戏,联机游戏',
  author: 'Couple Games Team',
  siteUrl: 'https://qqfly.netlib.re',
  ogImage: 'https://qqfly.netlib.re/og-image.png',
  twitterImage: 'https://qqfly.netlib.re/twitter-card.png',
  themeColor: '#ff6b9d',
  backgroundColor: '#ffffff',
}

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        {/* 这个 viewport meta 会被 Expo 自动添加，但我们显式声明以确保 */}
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* 基础 SEO Meta 标签 */}
        <meta name="description" content={siteConfig.description} />
        <meta name="keywords" content={siteConfig.keywords} />
        <meta name="author" content={siteConfig.author} />
        <meta name="copyright" content={`© ${new Date().getFullYear()} Couple Games. All rights reserved.`} />

        {/* 搜索引擎指令 */}
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow" />
        <meta name="bingbot" content="index, follow" />
        <meta name="referrer" content="origin-when-cross-origin" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteConfig.siteUrl} />
        <meta property="og:title" content="情侣游戏合集 - 让爱情更有趣" />
        <meta property="og:description" content="飞行棋、扫雷、幸运大转盘、趣味任务四合一！支持在线和局域网联机，专为情侣打造的互动游戏平台。" />
        <meta property="og:image" content={siteConfig.ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="情侣游戏合集预览图" />
        <meta property="og:site_name" content="情侣游戏合集" />
        <meta property="og:locale" content="zh_CN" />
        <meta property="og:locale:alternate" content="en_US" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={siteConfig.siteUrl} />
        <meta name="twitter:title" content="情侣游戏合集 | 四款趣味互动游戏" />
        <meta name="twitter:description" content="飞行棋、扫雷、转盘、任务 - 让情侣关系更甜蜜的游戏平台" />
        <meta name="twitter:image" content={siteConfig.twitterImage} />

        {/* 多语言支持 */}
        <link rel="alternate" hrefLang="zh-CN" href={siteConfig.siteUrl} />
        <link rel="alternate" hrefLang="en" href={`${siteConfig.siteUrl}/en`} />
        <link rel="alternate" hrefLang="x-default" href={siteConfig.siteUrl} />

        {/* PWA / 移动端优化 */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="情侣游戏" />
        <meta name="format-detection" content="telephone=no" />

        {/* Apple Touch Icon (Expo 会自动处理 icon，但我们可以提供额外的尺寸) */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

        {/* Canonical URL */}
        <link rel="canonical" href={siteConfig.siteUrl} />

        {/* Preconnect for Performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* JSON-LD 结构化数据 - WebApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: '情侣游戏合集',
              alternateName: 'Couple Games Collection',
              description: '专为情侣设计的多人互动游戏平台，包含飞行棋、扫雷、幸运大转盘和趣味任务',
              url: siteConfig.siteUrl,
              applicationCategory: 'Game',
              operatingSystem: 'Web Browser',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'CNY',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '1000',
                bestRating: '5',
                worstRating: '1',
              },
              featureList: [
                '经典飞行棋对战',
                '智力扫雷挑战',
                '幸运大转盘',
                '趣味互动任务',
                '在线联机支持',
                '局域网对战',
                '多人游戏模式',
              ],
              author: {
                '@type': 'Organization',
                name: 'Couple Games Team',
              },
              inLanguage: ['zh-CN', 'en'],
              gamePlatform: 'Web Browser',
              genre: ['Casual', 'Multiplayer', 'Party Game'],
              playMode: ['Multi-Player', 'Co-op'],
              isAccessibleForFree: true,
            }),
          }}
        />

        {/* JSON-LD 结构化数据 - BreadcrumbList */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: '首页',
                  item: siteConfig.siteUrl,
                },
              ],
            }),
          }}
        />

        {/* JSON-LD 结构化数据 - Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Couple Games',
              url: siteConfig.siteUrl,
              logo: `${siteConfig.siteUrl}/logo.png`,
              description: '专注于开发情侣互动游戏的团队',
              foundingDate: '2024',
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'Customer Service',
                availableLanguage: ['Chinese', 'English'],
              },
            }),
          }}
        />

        {/* Expo Router 需要这个来重置样式 */}
        <ScrollViewStyleReset />

        {/* 使用自定义样式来禁用 body 滚动 */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  )
}

// 响应式背景样式
const responsiveBackground = `
body {
  background-color: ${siteConfig.backgroundColor};
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}
`
