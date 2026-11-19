package com.nexo.inventario.security;

import com.nexo.inventario.domain.Usuario;
import com.nexo.inventario.repositories.UsuarioRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(JwtFilter.class);

    private final JwtService jwt;
    private final UsuarioRepository usuarios;

    public JwtFilter(JwtService jwt, UsuarioRepository usuarios) {
        this.jwt = jwt;
        this.usuarios = usuarios;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String h = req.getHeader("Authorization");
        if (h != null && h.startsWith("Bearer ")) {
            try {
                Claims c = jwt.parsear(h.substring(7));
                String subject = c.getSubject();
                Object rawVersion = c.get("ver");
                // Un token sin subject o sin versión no se puede validar contra la cuenta: 401.
                if (subject != null && !subject.isBlank() && rawVersion instanceof Number n) {
                    Usuario u = usuarios.findById(UUID.fromString(subject)).orElse(null);
                    if (u != null && u.activo && n.intValue() == u.tokenVersion) {
                        // La autoridad sale de la base de datos; si el claim "rol" no coincide, gana la BD.
                        var auth = new UsernamePasswordAuthenticationToken(
                                c.getSubject(),
                                null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + u.rol)));
                        auth.setDetails(c);
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    }
                }
            } catch (JwtException | IllegalArgumentException e) {
                /* token inválido, expirado o con subject corrupto: queda sin autenticar */
            } catch (RuntimeException e) {
                // Un fallo de configuración o de base de datos no debe parecer un token inválido.
                log.error("Error inesperado al autenticar la petición", e);
                throw e;
            }
        }
        chain.doFilter(req, res);
    }
}
