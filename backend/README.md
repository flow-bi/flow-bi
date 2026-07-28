# Flowbi Server

## Pre-commit Hook

Repository를 Clone한 뒤 `backend/` 디렉터리에서 최초 한 번 실행한다.

```bash
chmod +x scripts/pre-commit
git config core.hooksPath scripts
```

`git config --get core.hooksPath` 결과가 `scripts`인지 확인한다. Hook은 Staged Java 파일에 Spotless Formatting을 적용하지만 테스트와 빌드를 대체하지 않는다.
