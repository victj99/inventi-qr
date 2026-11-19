package com.nexo.inventario.repositories;

import com.nexo.inventario.domain.Historial;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HistorialRepository extends JpaRepository<Historial, UUID> {
    List<Historial> findByActivoIdOrderByFechaDesc(UUID activoId);
}
