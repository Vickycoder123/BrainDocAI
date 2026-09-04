package com.vikas.docai.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;

@Configuration 
public class ProjectConfig {

    @Bean 
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(
                    new Info()
                        .title("DocAI - AI Document Intelligence & RAG backend")
                        .description("API documentation for DocAI Backend")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Vikas DocAI")
                                .email("vikaskumarg800@gmail.com")
                                .url("https://www.iraje.com"))
                );
                
    }

}
