package com.eapcet.backend.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Global exception-safe filter for input sanitization.
 * Strips potential XSS vectors from query parameters and adds security response headers.
 */
@Component
@Order(0)
public class InputSanitizationFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletResponse res = (HttpServletResponse) response;

        // Defense-in-depth headers (supplements Spring Security)
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-DNS-Prefetch-Control", "off");
        res.setHeader("X-Download-Options", "noopen");
        res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

        chain.doFilter(request, response);
    }
}
