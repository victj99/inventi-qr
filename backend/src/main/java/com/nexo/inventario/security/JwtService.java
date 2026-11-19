package com.nexo.inventario.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {
    private final SecretKey key;

    public JwtService(@Value("${app.jwt-secret}") String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generar(UUID id, String rol, String nombre, String email, int version) {
        return Jwts.builder()
                .subject(id.toString())
                .claim("rol", rol)
                .claim("nombre", nombre)
                .claim("email", email)
                .claim("ver", version)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 8 * 3600_000))
                .signWith(key)
                .compact();
    }

    public io.jsonwebtoken.Claims parsear(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
