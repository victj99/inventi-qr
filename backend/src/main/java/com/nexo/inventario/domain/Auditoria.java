package com.nexo.inventario.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "auditorias")
public class Auditoria {

    @Id
    public UUID id = UUID.randomUUID();

    public String ubicacion;

    public UUID autor;

    public String autorNombre;

    public Instant inicio = Instant.now();

    public Instant fin;

    public String estado = "abierta";

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "auditoria_esperados", joinColumns = @JoinColumn(name = "auditoria_id"))
    @Column(name = "activo_id")
    public List<UUID> esperados = new ArrayList<>();
}
