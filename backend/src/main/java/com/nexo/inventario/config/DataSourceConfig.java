package com.nexo.inventario.config;

import com.zaxxer.hikari.HikariDataSource;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataSourceConfig {
    @Bean
    public DataSource dataSource(
            @Value("${spring.datasource.url}") String url,
            @Value("${spring.datasource.username}") String user,
            @Value("${spring.datasource.password}") String pass,
            @Value("${DB_SCHEMA:inventario_ti}") String schema) {
        HikariDataSource ds = new HikariDataSource();
        String env = System.getenv("DATABASE_URL");
        if (env != null && !env.isBlank()) {
            // Railway entrega postgresql://user:pass@host:port/db (usuario y contraseña URL-encoded).
            if (!esPostgres(env)) {
                throw new IllegalStateException(
                        "DATABASE_URL debe empezar por postgres:// o postgresql:// y no por "
                                + esquema(env)
                                + ". Revisa la variable del servicio.");
            }
            URI u = URI.create(env);
            String userInfo = u.getRawUserInfo();
            if (userInfo == null || userInfo.isBlank()) {
                throw new IllegalStateException("DATABASE_URL no incluye usuario ni contraseña");
            }
            String[] partes = userInfo.split(":", 2);
            int port = u.getPort() > 0 ? u.getPort() : 5432;
            ds.setJdbcUrl(
                    "jdbc:postgresql://"
                            + u.getHost()
                            + ":"
                            + port
                            + u.getPath()
                            + "?currentSchema="
                            + schema);
            ds.setUsername(decodificar(partes[0]));
            ds.setPassword(partes.length > 1 ? decodificar(partes[1]) : "");
        } else {
            if (!esPostgres(url)) {
                throw new IllegalStateException(
                        "spring.datasource.url debe ser jdbc:postgresql://… y no " + esquema(url));
            }
            ds.setJdbcUrl(url);
            ds.setUsername(user);
            ds.setPassword(pass);
        }
        // Aísla las tablas en un esquema propio (no toca otros proyectos de la misma BD).
        try (var c = ds.getConnection();
                var st = c.createStatement()) {
            st.execute("CREATE SCHEMA IF NOT EXISTS " + schema);
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo crear el esquema " + schema, e);
        }
        return ds;
    }

    private static boolean esPostgres(String valor) {
        if (valor == null)
            return false;
        String v = valor.trim().toLowerCase();
        return v.startsWith("postgres://")
                || v.startsWith("postgresql://")
                || v.startsWith("jdbc:postgres://")
                || v.startsWith("jdbc:postgresql://");
    }

    private static String esquema(String valor) {
        if (valor == null || valor.isBlank())
            return "(vacío)";
        int corte = valor.indexOf("://");
        return corte > 0 ? valor.substring(0, corte) : valor.substring(0, Math.min(20, valor.length()));
    }

    private static String decodificar(String valor) {
        // URLDecoder aplica semántica de formularios ('+' = espacio): en una URL de conexión el
        // '+' es un carácter literal, así que se protege antes de decodificar %XX.
        return URLDecoder.decode(valor.replace("+", "%2B"), StandardCharsets.UTF_8);
    }
}
