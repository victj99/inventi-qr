package com.nexo.inventario.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "usuarios")
public class Usuario {
    @Id
    public UUID id = UUID.randomUUID();

    public String nombre;

    @Column(unique = true, nullable = false)
    public String email;

    @JsonIgnore
    public String passwordHash;

    @Column(nullable = false)
    public String rol;

    /** Una cuenta inactiva conserva su historial, pero no puede iniciar sesión. */
    @Column(nullable = false, columnDefinition = "boolean default true")
    public boolean activo = true;

    public Instant creadoEn = Instant.now();

    public Instant ultimoAcceso;

    public Instant passwordActualizadoEn;

    /** Se incrementa al cerrar sesiones (desactivar, cambiar rol/correo o contraseña). */
    @Column(nullable = false, columnDefinition = "integer default 0")
    public int tokenVersion = 0;
}
