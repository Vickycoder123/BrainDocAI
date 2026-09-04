package com.vikas.docai.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;

@RestController 
@RequestMapping ("/api/v1/chat")
@Tag (
    name = "Chat Management",
    description = "All chat related apis goes here."
)
public class ChatController {

    @PostMapping 
    public ResponseEntity<String> chat(){
        return ResponseEntity.ok("This is just testing configurations");
    }
}
