# 빗썸 코인 데이터 수집기

빗썸 공개 API를 활용한 실시간 코인 데이터 수집 및 MySQL 저장 시스템입니다.

## 주요 기능

- 빗썸 공개 API를 통한 실시간 코인 시세 데이터 수집
- MySQL 데이터베이스 자동 저장
- Linux 데몬 프로세스 지원
- PM2를 통한 프로세스 관리
- 상세한 로깅 및 에러 처리
- CLI 인터페이스를 통한 다양한 명령어 지원

## 시스템 요구사항

- Node.js 16.0.0 이상
- MySQL 8.0 이상
- PM2 (프로세스 관리용)

## 설치

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일에서 데이터베이스 설정

# 데이터베이스 초기화
npm run db-setup
```

## 환경 설정

`.env` 파일에서 다음 설정을 구성하세요:

```env
# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=bithumb_data

# 애플리케이션 설정
NODE_ENV=production
LOG_LEVEL=info

# 수집 설정
DEFAULT_INTERVAL=60000
MAX_RETRIES=3
```

## 사용법

### 기본 명령어

```bash
# 특정 코인 데이터 수집 시작
npm start -- collect -s BTC,ETH,XRP -i 60000

# 데몬 모드로 실행
npm start -- collect --daemon

# 전체 코인 한 번 수집
npm start -- collect --once

# 상태 확인
npm start -- status

# 로그 조회
npm start -- logs -l 50

# API 연결 테스트
npm start -- test-api -s BTC
```

### PM2를 이용한 데몬 관리

```bash
# 데몬 시작
npm run daemon

# 데몬 중지
npm run daemon-stop

# 데몬 재시작
npm run daemon-restart

# 로그 확인
npm run daemon-logs

# 상태 확인
npm run daemon-status
```

## 프로젝트 구조

```
src/
├── config/          # 설정 파일들
│   └── database.js  # 데이터베이스 연결 설정
├── database/        # 데이터베이스 관련
│   ├── schema.sql   # 데이터베이스 스키마
│   └── models.js    # 데이터 모델
├── api/             # API 클라이언트
│   └── bithumb.js   # 빗썸 API 클라이언트
├── services/        # 비즈니스 로직
│   └── collector.js # 데이터 수집 서비스
├── utils/           # 유틸리티
│   └── logger.js    # 로깅 시스템
└── index.js         # 메인 CLI 인터페이스
```

## 데이터베이스 스키마

- `coins`: 코인 기본 정보
- `price_data`: 실시간 시세 데이터
- `collection_logs`: 데이터 수집 로그
- `system_config`: 시스템 설정

## 개발 가이드

```bash
# 개발 모드 실행
npm run dev

# 코드 스타일 검사
npm run lint

# 테스트 실행
npm test
```

## 라이선스

MIT License