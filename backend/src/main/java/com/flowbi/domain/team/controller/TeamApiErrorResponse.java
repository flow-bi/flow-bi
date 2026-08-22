package com.flowbi.domain.team.controller;

import java.util.List;

public record TeamApiErrorResponse(String code, String message, List<Object> fieldErrors) {
}
