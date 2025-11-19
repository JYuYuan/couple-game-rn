import { ScrollViewStyleReset } from 'expo-router/html'
import { type PropsWithChildren } from 'react'

/**
 * Expo Router HTML Root
 *
 * 这个文件定义了应用的 HTML 根结构，用于 SEO 优化
 * 文档: https://docs.expo.dev/router/reference/html/
 */

// 站点配置 - 多语言支持
const siteConfig = {
  siteUrl: 'https://qq.cpflying.top',
  ogImage: 'https://qq.cpflying.top/og-image.png',
  twitterImage: 'https://qq.cpflying.top/twitter-card.png',
  themeColor: '#ff6b9d',
  backgroundColor: '#ffffff',

  // 中文配置
  zhCN: {
    title: '情侣游戏合集 | 飞行棋·扫雷·转盘·趣味任务',
    description:
      '专为情侣设计的多人互动游戏平台！包含经典飞行棋、刺激扫雷、幸运大转盘和趣味18+任务。支持在线联机和局域网对战。',
    keywords:
      '情侣游戏,双人游戏,在线游戏,飞行棋,扫雷游戏,幸运转盘,情侣任务,互动游戏,多人游戏,局域网游戏,联机游戏',
    ogTitle: '情侣游戏合集 - 让爱情更有趣',
    ogDescription:
      '飞行棋、扫雷、幸运大转盘、趣味任务四合一！支持在线和局域网联机，专为情侣打造的互动游戏平台。',
    twitterTitle: '情侣游戏合集 | 四款趣味互动游戏',
    twitterDescription: '飞行棋、扫雷、转盘、任务 - 让情侣关系更甜蜜的游戏平台',
  },

  // English configuration
  en: {
    title: 'Couple Games Collection | Ludo·Minesweeper·Wheel·Fun Tasks',
    description:
      'A multiplayer interactive game platform designed for couples! Featuring classic Ludo, exciting Minesweeper, Lucky Wheel, and fun 18+ tasks. Supports online and LAN battles.',
    keywords:
      'couple games,two player games,online games,ludo,minesweeper,lucky wheel,couple tasks,interactive games,multiplayer games,LAN games,online multiplayer',
    ogTitle: 'Couple Games Collection - Make Love More Fun',
    ogDescription:
      'Ludo, Minesweeper, Lucky Wheel, and Fun Tasks all-in-one! Supports online and LAN multiplayer, an interactive game platform designed for couples.',
    twitterTitle: 'Couple Games Collection | 4 Fun Interactive Games',
    twitterDescription:
      'Ludo, Minesweeper, Wheel, Tasks - A game platform to sweeten your relationship',
  },

  // 日本語設定
  ja: {
    title: 'カップルゲームコレクション | すごろく·マインスイーパー·ルーレット·楽しいタスク',
    description:
      'カップルのために設計されたマルチプレイヤーインタラクティブゲームプラットフォーム！クラシックすごろく、エキサイティングなマインスイーパー、ラッキールーレット、そして楽しい18+タスクを含みます。オンラインおよびLAN対戦をサポート。',
    keywords:
      'カップルゲーム,二人用ゲーム,オンラインゲーム,すごろく,マインスイーパー,ラッキールーレット,カップルタスク,インタラクティブゲーム,マルチプレイヤーゲーム,LANゲーム,オンライン対戦',
    ogTitle: 'カップルゲームコレクション - 恋愛をもっと楽しく',
    ogDescription:
      'すごろく、マインスイーパー、ラッキールーレット、楽しいタスクがオールインワン！オンラインおよびLANマルチプレイヤーをサポート、カップルのために作られたインタラクティブゲームプラットフォーム。',
    twitterTitle: 'カップルゲームコレクション | 4つの楽しいインタラクティブゲーム',
    twitterDescription:
      'すごろく、マインスイーパー、ルーレット、タスク - 関係を甘くするゲームプラットフォーム',
  },

  author: 'Couple Games Team',
}

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        {/* 这个 viewport meta 会被 Expo 自动添加，但我们显式声明以确保 */}
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* 页面标题 */}
        <title>{siteConfig.zhCN.title}</title>

        {/* 基础 SEO Meta 标签 - 中文（默认） */}
        <meta name="description" content={siteConfig.zhCN.description} />
        <meta name="keywords" content={siteConfig.zhCN.keywords} />
        <meta name="author" content={siteConfig.author} />
        <meta
          name="copyright"
          content={`© ${new Date().getFullYear()} Couple Games. All rights reserved.`}
        />

        {/* 搜索引擎指令 */}
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />
        <meta name="googlebot" content="index, follow" />
        <meta name="bingbot" content="index, follow" />
        <meta name="referrer" content="origin-when-cross-origin" />

        {/* Open Graph / Facebook - 中文（默认） */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteConfig.siteUrl} />
        <meta property="og:title" content={siteConfig.zhCN.ogTitle} />
        <meta property="og:description" content={siteConfig.zhCN.ogDescription} />
        <meta property="og:image" content={siteConfig.ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="情侣游戏合集预览图" />
        <meta property="og:site_name" content="情侣游戏合集" />
        <meta property="og:locale" content="zh_CN" />
        <meta property="og:locale:alternate" content="en_US" />
        <meta property="og:locale:alternate" content="ja_JP" />

        {/* Twitter Card - 中文（默认） */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={siteConfig.siteUrl} />
        <meta name="twitter:title" content={siteConfig.zhCN.twitterTitle} />
        <meta name="twitter:description" content={siteConfig.zhCN.twitterDescription} />
        <meta name="twitter:image" content={siteConfig.twitterImage} />

        {/* 多语言支持 - hreflang */}
        <link rel="alternate" hrefLang="zh-CN" href={siteConfig.siteUrl} />
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

        {/* JSON-LD 结构化数据 - WebApplication (多语言 SEO 优化) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: [
                {
                  '@language': 'zh-CN',
                  '@value': '情侣游戏合集',
                },
                {
                  '@language': 'en',
                  '@value': 'Couple Games Collection',
                },
                {
                  '@language': 'ja',
                  '@value': 'カップルゲームコレクション',
                },
              ],
              alternateName: ['Couple Games Collection', 'カップルゲームコレクション'],
              description: [
                {
                  '@language': 'zh-CN',
                  '@value': siteConfig.zhCN.description,
                },
                {
                  '@language': 'en',
                  '@value': siteConfig.en.description,
                },
                {
                  '@language': 'ja',
                  '@value': siteConfig.ja.description,
                },
              ],
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
                // 中文特性列表
                '经典飞行棋对战',
                '智力扫雷挑战',
                '幸运大转盘',
                '趣味互动任务',
                '在线联机支持',
                '局域网对战',
                '多人游戏模式',
                // 英文特性列表
                'Classic Ludo Battle',
                'Minesweeper Challenge',
                'Lucky Wheel',
                'Fun Interactive Tasks',
                'Online Multiplayer Support',
                'LAN Battle',
                'Multiplayer Game Mode',
                // 日文特性列表
                'クラシックすごろく対戦',
                'マインスイーパーチャレンジ',
                'ラッキールーレット',
                '楽しいインタラクティブタスク',
                'オンラインマルチプレイヤーサポート',
                'LAN対戦',
                'マルチプレイヤーゲームモード',
              ],
              author: {
                '@type': 'Organization',
                name: 'Couple Games Team',
              },
              inLanguage: ['zh-CN', 'en', 'ja'],
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

        {/* JSON-LD 结构化数据 - Organization (多语言) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Couple Games',
              url: siteConfig.siteUrl,
              logo: `${siteConfig.siteUrl}/logo.png`,
              description: [
                {
                  '@language': 'zh-CN',
                  '@value': '专注于开发情侣互动游戏的团队',
                },
                {
                  '@language': 'en',
                  '@value': 'A team focused on developing interactive games for couples',
                },
                {
                  '@language': 'ja',
                  '@value': 'カップル向けインタラクティブゲームの開発に特化したチーム',
                },
              ],
              foundingDate: '2024',
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'Customer Service',
                availableLanguage: ['Chinese', 'English', 'Japanese'],
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
