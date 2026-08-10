# Flowbi Server

## Local PostgreSQL and Redis

PostgreSQL과 Redis는 Docker Compose로 실행한다. 두 서비스의 포트를 로컬 호스트에만
노출하며, PostgreSQL 데이터와 Redis AOF 데이터는 각각 Docker Volume에 저장한다.

1. `backend/.env.example`을 `backend/.env`로 복사한다.
2. `.env`의 `POSTGRES_PASSWORD`, `REDIS_PASSWORD`를 서로 다른 로컬 전용 비밀번호로 변경한다.
3. `backend/`에서 PostgreSQL과 Redis를 실행한다.

```bash
docker compose up -d postgres redis
docker compose ps
docker compose exec postgres pg_isready -U flowbi -d flowbi
docker compose exec redis sh -c 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping'
```

두 서비스가 `healthy`이고 Redis 명령에서 `PONG`이 출력되면 준비된 상태다. Backend는
`local` Profile에서 같은 `.env`의 PostgreSQL 접속 설정을 읽는다.

```bash
./gradlew bootRun --args='--spring.profiles.active=local'
```

Windows에서는 `./gradlew` 대신 `gradlew.bat`을 사용할 수 있다. 기본 Profile과 테스트는
기존 H2 설정을 유지하며, `local` Profile에서만 Docker PostgreSQL로 전환한다.
호스트의 `5432` 포트를 이미 사용 중이면 `.env`의 `POSTGRES_PORT`를 `5433`처럼 사용 가능한
포트로 변경한다. Backend의 `local` Profile도 같은 값을 자동으로 사용한다.

서비스를 중지할 때는 데이터를 유지하는 `docker compose down`을 사용한다. PostgreSQL과
Redis의 로컬 데이터까지 삭제하는 `docker compose down -v`는 데이터 삭제가 의도된
경우에만 실행한다.

현재 구성은 Redis 연결 환경만 제공한다. Spring Session, 캐시 정책과 애플리케이션 Key는
각 기능 구현 Task에서 별도로 구성한다.

## Pre-commit Hook

Repository를 Clone한 뒤 `backend/` 디렉터리에서 최초 한 번 실행한다.

```bash
chmod +x scripts/pre-commit
git config core.hooksPath scripts
```

`git config --get core.hooksPath` 결과가 `scripts`인지 확인한다. Hook은 Staged Java 파일에 Spotless Formatting을 적용하지만 테스트와 빌드를 대체하지 않는다.
