## verifier-result-collection

기존 single-flight verifier 요청의 최종 결과만 수집한다. 제품 구현이나 테스트를 수정하지 않고,
완료된 검증을 재실행하지 않는다. session 또는 진행 중 증거가 있는 `NOT_RUN`을 최종 결과로 다시
제출하지 말고 wait/poll하여 `PASS` 또는 `FAIL`과 비어 있지 않은 증거를 반환한다.

결과 수집은 최초 호출을 포함해 총 3회까지만 허용된다.
