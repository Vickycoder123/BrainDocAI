package com.vikas.docai.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.vikas.docai.dto.ApiResponse;
import com.vikas.docai.dto.DocumentResponseDto;

import org.apache.james.mime4j.dom.Multipart;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;


@RestController
@RequestMapping ("api/v1/documents")
@Tag(
    name ="Document Management",
    description = "Endpoints for uploading, listing and managing documents and their vectors embeddings."
)
@RequiredArgsConstructor 
public class DocumentController {

    private final DocumentService documentService;
    @PostMapping (value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
        summary = "Upload and index a document(PDF, DOCX, TEXT, MD, CSV)",
        description = "This api is used to upload and index documents files"
    )
    public ResponseEntity<DocumentResponseDto> uploadDocument(@RequestParam("file")Multipart file)
    {

        // process the file
        DocumentResponseDto documentResponseDto = this.documentService.uploadAndProcess(file);


        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.<DocumentResponseDto>builder()
            .success(true)
            .data(documentResponseDto)
            .message("File indexed successfully")
            .build());
    }
}
