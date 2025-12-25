# My Blog 📝

Node.js 기반의 정적 블로그 생성기입니다. 마크다운으로 글을 작성하고 GitHub Pages에 배포할 수 있습니다.

## ✨ 특징

- 📝 **마크다운 지원** - Front Matter로 메타데이터 관리
- 🏷️ **태그 & 카테고리** - 글 분류 및 필터링
- 📅 **월별 아카이브** - 날짜별 글 관리
- 🌙 **다크모드** - 시스템 설정 연동 및 수동 토글
- 💻 **코드 하이라이팅** - highlight.js 기반
- 🚀 **GitHub Pages 배포** - 자동화된 CI/CD

## 🚀 시작하기

### 설치

```bash
npm install
```

### 새 포스트 작성

```bash
npm run new
```

대화형 CLI로 새 포스트를 생성합니다.

또는 직접 마크다운 파일을 생성할 수 있습니다:

```markdown
---
title: "포스트 제목"
date: 2024-12-23
category: "카테고리"
tags: ["태그1", "태그2"]
description: "포스트 설명"
---

# 본문 내용
```

### 빌드

```bash
npm run build
```

`dist/` 폴더에 정적 파일이 생성됩니다.

### 로컬 미리보기

```bash
npm run dev
```

http://localhost:3000 에서 블로그를 확인할 수 있습니다.

## 📁 프로젝트 구조

```
my-blog/
├── content/               # 콘텐츠
│   ├── posts/            # 블로그 포스트 (월별 관리)
│   │   └── 2024/
│   │       └── 12/
│   │           └── hello-world.md
│   └── about.md          # About 페이지
├── templates/            # HTML 템플릿
├── public/               # 정적 파일 (CSS, 이미지)
├── dist/                 # 빌드 결과물
├── scripts/              # 유틸리티 스크립트
├── build.js              # 빌드 스크립트
└── package.json
```

## 🎨 커스터마이징

### 사이트 설정

`build.js`의 `CONFIG` 객체를 수정하세요:

```javascript
const CONFIG = {
  siteTitle: 'My Blog',
  siteDescription: '블로그 설명',
  postsPerPage: 10,
  baseUrl: ''  // GitHub Pages 서브디렉토리: '/repo-name'
};
```

### 스타일 수정

- `public/css/style.css` - 메인 스타일
- `public/css/hljs-theme.css` - 코드 하이라이팅 테마

### 템플릿 수정

`templates/` 폴더의 HTML 파일을 수정하세요.

## 🚀 GitHub Pages 배포

1. GitHub에 저장소를 생성합니다.
2. 코드를 push합니다.
3. Settings > Pages에서 Source를 "GitHub Actions"로 설정합니다.
4. main 브랜치에 push하면 자동으로 배포됩니다.

## 📜 라이선스

MIT License



