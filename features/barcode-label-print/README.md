# 바코드 라벨 — 라벨 1개 = PDF 1페이지

PPT 장표 5-6 "라벨 1개당 1개로 출력" 요청 대응. 2026-09-29 구현·**게시 완료**.
미리보기에서 2건 인쇄 → Edge PDF 뷰어 "1 / 2", 라벨마다 바코드·자산코드·자산명만 나오는 것까지 확인했다.

## 흐름

```
scrBarcodePrint  [라벨 프린터 출력]  → 화면 이동만
scrLabelPrint    [인쇄]
   ├ Power Fx로 라벨 HTML 생성 (Code128 바코드를 SVG로 직접 그림)
   ├ 흐름 '자산관리-라벨PDF만들기'.Run(html, 파일명) → SharePoint DocLib/라벨출력/<파일명>.html
   ├ 실패 → Notify
   └ 성공 → 바코드출력여부 Patch → 목록 갱신 → Launch(pdfurl)
브라우저 → …/content?format=pdf → PDF 뷰어 → 인쇄 1회
```

## 파일

| 파일 | 용도 |
|---|---|
| `01-btnLabelPrintGo-OnSelect.txt` | `scrLabelPrint.btnLabelPrintGo.OnSelect` 전문 |
| `02-flow.md` | 흐름 구조, `pdfurl` 식, 흐름에서 변환하면 안 되는 이유, 변환 엔진 실측 |
| `03-code128-reference.js` | Power Fx 수식과 같은 로직의 JS 인코더(검증용) |
| `04-code128-verify.js` | JsBarcode `CODE128B`와 비트 비교 (`npm i jsbarcode@3` 후 `node 04-code128-verify.js`) |

## 앱에서 바꾼 것 (DemoAssetManagement)

| 대상 | 전 | 후 |
|---|---|---|
| `btnBcpPrint.OnSelect` | 누르는 즉시 `바코드출력여부=true` Patch + "선택한 N건 출력 처리되었습니다" Notify + 목록 갱신 + 이동 | `Navigate(scrLabelPrint, ScreenTransition.None)` |
| `btnLabelPrintGo.OnSelect` | `Set(gblLpPrinting, true)` → 타이머가 `Print()` | `01` 수식 |
| `tmrLabelPrint` | 400ms 뒤 `Print()` | **삭제** |
| `galLabelSheet.Y` / `.Height` | `If(gblLpPrinting, 0, 56)` / `Parent.Height - If(gblLpPrinting, 0, 56)` | `56` / `Parent.Height - 56` |
| `conLabelPrintToolbar.Visible` | `!gblLpPrinting` | `true` |
| 데이터 원본 | — | 흐름 `자산관리-라벨PDF만들기` 추가 |

타이머를 지우면 `gblLpPrinting`을 `Set`하는 곳이 없어져 **정의되지 않은 변수** 오류가 세 곳에 난다.
위 표의 마지막 두 줄이 그 정리다.

## 수식 요점 (`01`)

- 맨 앞 `wMmW: 50, wMmH: 30` — **라벨 크기(mm). 가정값이다.** 실제 크기를 받으면 이 두 숫자만 바꾼다
- `wPat` — Code128 폭 패턴 107개(0~105, 정지 코드는 `"2331112"` 따로)
- `wSetB` — `Char(32)`~`Char(126)`. Power Fx에 문자→코드 함수가 없어서 `Find(문자, wSetB) - 1`로 Code B 값을 구한다
- 체크섬 `Mod(104 + Σ i × 값_i, 103)`
- 폭 문자열 → 홀수 번째(막대)만 `<rect>`. x 위치는 앞자리 폭 합(`Sum(Filter(wD, k < b.k), w)`)
- `viewBox` 가로 = 모듈 수 + 20(좌우 조용한 영역 10모듈), `preserveAspectRatio='none'`로 라벨 폭에 늘린다
- `라벨당 매수`(`txtLpCopies`, 1~99)만큼 같은 라벨을 반복
- 자산명은 `& < >` 이스케이프
- 파일명 `label_yyyymmdd_hhmmss_<GUID 6자>`

## 검증한 것

- JS 인코더 ↔ JsBarcode: 5개 입력 비트 일치
- **앱이 실제로 만든 HTML**의 SVG를 풀어 비트열로 → JsBarcode와 2건 일치
- 그 HTML의 PDF: 2페이지, 각 50×30mm, 래스터 이미지 0개(전부 벡터)
- 미리보기 종단: 선택 2건 → 라벨 화면(알림 없음) → 인쇄 → 새 탭 PDF 1/2

## 남은 것

- 실제 라벨 크기·프린터 기종 받기 → `wMmW/wMmH` 수정 → 실물 스캔 확인
  - 50×30mm에서 모듈 폭 ≈ 0.2mm(16자 코드 기준 231모듈/46mm). 203dpi 프린터면 1모듈 ≈ 1.6도트라 인쇄 품질을 봐야 한다
- `라벨출력` 폴더에 인쇄마다 html이 1개씩 쌓인다 — 정리 방법 미정
- 라벨 화면의 **미리보기 갤러리**(`imgLabelBarcode`)는 아직 외부 바코드 이미지 URL을 쓴다. 인쇄와는 무관
- (확인 완료) 게시본에 `gblLpPrinting`·`tmrLabelPrint` 참조 없음

## 왜 이 방식인가 (요청자 설득용 요약)

기존은 A4 라벨지 4열 격자를 화면째 `Print()` — 보이는 화면 한 장만 찍혀 많이 뽑으면 잘릴 수 있고,
롤 라벨 프린터(라벨 한 칸 = 한 장)에는 맞지 않는다. 라벨마다 화면을 넘기며 `Print()`를 반복하면
인쇄 창이 라벨 수만큼 뜬다. PDF로 만들면 인쇄 1회에 라벨 N장, 롤·A4 모두 페이지 크기만 바꾸면 된다.
