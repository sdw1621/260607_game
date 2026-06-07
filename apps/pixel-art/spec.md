# 픽셀 아트 에디터 구현 계획 (spec.md)

## 1. 앱 개요

픽셀 아트 에디터는 16x16 격자 위에 도트(픽셀)를 찍어 작은 픽셀 그림을 그리는 미니 웹앱이다. 사용자는 색상 팔레트에서 색을 고르거나 직접 커스텀 색상을 선택해 격자 칸을 칠하고, 지우개와 전체 지우기로 수정하며, 완성한 그림을 PNG 파일로 다운로드할 수 있다. 데스크톱(마우스 클릭/드래그)과 모바일(터치)을 모두 지원한다.

### 핵심 기능

- **16x16 격자 그리기**: 클릭으로 한 칸 칠하기, 드래그로 연속 칠하기.
- **색상 팔레트**: 미리 정의된 색상 목록에서 선택.
- **커스텀 색상 선택**: `<input type="color">` 네이티브 color picker로 임의 색 선택.
- **지우개**: 칸을 투명/배경 상태로 되돌리기.
- **전체 지우기(Clear)**: 격자 전체 초기화.
- **PNG 다운로드**: 16x16 데이터를 별도 canvas에 512x512로 nearest-neighbor 확대 렌더 후 PNG로 저장.
- **모바일 터치 지원**: touch 이벤트로 칠하기 및 드래그 지원.

외부 라이브러리는 사용하지 않는다(순수 HTML/CSS/JS, 외부 의존성 0).

## 2. 파일 구조

웹앱은 `/apps/pixel-art/` 폴더에 독립 완결된다. 블로그의 다른 파일에 의존하지 않는다.

```
/apps/pixel-art/
├── index.html      # 마크업: 헤더, 도구 바, 팔레트, 격자(보드), 액션 버튼
├── style.css       # 레이아웃, 격자 스타일, 팔레트/버튼, 반응형
├── script.js       # 그리기 로직: 상태, 입력 처리, 렌더링, PNG 저장
└── spec.md         # 본 계획서
```

루트 `index.html`(블로그 메인)에는 Embed 단계에서 별도로 카드만 추가하며, Plan/Build 단계에서는 건드리지 않는다.

## 3. 주요 기능 목록

### 3.1 16x16 격자 그리기 (클릭/드래그로 칠하기)
- 격자는 16x16 = 256칸. 상태는 1차원(또는 2차원) 배열로 각 칸의 색(`null`=빈칸, 또는 hex 문자열)을 보관한다.
- **화면 격자 방식**: DOM 기반. 256개의 `<div class="px">`를 CSS Grid(`grid-template-columns: repeat(16, 1fr)`)로 배치한다. (canvas보다 칸 단위 칠하기/하이라이트 구현이 단순하고, 셀별 좌표 계산 불필요.)
- **클릭 칠하기**: 칸에 `mousedown` 시 현재 도구/색으로 칠한다.
- **드래그 칠하기**: `mousedown` 시 `isDrawing=true`, 보드 위 `mouseover`(또는 pointermove)로 지나는 칸을 연속으로 칠한다. 문서 `mouseup`에서 `isDrawing=false`. 드래그가 보드 밖으로 나가도 안전하게 종료되도록 `window`에 mouseup 바인딩.
- **권장 구현**: 마우스/터치 분기를 줄이기 위해 Pointer Events(`pointerdown`/`pointermove`/`pointerup`)로 통합하고, `setPointerCapture`로 드래그 추적을 안정화한다. (Pointer Events 미지원 환경 대비가 필요하면 mouse+touch 폴백.)

### 3.2 색상 팔레트 선택
- 팔레트 색상 버튼들을 도구 영역에 나열한다. 클릭 시 `currentColor`를 해당 색으로 설정하고 지우개 모드를 해제한다.
- 현재 선택된 색은 테두리/체크 표시로 강조한다.

### 3.3 커스텀 색상 선택 (color picker)
- `<input type="color" id="custom-color">`를 두고, `input`/`change` 이벤트에서 `currentColor`를 갱신한다.
- 커스텀 색을 고르면 팔레트 선택 강조를 해제하고 커스텀 스와치를 강조한다.

