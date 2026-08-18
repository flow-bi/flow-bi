package com.flowbi.domain.room.controller;

class AuthenticationRequiredException extends RuntimeException {

  String code() {
    return "AUTHENTICATION_REQUIRED";
  }
}
