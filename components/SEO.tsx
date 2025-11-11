/**
 * SEO Component for Expo Router v6
 *
 * 注意：Expo Router v6 没有 Head 组件
 * 使用纯 JavaScript 方式动态更新 document head (仅 Web)
 */

import { useEffect } from 'react';
import { Platform } from 'react-native';
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

/**
 * SEO 组件 - 使用 useEffect 动态更新 meta 标签
 * 只在 Web 平台生效
 */
export function SEO({
  page = 'home',
  title,
  description,
  keywords,
  image,
  url = 'https://qqfly.netlib.re',
  includeStructuredData = true,
}: SEOProps = {}) {
  useEffect(() => {
    // 只在 Web 平台执行
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    // 获取页面配置
    const pageConfig =
      page !== 'home' && seoConfig.games[page]
        ? seoConfig.games[page]
        : seoConfig;

    // 最终使用的值
    const finalTitle = title || pageConfig.title || seoConfig.title;
    const finalDescription =
      description || pageConfig.description || seoConfig.description;
    const finalKeywords = keywords || pageConfig.keywords || seoConfig.keywords;
    const finalImage =
      image || `https://qqfly.netlib.re${seoConfig.openGraph.images[0].url}`;

    // 更新 document title
    document.title = finalTitle;

    // 更新或创建 meta 标签
    const updateMeta = (attr: string, attrValue: string, content: string) => {
      let element = document.querySelector(
        `meta[${attr}="${attrValue}"]`
      ) as HTMLMetaElement;

      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, attrValue);
        document.head.appendChild(element);
      }

      element.setAttribute('content', content);
    };

    // 基础 Meta 标签
    updateMeta('name', 'description', finalDescription);
    updateMeta('name', 'keywords', finalKeywords);
    updateMeta('name', 'author', seoConfig.author);
    updateMeta('name', 'copyright', seoConfig.copyright);

    // 搜索引擎指令
    updateMeta(
      'name',
      'robots',
      'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
    );

    // Open Graph
    updateMeta('property', 'og:type', seoConfig.openGraph.type);
    updateMeta('property', 'og:url', url);
    updateMeta('property', 'og:title', finalTitle);
    updateMeta('property', 'og:description', finalDescription);
    updateMeta('property', 'og:image', finalImage);
    updateMeta('property', 'og:image:width', '1200');
    updateMeta('property', 'og:image:height', '630');
    updateMeta('property', 'og:site_name', seoConfig.openGraph.siteName);
    updateMeta('property', 'og:locale', seoConfig.openGraph.locale);

    // Twitter Card
    updateMeta('name', 'twitter:card', seoConfig.twitter.card);
    updateMeta('name', 'twitter:url', url);
    updateMeta('name', 'twitter:title', finalTitle);
    updateMeta('name', 'twitter:description', finalDescription);
    updateMeta('name', 'twitter:image', finalImage);

    // PWA
    updateMeta('name', 'theme-color', seoConfig.themeColor);
    updateMeta('name', 'application-name', seoConfig.applicationName);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    // 结构化数据 (JSON-LD)
    if (includeStructuredData) {
      // 移除旧的结构化数据
      const oldScript = document.querySelector('script[data-seo="structured-data"]');
      if (oldScript) {
        oldScript.remove();
      }

      // 添加新的结构化数据
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo', 'structured-data');
      script.text = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

    // Cleanup 函数（可选）
    return () => {
      // 如果需要在组件卸载时清理，可以在这里添加逻辑
    };
  }, [page, title, description, keywords, image, url, includeStructuredData]);

  // 不渲染任何 UI
  return null;
}

// 预定义的页面配置，方便快速使用
export const SEOPresets = {
  Home: () => <SEO page="home" />,
  Flight: () => <SEO page="flight" url="https://qqfly.netlib.re/games/flight" />,
  Minesweeper: () => (
    <SEO page="minesweeper" url="https://qqfly.netlib.re/games/minesweeper" />
  ),
  Wheel: () => <SEO page="wheel" url="https://qqfly.netlib.re/games/wheel" />,
  Tasks: () => <SEO page="tasks" url="https://qqfly.netlib.re/games/tasks" />,
};

export default SEO;
