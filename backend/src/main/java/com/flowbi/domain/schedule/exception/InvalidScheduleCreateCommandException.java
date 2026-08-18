package com.flowbi.domain.schedule.exception;

import com.flowbi.domain.schedule.audit.*;
import com.flowbi.domain.schedule.controller.*;
import com.flowbi.domain.schedule.dto.*;
import com.flowbi.domain.schedule.entity.*;
import com.flowbi.domain.schedule.repository.*;
import com.flowbi.domain.schedule.service.*;

public class InvalidScheduleCreateCommandException extends RuntimeException {

  public InvalidScheduleCreateCommandException(String message) {
    super(message);
  }
}