### 3.4 지우개
- 지우개 버튼을 토글로 둔다. 활성화 시 `eraser=true`로 두고, 칠하기 동작이 칸 색을 `null`(빈칸/배경)로 되돌린다.
- 색 선택(팔레트/커스텀) 시 지우개는 자동 해제된다.

### 3.5 전체 지우기 (Clear)
- "전체 지우기" 버튼 클릭 시 모든 칸을 `null`로 초기화하고 다시 렌더한다.
- 실수 방지를 위해 `confirm()`으로 한 번 확인(선택).

### 3.6 PNG 다운로드
- 5장 별도 섹션(4)에서 상세히 기술. 화면은 DOM 격자, 저장 시에만 오프스크린 canvas로 렌더.

### 3.7 모바일 터치 지원
- Pointer Events 사용 시 마우스/터치/펜이 동일 코드로 처리된다.
- 보드 영역에 `touch-action: none`을 적용해 드래그 중 스크롤/줌을 방지한다.
- `touchmove` 사용 시에는 `document.elementFromPoint(touch.clientX, touch.clientY)`로 손가락 아래 칸을 찾아 칠한다(터치는 mouseover가 발생하지 않으므로).

## 4. PNG 저장 구현 방안

핵심: 화면용 격자는 DOM으로 그리지만, 저장은 화면을 캡처하지 않고 데이터 모델(색 배열)로부터 오프스크린 canvas에 직접 그린다. 이렇게 하면 격자선/하이라이트 같은 화면 장식이 결과 이미지에 섞이지 않는다.

### 절차
1. 메모리상에 `<canvas>`를 생성한다(또는 숨겨진 canvas 재사용). 크기는 출력 해상도 512x512로 설정한다. (16칸 x 32px = 512px → 한 픽셀이 32x32px 블록.)
2. `ctx.imageSmoothingEnabled = false`로 설정해 확대 시 nearest-neighbor(계단식 픽셀) 유지.
3. 색 배열을 순회하며 각 칸 `(x, y)`에 대해:
   - 빈칸(`null`)은 투명하게 둔다(아무것도 그리지 않음) → 투명 배경 PNG. 또는 옵션으로 흰 배경을 먼저 채울 수 있다.
   - 색이 있으면 `ctx.fillStyle = color; ctx.fillRect(x*32, y*32, 32, 32);`
4. 저장: `canvas.toBlob(blob => { ... }, 'image/png')`로 Blob 생성 → `URL.createObjectURL(blob)`로 임시 URL → 동적 `<a download="pixel-art.png" href=url>` 생성 후 `.click()` → `URL.revokeObjectURL(url)`로 정리.
   - `toBlob` 미지원 폴백으로 `canvas.toDataURL('image/png')` + `<a href=dataURL download>` 사용 가능.

### 보완 사항
- 픽셀 블록 크기 32px는 상수(`EXPORT_SCALE`)로 두어 256x256/512x512/1024x1024 등 조절 가능하게 한다.
- 투명 배경 PNG는 일부 뷰어에서 검게 보일 수 있으므로, 다운로드 전 "배경 포함" 토글(흰색 채우기)을 선택지로 둘 수 있다(선택 기능).

## 5. UI/UX 개요

### 레이아웃 (위에서 아래로)
1. **헤더**: 타이틀 "픽셀 아트 에디터" + 간단한 안내 문구.
2. **도구 바**:
   - 색상 팔레트(스와치 버튼들)
   - 커스텀 색상 picker(`input[type=color]`) + 현재 색 미리보기
   - 지우개 토글 버튼
3. **보드**: 16x16 격자. 정사각형 유지, 화면 중앙 정렬. 칸 사이 얇은 격자선(CSS border 또는 gap + 배경색)으로 픽셀 경계 표시.
4. **액션 바**: "전체 지우기" 버튼, "PNG 저장" 버튼.
5. **푸터**: 조작 안내(클릭/드래그, 모바일 터치).

