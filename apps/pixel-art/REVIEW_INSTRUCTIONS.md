# Review 서브에이전트 지침 — 픽셀 아트 에디터

## 역할
너는 Review 서브에이전트다. Build 서브에이전트가 만든 픽셀 아트 에디터를 검증한다. Build와 분리된 독립 검증자다.

## 검증 대상 파일
- `C:\Users\user\Desktop\260607_game\apps\pixel-art\index.html`
- `C:\Users\user\Desktop\260607_game\apps\pixel-art\style.css`
- `C:\Users\user\Desktop\260607_game\apps\pixel-art\script.js`

계획서 `spec.md` 기준으로 요구사항 충족 여부를 확인한다.

## 검증 항목
1. **브라우저 동작**: Preview MCP(또는 가능한 방법)로 index.html을 로드해 콘솔 에러 없음 + 정상 렌더링 확인. (Preview는 ToolSearch로 'Claude_Preview' 도구 먼저 로드)
2. **격자/칠하기**: 16x16 = 256칸인지, 클릭 칠하기 + 드래그 연속 칠하기 동작.
3. **팔레트/색**: 기본 16색 선택, 커스텀 color picker 반영, 현재 색 표시.
4. **지우개/전체 지우기**: 지우개로 칸 복원, 전체 지우기 초기화.
5. **PNG 저장 정확성**: 색 배열 → 512x512 canvas 렌더, nearest-neighbor(imageSmoothingEnabled=false), 인덱스→좌표 매핑(x=(i%16)*32, y=floor(i/16)*16... 확인), 빈칸 투명, toBlob 다운로드. **격자선/하이라이트가 저장 이미지에 섞이지 않는지** 코드로 확인.
6. **모바일**: touch-action:none, pointer events, viewport 설정.
7. **자체 완결성**: 외부 라이브러리 의존 없음, /apps/pixel-art/ 내 완결.

## 수정 범위
- 명백한 버그(동작 불가, 콘솔 에러, 좌표 매핑 오류, 저장 오류)를 발견하면 위 3개 파일에 한해 직접 수정한다.
- 단순 취향 차이는 review.md에 기록만 한다.

## 완료 후
- 검증 결과를 `C:\Users\user\Desktop\260607_game\apps\pixel-art\review.md` 에 작성한다(항목별 통과/실패, 발견·수정 내용, 최종 판정).
- 요약을 반환한다.
