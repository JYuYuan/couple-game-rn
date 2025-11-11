/**
 * SEO Component for Expo Router
 * 使用 expo-router 的 Head 组件实现 SEO 优化
 */

import { Head } from 'expo-router';
import { seoConfig, structuredData } from '../seo.config';

interface SEOProps {
  /** 页面类型：home | flight | minesweeper | wheel | tasks */
  page?: 'home' | 'flight' | 'minesweeper' | 'wheel' | 'tasks';
  /** 自定义标题 (会覆盖默认配置) */
  title?: string;
  /** 自定义描述 (会覆盖默认配置) */
  description?: string;
  /** 自定义关键词 (会覆盖默认配置) */
  keywords?: string;
  /** 自定义 Open Graph 图片 URL */
  image?: string;
  /** 当前页面的完整 URL */
  url?: string;
  /** 是否包含结构化数据 (JSON-LD) */
  includeStructuredData?: boolean;
}

export function SEO({
  page = 'home',
  title,
  description,
  keywords,
  image,
  url = 'https://qqfly.netlib.re',
  includeStructuredData = true,
}: SEOProps = {}) {
  // 获取页面配置
  const pageConfig = page !== 'home' && seoConfig.games[page]
    ? seoConfig.games[page]
    : seoConfig;

  // 最终使用的值
  const finalTitle = title || pageConfig.title || seoConfig.title;
  const finalDescription = description || pageConfig.description || seoConfig.description;
  const finalKeywords = keywords || pageConfig.keywords || seoConfig.keywords;
  const finalImage = image || `https://qqfly.netlib.re${seoConfig.openGraph.images[0].url}`;

  return (
    <Head>
      {/* 基础 Meta 标签 */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords} />

      {/* 作者和版权 */}
      <meta name="author" content={seoConfig.author} />
      <meta name="copyright" content={seoConfig.copyright} />

      {/* 搜索引擎指令 */}
      <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={seoConfig.openGraph.type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={seoConfig.openGraph.siteName} />
      <meta property="og:locale" content={seoConfig.openGraph.locale} />

      {/* Twitter Card */}
      <meta name="twitter:card" content={seoConfig.twitter.card} />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />

      {/* PWA / 移动端 */}
      <meta name="theme-color" content={seoConfig.themeColor} />
      <meta name="application-name" content={seoConfig.applicationName} />

      {/* Canonical URL */}
      <link rel="canonical" href={url} />

      {/* 结构化数据 (JSON-LD) */}
      {includeStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      )}
    </Head>
  );
}

// 预定义的页面配置，方便快速使用
export const SEOPresets = {
  Home: () => <SEO page="home" />,
  Flight: () => <SEO page="flight" url="https://qqfly.netlib.re/games/flight" />,
  Minesweeper: () => <SEO page="minesweeper" url="https://qqfly.netlib.re/games/minesweeper" />,
  Wheel: () => <SEO page="wheel" url="https://qqfly.netlib.re/games/wheel" />,
  Tasks: () => <SEO page="tasks" url="https://qqfly.netlib.re/games/tasks" />,
};

export default SEO;
