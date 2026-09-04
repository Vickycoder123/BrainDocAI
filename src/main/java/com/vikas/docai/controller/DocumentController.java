package com.vikas.docai.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping ("api/v1/documents")
@Tag(
    name ="Document Management",
    description = "Endpoints for uploading, listing and managing documents and their vectors embeddings."
)
public class DocumentController {
    @PostMapping 
    @Operation(
        summary = "Upload and index a document(PDF, DOCX, TEXT, MD, CSV)",
        description = "This api is used to upload and index documents files"
    )
    public ResponseEntity<String> uploadDocument(){
        return ResponseEntity.ok("Uploaded");
    }
}
