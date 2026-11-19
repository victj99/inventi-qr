package com.nexo.inventario;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

// La autenticación es propia (JwtFilter + UsuarioService): no hay usuario en memoria que
// Spring Security deba crear, así que se excluye el que genera la contraseña por consola.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class InventarioApplication {
    public static void main(String[] args) {
        SpringApplication.run(InventarioApplication.class, args);
    }
}
