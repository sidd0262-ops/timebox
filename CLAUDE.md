# 타임박스 (timebox)

나만 쓰는 한지·수묵 디자인 타임박스 PWA. 휴대폰 홈 화면에 설치해서 사용.

- GitHub: https://github.com/sidd0262-ops/timebox
- 파일: index.html, app.js(로직), style.css, poems.js(열 때 보여주는 시), sw.js(서비스 워커), manifest.webmanifest, icons/, textures/(ink.svg, fiber.svg)
- 빌드 없음: 정적 파일 그대로 배포. 로컬 미리보기는 `python -m http.server 8765`
- 데이터는 기기 브라우저 localStorage(`timebox.v1`)에만 저장. 기기 간 옮길 땐 앱 안의 내보내기/불러오기 사용
- 키(`timebox.v1`) 구조를 바꾸면 기존 기록이 사라질 수 있으니 반드시 마이그레이션 코드 추가

## 진행 상황
- 2026-11-05: 첫 버전(한지·수묵 디자인) → 배경을 안개 낀 수묵으로 교체(쓰는 곳만 한지) → 열 때마다 시 표시, 접히는 기록 바, 얇은 뒤로가기 화살표, 흑백 아이콘

## 내 프로젝트 생태계 (모든 저장소 공통)
GitHub 계정 `sidd0262-ops` 를 기준으로 Windows PC · Mac · 아이폰(클라우드 세션)에서 같은 코드를 씁니다.

| 저장소 | 내용 |
| --- | --- |
| Short-english | 쇼츠로 배우는 영어 회화 PWA (TypeScript, Render 배포) |
| coffee-log | 카페인 조절 기록지 PWA |
| psy-Cultural-adaptation | 문화적응 여정 PWA (Firebase) |
| timebox | 나만 쓰는 한지 타임박스 PWA |
| mind-project | 마음프로젝트 소개 페이지 |

- **폴더 위치:** Windows `Desktop\클로드 코드\` · Mac `~/Desktop/클로드 코드/` (폴더 이름은 저장소 이름과 달라도 됨)
- **한 번에 최신화:** Short-english 저장소의 `workspace/sync-all.ps1`(Windows) · `workspace/sync-all.sh`(Mac). 없는 저장소는 받고, 있는 저장소는 pull
- **작업 규칙**
  1. 시작 전 `git pull` (클라우드 세션은 항상 최신으로 시작)
  2. 끝나면 커밋하고 `git push` (사용자에게 확인 후). 로컬에만 두면 다른 기기에서 안 보임
  3. 같은 저장소를 두 기기에서 동시에 수정하지 않기
  4. API 키·비밀번호는 코드와 채팅에 쓰지 않기 (`.env`, 배포 서비스 환경변수 사용)
  5. 작업이 끝나면 이 파일의 "진행 상황"을 갱신해서 다음 기기·세션이 이어받게 하기
- 사용자와는 한국어로 대화
