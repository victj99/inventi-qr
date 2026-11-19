package com.nexo.inventario.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "registros", indexes = @Index(name = "idx_registros_activo", columnList = "activoId"))
public class Registro {
    @Id
    public UUID id = UUID.randomUUID();

    public UUID activoId;

    public String tipo;

    public String estado = "abierta";

    public Instant fecha = Instant.now();

    public Instant cerradaEn;

    @Column(length = 2000)
    public String descripcion;

    public String tecnico;

    public BigDecimal costo;

    public LocalDate proxima;
}
