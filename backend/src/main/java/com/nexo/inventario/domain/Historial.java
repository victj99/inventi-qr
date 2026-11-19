package com.nexo.inventario.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "historial", indexes = @Index(name = "idx_historial_activo", columnList = "activoId"))
public class Historial {

    @Id
    public UUID id = UUID.randomUUID();

    public UUID activoId;

    public Instant fecha = Instant.now();

    public UUID autor;

    public String autorNombre;

    public String accion;

    @Column(length = 2000)
    public String antes;

    @Column(length = 2000)
    public String despues;
}