### 팔레트 색상 목록 (기본 16색 제안)
- 검정 `#000000`
- 흰색 `#FFFFFF`
- 회색 `#9E9E9E`
- 빨강 `#E53935`
- 주황 `#FB8C00`
- 노랑 `#FDD835`
- 연두 `#7CB342`
- 초록 `#43A047`
- 청록 `#00ACC1`
- 하늘 `#29B6F6`
- 파랑 `#1E88E5`
- 남색 `#3949AB`
- 보라 `#8E24AA`
- 분홍 `#EC407A`
- 갈색 `#6D4C41`
- 살구(피부) `#FFCC80`

(블로그 톤과 어울리는 베이지 배경 `#faf8ef`, 텍스트 `#776e65`, 액센트 `#8f7a66`를 메인과 통일하면 좋다.)

### 인터랙션
- 현재 선택 색/지우개 상태를 도구 바에서 시각적으로 강조.
- 보드 호버 시 커서가 닿는 칸을 살짝 강조(선택).
- 버튼 최소 44px 터치 타깃 확보.

## 6. 모바일 지원 방안

- viewport 메타: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no` (2048 앱과 동일 톤).
- 보드 크기를 `min(92vw, 480px)` 등 뷰포트 기반으로 설정해 작은 화면에서도 정사각 유지(16등분이 정수 픽셀에 가깝도록 약간의 여유).
- 보드에 `touch-action: none` 적용으로 그리는 동안 스크롤/줌 방지.
- Pointer Events 우선, 폴백으로 touch 이벤트 + `elementFromPoint`.

## 7. 구현 단계 목록

1. **HTML 골격(index.html)**: 헤더, 도구 바(팔레트/커스텀 색/지우개), 보드 컨테이너, 액션 바(전체 지우기/PNG 저장), 푸터. viewport 메타 포함. `script.js`, `style.css` 링크.
2. **CSS(style.css)**: 16x16 CSS Grid 보드, 정사각 칸, 격자선, 팔레트 스와치, 버튼/토글 스타일, 반응형, `touch-action: none`.
3. **상태 모델(script.js)**: 256칸 색 배열, `currentColor`, `eraser`, `isDrawing` 변수. 팔레트 색 상수 배열, `EXPORT_SCALE` 상수.
4. **보드 생성/렌더**: 256개 셀 DOM 생성, 배열 → 셀 배경색 갱신 함수.
5. **칠하기 로직**: 좌표→인덱스 매핑, `paintCell(index)`(지우개면 null), 드래그 상태 관리.
6. **입력 연결(Pointer Events)**: `pointerdown/move/up`로 클릭+드래그 통합, 보드 밖 종료 처리. 터치 폴백 필요 시 `elementFromPoint`.
7. **팔레트/커스텀 색/지우개 UI**: 색 선택, color picker 연동, 지우개 토글, 선택 강조.
8. **전체 지우기**: 배열 초기화 + 재렌더(선택적 confirm).
9. **PNG 저장**: 오프스크린 canvas 512x512, `imageSmoothingEnabled=false`, fillRect로 픽셀 렌더, `toBlob`→다운로드(폴백 `toDataURL`).
10. **모바일 점검**: 터치 드래그/스크롤 방지/정사각 유지 확인(브라우저 수동 테스트는 Review 단계에서 수행).

## 8. 검증 포인트 (Review 단계 참고)

- 클릭 1회로 한 칸만 칠해지는지, 드래그로 연속 칠해지는지.
- 드래그가 보드 밖으로 나갔다 들어와도 상태가 깨지지 않는지(window mouseup/pointerup).
- 지우개가 칸을 빈칸으로 되돌리는지, 색 선택 시 지우개가 해제되는지.
- 커스텀 color picker가 currentColor에 반영되는지.
- 전체 지우기 후 보드가 완전히 비는지.
- PNG가 16x16 데이터 기준 512x512로 계단식(nearest-neighbor) 확대되어 저장되는지, 격자선/하이라이트가 결과에 섞이지 않는지.
- 모바일에서 터치 드래그로 칠해지고, 그리는 동안 페이지 스크롤/줌이 발생하지 않는지.
