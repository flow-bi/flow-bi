#!/usr/bin/env bash
# Git Bash 실행 방법(저장소 루트 기준):
#   bash backend/scripts/prepare-gradle.sh
#
# 먼저 backend/.env.local에 절대 경로로 JAVA_HOME을 설정해야 합니다.

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
backend_root="$(cd -- "$script_dir/.." && pwd -P)"
env_file="$backend_root/.env.local"
gradle_wrapper="$backend_root/gradlew.bat"
init_script="$script_dir/resolve-all-dependencies.gradle"

if ! command -v cygpath >/dev/null 2>&1; then
    printf '이 스크립트는 cygpath를 제공하는 Git Bash에서 실행해야 합니다.\n' >&2
    exit 1
fi

if [[ ! -f "$env_file" ]]; then
    printf 'backend/.env.local 파일에 JAVA_HOME을 설정하세요.\n' >&2
    exit 1
fi

java_line="$(grep -m 1 -E '^[[:space:]]*JAVA_HOME[[:space:]]*=' "$env_file" || true)"
if [[ -z "$java_line" ]]; then
    printf 'backend/.env.local에 JAVA_HOME이 없습니다.\n' >&2
    exit 1
fi

java_home="$(
    printf '%s' "${java_line#*=}" |
        sed -E "s/^[[:space:]\"']+//; s/[[:space:]\"']+$//"
)"

if [[ ! "$java_home" =~ ^([[:alpha:]]:[\\/]|/|\\\\) ]]; then
    printf 'JAVA_HOME은 절대 경로여야 합니다: %s\n' "$java_home" >&2
    exit 1
fi

java_home_windows="$(cygpath -aw "$java_home")"
java_home_posix="$(cygpath -au "$java_home_windows")"
java_executable="$java_home_posix/bin/java.exe"

if [[ ! -f "$java_executable" ]]; then
    printf 'JAVA_HOME이 올바르지 않습니다: %s\n' "$java_home" >&2
    exit 1
fi

if [[ ! -f "$gradle_wrapper" ]]; then
    printf 'Gradle Wrapper를 찾을 수 없습니다: %s\n' "$gradle_wrapper" >&2
    exit 1
fi

if [[ ! -f "$init_script" ]]; then
    printf 'Gradle 초기화 스크립트를 찾을 수 없습니다: %s\n' "$init_script" >&2
    exit 1
fi

gradle_user_home="$backend_root/.gradle-user-home"
worker_temp="$gradle_user_home/tmp"
worker_home="$gradle_user_home/worker-home"

mkdir -p -- "$worker_temp" "$worker_home"

gradle_user_home_windows="$(cygpath -aw "$gradle_user_home")"
worker_temp_windows="$(cygpath -aw "$worker_temp")"
worker_home_windows="$(cygpath -aw "$worker_home")"
init_script_windows="$(cygpath -aw "$init_script")"

export JAVA_HOME="$java_home_windows"
export PATH="$java_home_posix/bin:$PATH"
export GRADLE_USER_HOME="$gradle_user_home_windows"
export TEMP="$worker_temp_windows"
export TMP="$worker_temp_windows"
export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:+$JAVA_TOOL_OPTIONS }-Djava.io.tmpdir=\"$worker_temp_windows\" -Duser.home=\"$worker_home_windows\""

invoke_gradle() {
    if ! MSYS2_ARG_CONV_EXCL='*' "$gradle_wrapper" "$@"; then
        printf 'Gradle 실행 실패: %s\n' "$*" >&2
        return 1
    fi
}

cd -- "$backend_root"

invoke_gradle --version
invoke_gradle \
    --no-daemon \
    --refresh-dependencies \
    --init-script "$init_script_windows" \
    resolveAllDependencies \
    spotlessCheck \
    test \
    build
invoke_gradle \
    --offline \
    --no-daemon \
    clean \
    --init-script "$init_script_windows" \
    resolveAllDependencies \
    spotlessCheck \
    test \
    build

printf 'Gradle 의존성 준비와 오프라인 검증이 완료되었습니다.\n'
