package com.nexo.inventario.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Autoriza cada endpoint de /api/** contra la matriz de permisos.
 *
 * <p>Deny-by-default: un handler autenticado sin {@link RequirePermiso} (método o clase) y sin
 * {@link PermisosManuales} se rechaza con 403. Las peticiones sin autenticar no llegan aquí con
 * identidad, así que las resuelve la cadena de Spring Security (401) antes de este interceptor.
 */
@Component
public class PermisoInterceptor implements HandlerInterceptor, WebMvcConfigurer {
    private static final Logger log = LoggerFactory.getLogger(PermisoInterceptor.class);

    /** Evita repetir el aviso en cada petición al mismo endpoint. */
    private final Set<String> avisados = ConcurrentHashMap.newKeySet();

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(this).addPathPatterns("/api/**");
    }

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        if (!(handler instanceof HandlerMethod hm))
            return true;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null
                || !auth.isAuthenticated()
                || auth instanceof AnonymousAuthenticationToken) {
            // La cadena de seguridad ya decide (401) sobre las peticiones sin sesión.
            return true;
        }

        // Una anotación explícita siempre manda, aunque el controlador resuelva otros permisos a mano.
        RequirePermiso p = hm.getMethodAnnotation(RequirePermiso.class);
        if (p == null)
            p = hm.getBeanType().getAnnotation(RequirePermiso.class);
        if (p != null) {
            String rol = rol();
            if (rol == null || !Permisos.can(rol, p.value())) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN, "Tu rol no permite esta acción");
            }
            return true;
        }

        if (permisosManuales(hm))
            return true;

        String endpoint = hm.getBeanType().getSimpleName() + "." + hm.getMethod().getName();
        if (avisados.add(endpoint)) {
            log.warn(
                    "Endpoint /api sin @RequirePermiso ni @PermisosManuales: {} ({}). Se rechaza por defecto.",
                    endpoint,
                    req.getRequestURI());
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permiso para esta acción");
    }

    private static boolean permisosManuales(HandlerMethod hm) {
        return hm.hasMethodAnnotation(PermisosManuales.class)
                || hm.getBeanType().isAnnotationPresent(PermisosManuales.class);
    }

    /** Rol vigente según la autoridad que puso {@link JwtFilter} a partir de la base de datos. */
    public static String rol() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a == null || !a.isAuthenticated())
            return null;
        for (GrantedAuthority g : a.getAuthorities()) {
            String v = g.getAuthority();
            if (v != null && v.startsWith("ROLE_"))
                return v.substring("ROLE_".length());
        }
        return null;
    }

    public static Claims claims() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        return a != null && a.getDetails() instanceof Claims c ? c : null;
    }
}
