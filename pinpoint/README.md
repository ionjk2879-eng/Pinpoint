# Pinpoint — 구독료 경비 관리

프리랜서/1인 사업자가 구독료 지출을 업무용/개인용으로 분류하고, 세금 신고 시즌에 참고할 수 있는 리포트를 만들어주는 서비스.

> ⚠️ 이 코드는 일반적인 정보 제공 도구이며, 세무 신고는 반드시 세무사와 상담하시기 바랍니다.

## Phase 0, 1, 2, 3에서 완성된 것

- Spring Boot REST API 뼈대 (JWT 인증, CORS 설정)
- 회원가입 / 로그인 API
- 구독 CRUD API (업무용/개인용 분류, 참고 계정과목 필드 포함)
- React + TypeScript 프론트엔드 (로그인/회원가입/대시보드 화면, 라우팅, API 연동)
- 구독료 리포트 CSV/PDF 다운로드 (업무용/개인용 필터, 기간 필터, 월 환산 합계 포함)
- 서비스명 기반 업무용/개인용 + 계정과목 자동 추천 (키워드 사전 매칭, 확정 판정 아닌 참고용)
- **대시보드 차트** — 업무/개인 비율(파이), 계정과목별 합계(막대), 최근 6개월 등록 추이(막대)

## 아직 없는 것 (다음 Phase)

- Phase 4: 결제(구독 과금) 연동, PostgreSQL 전환, 배포

## 로컬 실행 방법

### 백엔드 (Spring Boot)

```bash
cd backend
./gradlew bootRun
```

`http://localhost:8080`에서 API 서버 실행. 로컬은 H2 인메모리 DB를 써서 별도 DB 설치가 필요 없음.
H2 콘솔: `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:pinpoint`)

### 프론트엔드 (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

`http://localhost:5173`에서 접속.

## API 요약

| Method | URL | 설명 | 인증 필요 |
| --- | --- | --- | --- |
| POST | /api/auth/signup | 회원가입 | X |
| POST | /api/auth/login | 로그인 | X |
| GET | /api/subscriptions | 내 구독 목록 조회 | O |
| GET | /api/subscriptions/summary | 대시보드 차트용 집계 (업무/개인 합계, 계정과목별, 등록 추이) | O |
| GET | /api/subscriptions/suggest?serviceName= | 업무/개인 분류 + 계정과목 추천 (사전 매칭, 참고용) | O |
| POST | /api/subscriptions | 구독 등록 | O |
| PUT | /api/subscriptions/{id} | 구독 수정 | O |
| DELETE | /api/subscriptions/{id} | 구독 삭제 | O |
| GET | /api/reports/subscriptions/csv | 구독 리포트 CSV 다운로드 (usageType/from/to 쿼리 파라미터) | O |
| GET | /api/reports/subscriptions/pdf | 구독 리포트 PDF 다운로드 (usageType/from/to 쿼리 파라미터) | O |

인증이 필요한 API는 `Authorization: Bearer {accessToken}` 헤더 필요.

## 프로젝트 구조

```
backend/
  src/main/java/com/pinpoint/
    domain/user/          # User 엔티티, Repository
    domain/subscription/  # Subscription 엔티티, 업무/개인 분류 enum
    security/              # JWT 발급/검증, Spring Security 설정
    auth/                  # 회원가입/로그인 API
    subscription/           # 구독 CRUD API
    suggestion/              # 서비스명 기반 업무/개인 + 계정과목 추천 (사전 매칭)
    report/                 # CSV/PDF 리포트 생성
    common/                 # 예외 처리
  src/main/resources/fonts/ # PDF 한글 렌더링용 임베딩 폰트 (NanumGothic)

frontend/
  src/
    api/         # axios 클라이언트, API 호출 함수
    context/     # 인증 상태 관리 (AuthContext)
    pages/       # 로그인/회원가입/대시보드 화면
    types/       # TypeScript 타입 정의
```
