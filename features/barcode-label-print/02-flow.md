# 흐름 `자산관리 - 라벨 PDF 만들기`

앱 이름으로는 `'자산관리-라벨PDF만들기'`. 인스턴트(PowerAppV2) 흐름, 실행하는 사용자의 SharePoint 연결로 돈다.

## 구조 (두 단계뿐)

| 단계 | 종류 | 내용 |
|---|---|---|
| 트리거 | PowerAppV2 | `text` = labelHtml(라벨 HTML 전체), `text_1` = fileName(확장자 없음) |
| `Create_HTML` | SharePoint 파일 만들기 | 사이트 `https://{TENANT}.sharepoint.com/sites/{SITE_NAME}`, 폴더 `/DocLib/라벨출력`, 이름 `@{triggerBody()?['text_1']}.html`, 내용 `@triggerBody()?['text']` |
| `Respond` | Power App에 응답 | `pdfurl` (아래 식) |

```
@{concat('https://{TENANT}.sharepoint.com/sites/{SITE_NAME}/_api/v2.0/drives/{DRIVE_ID}/root:/', encodeUriComponent('라벨출력'), '/', encodeUriComponent(concat(triggerBody()?['text_1'], '.html')), ':/content?format=pdf')}
```

- `{DRIVE_ID}`는 자산관리 라이브러리(`DocLib`)의 드라이브 id. 사이트에서
  `/_api/v2.0/drives?$select=id,name` 으로 확인한다.
- `라벨출력` 폴더는 미리 만들지 않았는데 첫 실행 때 생겼다.

## 흐름 안에서 PDF로 바꾸지 말 것

처음에는 흐름이 `SharePoint에 HTTP 요청 보내기`로 `…:/content?format=pdf`를 받아 PDF 파일로 저장하게 했다.
**실패한다.** 이 주소는 `302 Found`로 외부 변환 서버(`*-mediap.svc.ms`)에 넘기는데, 이 액션은 리디렉션을
따라가지 않고 실패로 끝난다. 앱에서는 `502 BadGateway`(응답 없음)로 보인다.

OneDrive for Business `파일 변환` 액션은 같은 엔진이지만, 이 환경에는 OneDrive 연결이 없어 쓰지 못했다.

그래서 **변환은 사용자 브라우저가 한다.** 앱이 `pdfurl`을 `Launch`하면 브라우저가 SharePoint 로그인 쿠키로
리디렉션을 따라가 PDF를 받고, Edge PDF 뷰어에 바로 띄운다(응답 `application/pdf`).

## 변환 엔진에서 확인한 것 (2026-09-29)

| 항목 | 결과 |
|---|---|
| 엔진 | Producer `Skia/PDF` — 크롬 렌더러 |
| `@page{size:50mm 30mm;margin:0}` + `page-break-after:always` | 라벨마다 1페이지, MediaBox 142.08×84.96pt(=50×30mm) 정확 |
| 한글 | `'Malgun Gothic'` 글꼴이 임베드된다 |
| 외부 이미지 URL | **안 가져온다.** 14×16 깨진 이미지 아이콘으로 나온다 |
| 인라인 SVG / 데이터 URI SVG | 벡터로 그려진다 |

→ 바코드는 HTML 안에 SVG로 직접 그려야 한다(`01`의 수식이 그렇게 한다).

## 쓰기 권한

SharePoint REST로 파일을 올려 볼 때 v2.0 `PUT …:/content`는 쿠키 인증으로 403이었다.
클래식 REST(`folders/add`, `GetFolderByServerRelativeUrl(…)/Files/add` + `X-RequestDigest`)는 된다.
흐름은 SharePoint 커넥터를 쓰므로 해당 없다.
