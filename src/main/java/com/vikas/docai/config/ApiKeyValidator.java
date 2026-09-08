package com.vikas.docai.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Reports an unresolved Gemini API key at startup.
 *
 * <p>The {@code .env} import in application.yml is marked {@code optional:} so that
 * CI and Docker can supply real environment variables instead. The cost of that is a
 * silent failure: when the file is not found, the placeholders fall back to
 * {@code demo-key} and the application starts looking perfectly healthy. The problem
 * only surfaces later, as an opaque {@code 400 "Please pass a valid API key"} on the
 * first chat or search request — and on the streaming endpoint it surfaces as a bare
 * 500 with an empty body, because the exception is thrown inside the reactive stream
 * after the response has committed and so never reaches GlobalExceptionHandler.
 *
 * <p>This listener turns that into an unmissable message at the point of failure.
 * It deliberately logs rather than aborting startup: document listing and deletion
 * work without a key, and failing hard would break deployments that legitimately
 * inject credentials by other means.
 */
@Component
public class ApiKeyValidator {

    private static final Logger log = LoggerFactory.getLogger(ApiKeyValidator.class);

    /** The fallback defined for every ${GEMINI_API_KEY} placeholder in application-dev.yml. */
    private static final String UNRESOLVED_PLACEHOLDER = "demo-key";

    private final String chatApiKey;
    private final String embeddingApiKey;

    public ApiKeyValidator(
            @Value("${spring.ai.openai.api-key:}") String chatApiKey,
            @Value("${spring.ai.google.genai.embedding.api-key:}") String embeddingApiKey
    ) {
        this.chatApiKey = chatApiKey;
        this.embeddingApiKey = embeddingApiKey;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void verifyApiKeys() {

        boolean chatMissing = isUnresolved(chatApiKey);
        boolean embeddingMissing = isUnresolved(embeddingApiKey);

        if (!chatMissing && !embeddingMissing) {
            log.info("Gemini API key resolved for chat and embeddings.");
            return;
        }

        log.error("""

                ===============================================================================
                 GEMINI API KEY NOT RESOLVED{}
                ===============================================================================
                 Chat model      : {}
                 Embedding model : {}

                 Every chat, search and upload request will fail with:
                   400 "Please pass a valid API key" (INVALID_ARGUMENT)

                 Cause: GEMINI_API_KEY was not found. The .env import in application.yml is
                 resolved against the JVM's working directory, which is currently:
                   {}

                 Fix by doing any one of the following:
                   1. Start from the module directory, so .env is found:
                        cd DocAiBackend && ./mvnw spring-boot:run
                   2. Export the variable before launching:
                        export GEMINI_API_KEY=<your-key>
                   3. If launching from an IDE, set the run configuration's working
                      directory to the DocAiBackend module.
                ===============================================================================
                """,
                chatMissing != embeddingMissing ? " (PARTIALLY)" : "",
                chatMissing ? "MISSING" : "ok",
                embeddingMissing ? "MISSING" : "ok",
                System.getProperty("user.dir"));
    }

    private boolean isUnresolved(String apiKey) {
        return apiKey == null || apiKey.isBlank() || UNRESOLVED_PLACEHOLDER.equals(apiKey.trim());
    }
}
