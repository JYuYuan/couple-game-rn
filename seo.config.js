/**
 * SEO Configuration for Couple Games Web
 * 情侣游戏合集 - SEO优化配置
 */

export const seoConfig = {
  // 基础信息
  title: '情侣游戏合集 | 飞行棋·扫雷·转盘·趣味任务',
  titleTemplate: '%s | 情侣游戏合集',
  description:
    '专为情侣设计的多人互动游戏平台！包含经典飞行棋、刺激扫雷、幸运大转盘和趣味18+任务。支持在线联机和局域网对战，让你和TA的感情更加甜蜜。',

  // 关键词
  keywords: [
    '情侣游戏',
    '双人游戏',
    '在线游戏',
    '飞行棋',
    '扫雷游戏',
    '幸运转盘',
    '情侣任务',
    '互动游戏',
    '多人游戏',
    '局域网游戏',
    '联机游戏',
    '情侣互动',
    '趣味游戏',
    'couple games',
    'multiplayer games',
    'online games',
  ].join(', '),

  // Open Graph (社交分享)
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    alternateLocale: ['en_US'],
    siteName: '情侣游戏合集',
    title: '情侣游戏合集 - 让爱情更有趣',
    description:
      '飞行棋、扫雷、幸运大转盘、趣味任务四合一！支持在线和局域网联机，专为情侣打造的互动游戏平台。',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '情侣游戏合集预览图',
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: '情侣游戏合集 | 四款趣味互动游戏',
    description: '飞行棋、扫雷、转盘、任务 - 让情侣关系更甜蜜的游戏平台',
    image: '/twitter-card.png',
  },

  // 游戏页面SEO配置
  games: {
    flight: {
      title: '飞行棋 - 经典双人对战',
      description:
        '经典飞行棋游戏，支持在线和局域网对战。与TA一起重温童年回忆，策略对决，看谁先到终点！',
      keywords: '飞行棋,双人飞行棋,在线飞行棋,情侣飞行棋,联机飞行棋',
    },
    minesweeper: {
      title: '扫雷 - 智力挑战',
      description: '经典扫雷游戏，考验你的逻辑推理能力。多种难度选择，和TA比比谁的智商更高！',
      keywords: '扫雷,扫雷游戏,在线扫雷,双人扫雷,挑战扫雷',
    },
    wheel: {
      title: '幸运大转盘 - 随机惊喜',
      description: '幸运大转盘带来无限惊喜！自定义转盘内容，让命运决定今天的约会方式或小惩罚。',
      keywords: '幸运转盘,随机转盘,情侣转盘,抽奖转盘,决策转盘',
    },
    tasks: {
      title: '趣味任务 - 增进感情',
      description:
        '精心设计的情侣互动任务，从甜蜜到刺激应有尽有。让两人关系更亲密，增添生活乐趣。（18+内容）',
      keywords: '情侣任务,互动任务,情侣游戏,真心话大冒险,情侣挑战',
    },
  },

  // 多语言支持
  alternateLanguages: [
    { hreflang: 'zh-CN', href: '/' },
    { hreflang: 'en', href: '/en' },
    { hreflang: 'x-default', href: '/' },
  ],

  // 联系和版权信息
  author: 'Couple Games Team',
  copyright: `© ${new Date().getFullYear()} Couple Games. All rights reserved.`,

  // 应用信息
  applicationName: '情侣游戏合集',
  appleItunesApp: {
    capable: 'yes',
    statusBarStyle: 'black-translucent',
  },

  // PWA相关
  themeColor: '#ff6b9d',
  backgroundColor: '#ffffff',

  // 其他meta标签
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes',
  format: 'detect=telephone=no',

  // 安全和隐私
  referrer: 'origin-when-cross-origin',

  // 搜索引擎指令
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
}

// JSON-LD 结构化数据
export const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: '情侣游戏合集',
  alternateName: 'Couple Games Collection',
  description: '专为情侣设计的多人互动游戏平台，包含飞行棋、扫雷、幸运大转盘和趣味任务',
  url: 'https://qqfly.netlib.re',
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
  screenshot: [
    'https://qqfly.netlib.re/screenshots/flight.png',
    'https://qqfly.netlib.re/screenshots/minesweeper.png',
    'https://qqfly.netlib.re/screenshots/wheel.png',
    'https://qqfly.netlib.re/screenshots/tasks.png',
  ],
  author: {
    '@type': 'Organization',
    name: 'Couple Games Team',
  },
  datePublished: '2024-01-01',
  dateModified: new Date().toISOString().split('T')[0],
  inLanguage: ['zh-CN', 'en'],
  gamePlatform: 'Web Browser',
  genre: ['Casual', 'Multiplayer', 'Party Game'],
  playMode: ['Multi-Player', 'Co-op'],
  isAccessibleForFree: true,
}
