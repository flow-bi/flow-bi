package com.flowbi.common.security;

import java.security.MessageDigest;

final class MessageDigestUtil {

  private MessageDigestUtil() {
  }

  static boolean constantTimeEquals(byte[] expected,byte[] actual) {
    return MessageDigest.isEqual(expected,actual);
  }
}
