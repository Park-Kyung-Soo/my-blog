import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function createPost() {
  console.log('\n📝 새 포스트 생성\n');
  
  // 제목 입력
  const title = await question('제목: ');
  if (!title) {
    console.log('❌ 제목을 입력해주세요.');
    rl.close();
    return;
  }
  
  // 카테고리 입력
  const category = await question('카테고리 (기본값: 일반): ') || '일반';
  
  // 태그 입력
  const tagsInput = await question('태그 (쉼표로 구분): ');
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [];
  
  // 설명 입력
  const description = await question('설명 (선택): ');
  
  // 슬러그 생성
  const defaultSlug = slugify(title);
  const slugInput = await question(`슬러그 (기본값: ${defaultSlug}): `);
  const slug = slugInput || defaultSlug;
  
  // 날짜 및 경로 설정
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  const dirPath = `content/posts/${year}/${month}`;
  const filePath = `${dirPath}/${slug}.md`;
  
  // 디렉토리 생성
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // 파일이 이미 존재하는지 확인
  if (fs.existsSync(filePath)) {
    const overwrite = await question('⚠️  파일이 이미 존재합니다. 덮어쓰시겠습니까? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('취소되었습니다.');
      rl.close();
      return;
    }
  }
  
  // 포스트 내용 생성
  const content = `---
title: "${title}"
date: ${dateStr}
category: "${category}"
tags: [${tags.map(t => `"${t}"`).join(', ')}]
description: "${description}"
---

# ${title}

여기에 내용을 작성하세요.

## 소제목

본문 내용...
`;

  // 파일 작성
  fs.writeFileSync(filePath, content, 'utf-8');
  
  console.log(`\n✅ 포스트가 생성되었습니다: ${filePath}`);
  console.log('\n📌 다음 명령어로 빌드하세요:');
  console.log('   npm run build');
  console.log('   npm run dev    # 로컬에서 확인\n');
  
  rl.close();
}

createPost().catch(console.error);



