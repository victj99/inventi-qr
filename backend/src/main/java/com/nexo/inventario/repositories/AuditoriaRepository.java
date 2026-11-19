package com.nexo.inventario.repositories;

import com.nexo.inventario.domain.Auditoria;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditoriaRepository extends JpaRepository<Auditoria, UUID> {
    List<Auditoria> findAllByOrderByInicioDesc();
}
