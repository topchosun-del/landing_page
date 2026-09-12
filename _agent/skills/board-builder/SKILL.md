---
name: board-builder
description: GitHub API와 Vercel Serverless를 활용한 정적 부동산 게시판 홈페이지 빌더 및 동기화 스킬
---

# Board Builder Skill

이 스킬은 데이터베이스(RDBMS) 없이 GitHub Repository를 백엔드 DB로 사용하고, Vercel Serverless Function(`/api/config`)을 통해 API 키를 안전하게 주입받아 동작하는 정적 게시판 홈페이지의 유지보수 및 확장 가이드입니다.

## 아키텍처 구조
- **프론트엔드**: HTML, Tailwind CSS, Vanilla JS
- **데이터 저장소**: GitHub 저장소 내 `data/posts.json`
- **보안/설정 주입**:
  - 로컬/기본: `config/git_config.json` (토큰은 placeholder `YOUR_GITHUB_TOKEN`)
  - 배포 환경: `/api/config.js`를 통해 Vercel Environment Variables (`GITHUB_TOKEN`, `ADMIN_PASSWORD`)를 클라이언트에 동적으로 전달
- **Clean URL**: `vercel.json`의 `"cleanUrls": true` 설정으로 확장자 없이 깔끔한 라우팅 제공

## 파일 역할
- `index.html`: 메인 랜딩 및 최신 게시글 3개 프리뷰
- `news.html`: 전체 게시글 목록 검색/필터링
- `news-detail.html`: 마크다운 렌더링 기반 상세 조회, 관리자 수정/삭제 버튼
- `news-write.html`: 글 작성 및 수정 (관리자 전용)
- `admin.html`: 관리자 로그인 및 게시글 관리 대시보드
- `db.js`: LocalStorage와 GitHub Contents API를 연동하는 데이터 매니저 및 마크다운 파서
