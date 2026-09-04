package com.vikas.docai.exception;


import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import com.vikas.docai.dto.ApiResponse;


@RestControllerAdvice 
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler (ResourceNotFoundException.class)
    public ResponseEntity<?> handleNotFound(ResourceNotFoundException ex){
        logger.warn("Resource not found : {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.builder()
            .success(false)
            .message(ex.getMessage())
            .data(null)
            .timestamp(LocalDateTime.now())
            .build());
    }

    

    @ExceptionHandler (DocumentProcessingException.class)
    public ResponseEntity<ApiResponse<Object>> handleProcessingError(DocumentProcessingException ex){
        logger.warn("Document Processing Error: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_CONTENT)
            .body(ApiResponse.
                builder()
                .success(false)
                .message("Failed to parse the document")
                .timestamp(LocalDateTime.now()).build());

    }

    @ExceptionHandler (MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Object>> handleMaxSize(MaxUploadSizeExceededException ex){
        logger.warn("File size limit exceeded: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_CONTENT)
            .body(ApiResponse.
                builder()
                .success(false)
                .message("File size exceeds the allowed limit (25MB)")
                .timestamp(LocalDateTime.now()).build());
    }

    @ExceptionHandler (MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidation(MethodArgumentNotValidException ex){
        Map<String , String> errors = new HashMap<>();

        for (FieldError error : ex.getBindingResult().getFieldErrors()){
            errors.put(error.getField(), error.getDefaultMessage());
        }

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(
                ApiResponse.<Map<String, String>>builder()
                .success(false)
                .message("Validation Failed")
                .data(errors)
                .timestamp(LocalDateTime.now()).build());

    }

    @ExceptionHandler (IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegalArgument(IllegalArgumentException ex){
        logger.warn("Illegal argument: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(
                    ApiResponse.builder()
                .success(false)
                .message(ex.getMessage())
                .data(null)
                .timestamp(LocalDateTime.now()).build());
    }

    @ExceptionHandler (Exception.class)
    public ResponseEntity<?> handleGeneric(Exception ex){
        logger.error("Unexpected error occurred: ", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(
                    ApiResponse.builder()
                .success(false)
                .message("An unexpected error occurred: " + ex.getMessage())
                .data(null)
                .timestamp(LocalDateTime.now()).build()); 
    }

}
