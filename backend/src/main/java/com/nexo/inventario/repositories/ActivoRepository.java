package com.nexo.inventario.repositories;

import com.nexo.inventario.domain.Activo;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivoRepository extends JpaRepository<Activo, UUID> {
    Optional<Activo> findByCodigoIgnoreCase(String codigo);

    Optional<Activo> findBySerieIgnoreCase(String serie);

    List<Activo> findByUbicacion(String ubicacion);

    boolean existsByCodigoIgnoreCase(String codigo);
}
