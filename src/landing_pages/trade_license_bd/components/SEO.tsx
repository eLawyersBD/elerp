/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: string;
  canonical?: string;
}

export default function SEO({
  title = "Trade License Registration in Bangladesh | E-Lawyers",
  description = "Get your trade license registered, renewed, corrected or cancelled in Bangladesh fast. 100% transparent pricing and online secure portal tracking.",
  keywords = "trade license bangladesh, trade license renewal, dhaka city corporation, trade license fee bangladesh, sole proprietorship trade license, partnership firm registration, company trade license bangladesh",
  ogImage = "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&h=630&q=80",
  ogUrl = typeof window !== 'undefined' ? window.location.href : '',
  ogType = "website",
  canonical = typeof window !== 'undefined' ? window.location.href : ''
}: SEOProps) {

  useEffect(() => {
    // 1. Title
    document.title = title;

    // Helper to find or create a meta tag
    const setMetaTag = (attributeName: string, attributeValue: string, contentValue: string) => {
      let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attributeName, attributeValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', contentValue);
    };

    // Helper to find or create a link tag
    const setLinkTag = (relValue: string, hrefValue: string) => {
      let element = document.querySelector(`link[rel="${relValue}"]`);
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', relValue);
        document.head.appendChild(element);
      }
      element.setAttribute('href', hrefValue);
    };

    // 2. Standard Meta Tags
    setMetaTag('name', 'description', description);
    setMetaTag('name', 'keywords', keywords);
    setMetaTag('name', 'robots', 'index, follow');

    // 3. OpenGraph Tags (Facebook, LinkedIn, Discord, etc.)
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('property', 'og:url', ogUrl || window.location.href);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:site_name', 'E-Lawyers Bangladesh');

    // 4. Twitter Card Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', ogImage);

    // 5. Canonical Link
    if (canonical || typeof window !== 'undefined') {
      setLinkTag('canonical', canonical || window.location.href);
    }

    // Clean up or reset is generally not needed for index-level SEO on single-page-app,
    // but we can restore defaults on unmount if requested.
  }, [title, description, keywords, ogImage, ogUrl, ogType, canonical]);

  return null; // This component doesn't render any visible UI
}
