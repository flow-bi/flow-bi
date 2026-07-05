package com.flowbi.common.response;

public record ApiResponse<T>(boolean success, T data, String message) {

  public static <T> ApiResponse<T> success(T data) {
    return new ApiResponse<>(true, data, "요청이 성공적으로 처리되었습니다.");
  }

  public static <T> ApiResponse<T> success(T data,String message) {
    return new ApiResponse<>(true, data, message);
  }
}
