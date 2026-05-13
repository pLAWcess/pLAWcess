// 응답 본문을 JSON 으로 파싱하되, 본문이 JSON 이 아니면(예: 게이트웨이가 끼워넣은
// 502/504 HTML, Next.js 에러 페이지) 예외를 던지지 않고 빈 객체를 돌려준다.
//
// `await res.json()` 가 throw 하면 그 뒤의 `setLoading(false)` 같은 정리 코드가
// 건너뛰어져 버튼이 영원히 "처리 중..." 으로 멈춘다. 이를 막기 위한 헬퍼.
export async function readJson<T = Record<string, unknown>>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
}
