package com.nexo.inventario.repositories;

import com.nexo.inventario.domain.Lectura;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LecturaRepository extends JpaRepository<Lectura, Lectura.LecturaId> {
    List<Lectura> findByAuditoriaId(UUID auditoriaId);

    long countByAuditoriaId(UUID auditoriaId);
}
