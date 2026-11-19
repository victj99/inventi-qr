package com.nexo.inventario.repositories;

import com.nexo.inventario.domain.Usuario;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {
    Optional<Usuario> findByEmail(String email);

    long countByRolAndActivoTrue(String rol);
}
