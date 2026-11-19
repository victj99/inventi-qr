package com.nexo.inventario.repositories;

import com.nexo.inventario.domain.Registro;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RegistroRepository extends JpaRepository<Registro, UUID> {
    List<Registro> findByActivoId(UUID activoId);
}
