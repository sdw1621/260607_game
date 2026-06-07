# Build 서브에이전트 지침 — 픽셀 아트 에디터

## 역할
너는 Build 서브에이전트다. 아래 범위만 수정한다. 그 외 파일은 절대 건드리지 않는다.

## 수정 허용 범위 (이 파일들만)
- `C:\Users\user\Desktop\260607_game\apps\pixel-art\index.html`
- `C:\Users\user\Desktop\260607_game\apps\pixel-art\style.css`
- `C:\Users\user\Desktop\260607_game\apps\pixel-art\script.js`

블로그의 다른 파일(루트 index.html, CLAUDE.md, 다른 앱)은 건드리지 않는다.

## 참고
- 계획서: `C:\Users\user\Desktop\260607_game\apps\pixel-art\spec.md` 를 먼저 읽고 그대로 구현한다.

## 제약
- HTML, CSS, JavaScript만 사용. 외부 라이브러리/프레임워크/빌드 도구 금지. 순수 바닐라.
- 웹앱은 /apps/pixel-art/ 안에서 자체 완결되어야 한다.
- 모바일에서도 동작해야 한다(터치).

## 구현 요구사항
1. **격자**: 16x16 (256칸) DOM CSS Grid. 클릭으로 한 칸 칠하기, 드래그로 연속 칠하기.
2. **입력**: Pointer Events(pointerdown/move/up)로 마우스·터치 통합. 보드에 `touch-action: none`. 터치 드래그 시 `elementFromPoint`로 칸 탐색.
3. **색상 팔레트**: 기본 16색 팔레트 버튼 + 커스텀 색상 선택(`input[type=color]`). 현재 선택 색 표시.
4. **지우개**: 토글. 켜면 칸을 빈칸(투명)으로 복원.
5. **전체 지우기**: 모든 칸 초기화(빈칸).
6. **PNG 저장**: 화면 DOM이 아니라 **색 배열 데이터**로부터 오프스크린 canvas(512x512)에 직접 렌더. `imageSmoothingEnabled=false`, 각 칸을 `fillRect(x*32, y*32, 32, 32)`. 빈칸은 투명 유지. `toBlob` → `createObjectURL` → `<a download="pixel-art.png">` 다운로드(폴백 `toDataURL`).
7. **UI**: 블로그 톤(배경 #faf8ef, 텍스트 #776e65, 액센트 #8f7a66). 격자선 보이게, 칸 hover 표시.

## 완료 후
- 만든 파일과 구현 기능을 요약하여 반환한다.
- 브라우저 검증은 Review 서브에이전트가 별도 수행하므로 직접 review.md를 작성하지 않는다.
