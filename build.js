import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

// ============================================
// 설정
// ============================================
const CONFIG = {
  contentDir: 'content',
  postsDir: 'content/posts',
  templatesDir: 'templates',
  publicDir: 'public',
  outputDir: 'dist',
  postsPerPage: 10,
  siteTitle: 'My Blog',
  siteDescription: '개발과 일상을 기록하는 블로그',
  baseUrl: ''  // GitHub Pages 서브디렉토리 사용시 '/repo-name'
};

// ============================================
// 마크다운 파서 설정
// ============================================
const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);

marked.setOptions({
  gfm: true,
  breaks: true
});

// ============================================
// 유틸리티 함수
// ============================================
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function formatDate(date, format = 'long') {
  const d = new Date(date);
  if (format === 'long') {
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  return d.toISOString().split('T')[0];
}

function getRelativePath(from, to) {
  const fromParts = from.split('/').filter(Boolean);
  const toParts = to.split('/').filter(Boolean);
  
  // 현재 위치에서 루트까지의 거리
  const depth = fromParts.length - 1;
  const prefix = depth > 0 ? '../'.repeat(depth) : './';
  
  return prefix + toParts.join('/');
}

// ============================================
// 콘텐츠 로더
// ============================================
async function loadPosts() {
  const files = await glob(`${CONFIG.postsDir}/**/*.md`);
  const posts = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const { data, content: markdown } = matter(content);
    
    // 파일 경로에서 날짜 정보 추출 (Windows/Unix 호환)
    const normalizedPath = file.replace(/\\/g, '/');
    const pathParts = normalizedPath.split('/');
    const year = pathParts.find(p => /^\d{4}$/.test(p));
    const month = pathParts.find((p, i) => /^\d{2}$/.test(p) && pathParts[i-1] === year);
    
    const slug = path.basename(file, '.md');
    const url = `/blog/${year}/${month}/${slug}.html`;
    
    posts.push({
      ...data,
      slug,
      url,
      year,
      month,
      content: markdown,
      html: marked.parse(markdown),
      date: new Date(data.date),
      category: data.category || '미분류',
      tags: data.tags || []
    });
  }

  // 날짜 기준 내림차순 정렬
  return posts.sort((a, b) => b.date - a.date);
}

function loadPage(name) {
  const filePath = `${CONFIG.contentDir}/${name}.md`;
  if (!fs.existsSync(filePath)) return null;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data, content: markdown } = matter(content);
  
  return {
    ...data,
    content: markdown,
    html: marked.parse(markdown)
  };
}

// ============================================
// 인덱스 생성
// ============================================
function buildIndexes(posts) {
  const categories = {};
  const tags = {};
  const archives = {};

  for (const post of posts) {
    // 카테고리 인덱스
    if (!categories[post.category]) {
      categories[post.category] = [];
    }
    categories[post.category].push(post);

    // 태그 인덱스
    for (const tag of post.tags) {
      if (!tags[tag]) {
        tags[tag] = [];
      }
      tags[tag].push(post);
    }

    // 아카이브 인덱스 (년/월)
    const archiveKey = `${post.year}-${post.month}`;
    if (!archives[archiveKey]) {
      archives[archiveKey] = {
        year: post.year,
        month: post.month,
        posts: []
      };
    }
    archives[archiveKey].posts.push(post);
  }

  return { categories, tags, archives };
}

// ============================================
// 템플릿 시스템
// ============================================
function loadTemplate(name) {
  const filePath = `${CONFIG.templatesDir}/${name}.html`;
  return fs.readFileSync(filePath, 'utf-8');
}

function render(template, data) {
  let result = template;
  
  // 1. 먼저 반복 렌더링 {{#each array}}...{{/each}} 처리
  result = result.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, key, itemTemplate) => {
    const items = data[key] || [];
    return items.map(item => {
      let itemResult = itemTemplate;
      // 아이템의 모든 속성을 치환
      for (const [k, v] of Object.entries(item)) {
        if (v !== undefined && v !== null) {
          itemResult = itemResult.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        }
      }
      return itemResult;
    }).join('');
  });
  
  // 2. 조건부 렌더링 {{#if variable}}...{{/if}}
  result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
    return data[key] ? content : '';
  });
  
  // 3. 마지막으로 간단한 템플릿 변수 치환 {{variable}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
  
  return result;
}

// ============================================
// 페이지 생성기
// ============================================
function generatePage(templateName, data, outputPath) {
  const layout = loadTemplate('layout');
  const template = loadTemplate(templateName);
  
  // 현재 페이지 깊이에 따른 상대 경로 계산
  const depth = outputPath.split('/').length - 1;
  const basePath = depth > 0 ? '../'.repeat(depth) : './';
  
  const pageContent = render(template, { ...data, basePath });
  
  const fullPage = render(layout, {
    ...data,
    basePath,
    content: pageContent,
    siteTitle: CONFIG.siteTitle,
    siteDescription: CONFIG.siteDescription,
    currentYear: new Date().getFullYear()
  });
  
  const fullPath = `${CONFIG.outputDir}/${outputPath}`;
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, fullPage);
  console.log(`  ✓ Generated: ${outputPath}`);
}

