/**
 * SEO Hook for Expo Router
 * 动态更新页面 SEO 信息的 Hook
 */

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

interface UseSEOOptions {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
}

/**
 * 动态更新页面 SEO 的 Hook
 * 仅在 Web 平台生效
 *
 * @example
 * ```tsx
 * function GamePage() {
 *   useSEO({
 *     title: '飞行棋 - 经典双人对战',
 *     description: '与TA一起玩飞行棋！',
 *   });
 *
 *   return <View>...</View>;
 * }
 * ```
 */
export function useSEO(options: UseSEOOptions) {
  const { title, description, keywords, image, url } = options;
  const previousTitle = useRef<string>('');

  useEffect(() => {
    // 仅在 Web 平台执行
    if (Platform.OS !== 'web') return;

    // 更新 document title
    if (title && typeof document !== 'undefined') {
      previousTitle.current = document.title;
      document.title = title;
    }

    // 更新 meta 标签
    if (typeof document !== 'undefined') {
      // 更新 description
      if (description) {
        updateMetaTag('name', 'description', description);
        updateMetaTag('property', 'og:description', description);
        updateMetaTag('name', 'twitter:description', description);
      }

      // 更新 keywords
      if (keywords) {
        updateMetaTag('name', 'keywords', keywords);
      }

      // 更新 image
      if (image) {
        updateMetaTag('property', 'og:image', image);
        updateMetaTag('name', 'twitter:image', image);
      }

      // 更新 URL
      if (url) {
        updateMetaTag('property', 'og:url', url);
        updateMetaTag('name', 'twitter:url', url);
        updateLinkTag('canonical', url);
      }

      // 更新 og:title 和 twitter:title
      if (title) {
        updateMetaTag('property', 'og:title', title);
        updateMetaTag('name', 'twitter:title', title);
      }
    }

    // Cleanup: 恢复之前的 title
    return () => {
      if (previousTitle.current && typeof document !== 'undefined') {
        document.title = previousTitle.current;
      }
    };
  }, [title, description, keywords, image, url]);
}

/**
 * 更新或创建 meta 标签
 */
function updateMetaTag(
  attribute: 'name' | 'property',
  attributeValue: string,
  content: string
) {
  if (typeof document === 'undefined') return;

  let element = document.querySelector(
    `meta[${attribute}="${attributeValue}"]`
  ) as HTMLMetaElement;

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, attributeValue);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

/**
 * 更新或创建 link 标签
 */
function updateLinkTag(rel: string, href: string) {
  if (typeof document === 'undefined') return;

  let element = document.querySelector(
    `link[rel="${rel}"]`
  ) as HTMLLinkElement;

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

/**
 * 添加结构化数据 (JSON-LD) 到页面
 */
export function useStructuredData(data: Record<string, any>) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    script.id = 'structured-data-' + Date.now();

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [data]);
}

export default useSEO;