// ============================================
// 빌드 프로세스
// ============================================
async function build() {
  console.log('\n🚀 블로그 빌드 시작...\n');
  
  // 출력 디렉토리 초기화
  if (fs.existsSync(CONFIG.outputDir)) {
    fs.rmSync(CONFIG.outputDir, { recursive: true });
  }
  ensureDir(CONFIG.outputDir);
  
  // 정적 파일 복사
  console.log('📁 정적 파일 복사...');
  if (fs.existsSync(CONFIG.publicDir)) {
    copyDir(CONFIG.publicDir, CONFIG.outputDir);
  }
  
  // 포스트 로드 및 인덱스 생성
  console.log('📝 포스트 로드...');
  const posts = await loadPosts();
  const { categories, tags, archives } = buildIndexes(posts);
  
  console.log(`   ${posts.length}개의 포스트 발견`);
  console.log(`   ${Object.keys(categories).length}개의 카테고리`);
  console.log(`   ${Object.keys(tags).length}개의 태그\n`);
  
  // 홈페이지 생성
  console.log('🏠 홈페이지 생성...');
  generatePage('home', {
    title: 'Home',
    posts: posts.slice(0, 5).map(p => ({
      ...p,
      url: p.url.substring(1), // 앞의 / 제거
      dateFormatted: formatDate(p.date),
      excerpt: p.description || p.content.substring(0, 150) + '...',
      tagsHtml: p.tags.map(t => `<span class="tag-small">${t}</span>`).join('')
    })),
    recentPosts: posts.slice(0, 5),
    categories: Object.entries(categories).map(([name, items]) => ({
      name,
      count: items.length,
      url: `category/${slugify(name)}.html`
    })),
    tags: Object.entries(tags).map(([name, items]) => ({
      name,
      count: items.length,
      url: `tag/${slugify(name)}.html`
    }))
  }, 'index.html');
  
  // About 페이지 생성
  console.log('👤 About 페이지 생성...');
  const aboutPage = loadPage('about');
  if (aboutPage) {
    generatePage('about', aboutPage, 'about.html');
  }
  
  // 블로그 목록 페이지 생성
  console.log('📚 블로그 목록 페이지 생성...');
  generatePage('blog-list', {
    title: 'Blog',
    posts: posts.map(p => ({
      ...p,
      url: p.url.substring(1), // 앞의 / 제거
      dateFormatted: formatDate(p.date),
      excerpt: p.description || p.content.substring(0, 150) + '...',
      tagsHtml: p.tags.map(t => `<span class="tag-small">${t}</span>`).join('')
    })),
    archives: Object.values(archives).sort((a, b) => {
      return `${b.year}-${b.month}`.localeCompare(`${a.year}-${a.month}`);
    }).map(a => ({
      ...a,
      label: `${a.year}년 ${parseInt(a.month)}월`,
      count: a.posts.length,
      url: `archive/${a.year}/${a.month}.html`
    }))
  }, 'blog/index.html');
  
  // 개별 포스트 페이지 생성
  console.log('📄 포스트 페이지 생성...');
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const prevPost = posts[i + 1] || null;
    const nextPost = posts[i - 1] || null;
    
    generatePage('post', {
      ...post,
      dateFormatted: formatDate(post.date),
      tagsHtml: post.tags.map(t => 
        `<a href="../../../tag/${slugify(t)}.html" class="tag">${t}</a>`
      ).join(''),
      categoryUrl: `../../../category/${slugify(post.category)}.html`,
      hasPrev: !!prevPost,
      hasNext: !!nextPost,
      prevPostTitle: prevPost ? prevPost.title : '',
      prevPostUrl: prevPost ? `../../../blog/${prevPost.year}/${prevPost.month}/${prevPost.slug}.html` : '',
      nextPostTitle: nextPost ? nextPost.title : '',
      nextPostUrl: nextPost ? `../../../blog/${nextPost.year}/${nextPost.month}/${nextPost.slug}.html` : ''
    }, post.url.substring(1));
  }
  
  // 카테고리 페이지 생성
  console.log('🏷️  카테고리 페이지 생성...');
  ensureDir(`${CONFIG.outputDir}/category`);
  for (const [name, categoryPosts] of Object.entries(categories)) {
    generatePage('category', {
      title: `카테고리: ${name}`,
      name,
      posts: categoryPosts.map(p => ({
        ...p,
        url: p.url.substring(1),
        dateFormatted: formatDate(p.date)
      })),
      count: categoryPosts.length
    }, `category/${slugify(name)}.html`);
  }
  
  // 태그 페이지 생성
  console.log('🔖 태그 페이지 생성...');
  ensureDir(`${CONFIG.outputDir}/tag`);
  for (const [name, tagPosts] of Object.entries(tags)) {
    generatePage('tag', {
      title: `태그: ${name}`,
      name,
      posts: tagPosts.map(p => ({
        ...p,
        url: p.url.substring(1),
        dateFormatted: formatDate(p.date)
      })),
      count: tagPosts.length
    }, `tag/${slugify(name)}.html`);
  }
  
  // 아카이브 페이지 생성
  console.log('📅 아카이브 페이지 생성...');
  for (const archive of Object.values(archives)) {
    const label = `${archive.year}년 ${parseInt(archive.month)}월`;
    ensureDir(`${CONFIG.outputDir}/archive/${archive.year}`);
    generatePage('archive', {
      title: `아카이브: ${label}`,
      year: archive.year,
      month: archive.month,
      label,
      posts: archive.posts.map(p => ({
        ...p,
        url: p.url.substring(1),
        dateFormatted: formatDate(p.date)
      })),
      count: archive.posts.length
    }, `archive/${archive.year}/${archive.month}.html`);
  }
  
  // .nojekyll 파일 생성 (GitHub Pages용)
  fs.writeFileSync(`${CONFIG.outputDir}/.nojekyll`, '');
  
  console.log('\n✅ 빌드 완료!\n');
}

function copyDir(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 실행
build().catch(console.error);

