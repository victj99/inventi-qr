package com.nexo.inventario.services;

import com.nexo.inventario.domain.*;
import com.nexo.inventario.repositories.ActivoRepository;
import com.nexo.inventario.repositories.HistorialRepository;
import io.jsonwebtoken.Claims;
import java.time.LocalDate;
import java.util.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ActivoService {
  public static final List<String> ESTADOS_OP = List.of("operativo", "averiado", "en mantenimiento", "de baja");
  public static final List<String> ASIGNACIONES = List.of("disponible", "asignado", "prestado", "extraviado");
  private static final List<String> CAMPOS_TEXTO = List.of(
      "codigo",
      "tipo",
      "marca",
      "modelo",
      "serie",
      "ubicacion",
      "responsable",
      "estadoOp",
      "asignacion");
  private static final List<String> CAMPOS_FECHA = List.of("compra", "garantiaHasta");

  private final ActivoRepository activos;
  private final HistorialRepository historial;
  /** Auto-inyección: asignar/devolver/baja deben pasar por el proxy para que @Transactional aplique. */
  private final ObjectProvider<ActivoService> self;

  public ActivoService(
      ActivoRepository activos,
      HistorialRepository historial,
      ObjectProvider<ActivoService> self) {
    this.activos = activos;
    this.historial = historial;
    this.self = self;
  }

  public List<Activo> listar() {
    return activos.findAll();
  }

  public Activo obtener(UUID id) {
    return activos
        .findById(id)
        .orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Activo no encontrado"));
  }

  @Transactional
  public Activo crear(Activo datos, Claims autor) {
    String codigo = datos.codigo == null ? "" : datos.codigo.trim();
    if (!codigo.isEmpty() && activos.existsByCodigoIgnoreCase(codigo)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Ya existe un activo con el código " + codigo);
    }
    if (codigo.isEmpty()) {
      long n = activos.count() + 1;
      do {
        codigo = String.format("TI-%04d", n++);
      } while (activos.existsByCodigoIgnoreCase(codigo));
    }
    if (datos.serie != null
        && !datos.serie.isBlank()
        && activos.findBySerieIgnoreCase(datos.serie.trim()).isPresent()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Ya existe un activo con la serie " + datos.serie);
    }
    Activo a = new Activo();
    a.codigo = codigo;
    a.tipo = datos.tipo;
    a.marca = datos.marca;
    a.modelo = datos.modelo;
    a.serie = datos.serie == null || datos.serie.isBlank() ? null : datos.serie.trim();
    a.compra = datos.compra;
    a.garantiaHasta = datos.garantiaHasta;
    a.ubicacion = datos.ubicacion;
    a.responsable = datos.responsable == null ? "" : datos.responsable;
    a.estadoOp = ESTADOS_OP.contains(datos.estadoOp) ? datos.estadoOp : "operativo";
    a.asignacion = ASIGNACIONES.contains(datos.asignacion) ? datos.asignacion : "disponible";
    activos.save(a);
    entrada(a.id, autor, "Alta del activo", "", codigo);
    return a;
  }

  /** Importación masiva (CSV): todas las filas se confirman juntas o no se confirma ninguna. */
  @Transactional
  public List<Activo> importar(List<Activo> filas, Claims autor) {
    List<Activo> creados = new ArrayList<>();
    for (Activo f : filas) creados.add(crear(f, autor));
    return creados;
  }

  @Transactional
  public Activo editar(UUID id, Map<String, Object> parche, Claims autor, String accion) {
    Activo a = obtener(id);
    List<Historial> nuevos = new ArrayList<>();
    for (String campo : CAMPOS_TEXTO) {
      if (!parche.containsKey(campo))
        continue;
      String nuevo = str(parche.get(campo));
      String actual = texto(a, campo);
      if (Objects.equals(actual, nuevo))
        continue;
      if (campo.equals("codigo")
          && !nuevo.isEmpty()
          && activos.existsByCodigoIgnoreCase(nuevo)
          && !nuevo.equalsIgnoreCase(a.codigo)) {
        throw new ResponseStatusException(
            HttpStatus.CONFLICT, "Ya existe un activo con el código " + nuevo);
      }
      if (campo.equals("serie")
          && !nuevo.isEmpty()
          && activos.findBySerieIgnoreCase(nuevo).filter(x -> !x.id.equals(id)).isPresent()) {
        throw new ResponseStatusException(
            HttpStatus.CONFLICT, "Ya existe un activo con la serie " + nuevo);
      }
      if (campo.equals("estadoOp") && !ESTADOS_OP.contains(nuevo))
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado operativo inválido");
      if (campo.equals("asignacion") && !ASIGNACIONES.contains(nuevo))
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Asignación inválida");
      nuevos.add(nuevaEntrada(a.id, autor, accion + ": " + campo, actual, nuevo));
      setTexto(a, campo, nuevo);
    }
    for (String campo : CAMPOS_FECHA) {
      if (!parche.containsKey(campo))
        continue;
      LocalDate nuevo = fecha(parche.get(campo));
      LocalDate actual = campo.equals("compra") ? a.compra : a.garantiaHasta;
      if (Objects.equals(actual, nuevo))
        continue;
      nuevos.add(
          nuevaEntrada(
              a.id,
              autor,
              accion + ": " + campo,
              actual == null ? "" : actual.toString(),
              nuevo == null ? "" : nuevo.toString()));
      if (campo.equals("compra"))
        a.compra = nuevo;
      else
        a.garantiaHasta = nuevo;
    }
    if (nuevos.isEmpty())
      return a;
    activos.save(a);
    historial.saveAll(nuevos);
    return a;
  }

  public Activo asignar(UUID id, String responsable, Claims autor) {
    return self.getObject()
        .editar(
            id, Map.of("asignacion", "asignado", "responsable", responsable), autor, "Asignación");
  }

  public Activo devolver(UUID id, Claims autor) {
    return self.getObject()
        .editar(id, Map.of("asignacion", "disponible", "responsable", ""), autor, "Devolución");
  }

  public Activo baja(UUID id, Claims autor) {
    return self.getObject()
        .editar(
            id,
            Map.of("estadoOp", "de baja", "asignacion", "disponible", "responsable", ""),
            autor,
            "Baja");
  }

  public void entrada(UUID activoId, Claims autor, String accion, String antes, String despues) {
    historial.save(nuevaEntrada(activoId, autor, accion, antes, despues));
  }

  private Historial nuevaEntrada(
      UUID activoId, Claims autor, String accion, String antes, String despues) {
    Historial h = new Historial();
    h.activoId = activoId;
    h.autor = autor == null ? null : UUID.fromString(autor.getSubject());
    h.autorNombre = autor == null ? "sistema" : autor.get("nombre", String.class);
    h.accion = accion;
    h.antes = antes;
    h.despues = despues;
    return h;
  }

  private static String str(Object o) {
    return o == null ? "" : String.valueOf(o).trim();
  }

  private static LocalDate fecha(Object o) {
    String s = str(o);
    return s.isEmpty() ? null : LocalDate.parse(s);
  }

  private static String texto(Activo a, String campo) {
    return switch (campo) {
      case "codigo" -> a.codigo;
      case "tipo" -> a.tipo;
      case "marca" -> a.marca;
      case "modelo" -> a.modelo;
      case "serie" -> a.serie == null ? "" : a.serie;
      case "ubicacion" -> a.ubicacion;
      case "responsable" -> a.responsable == null ? "" : a.responsable;
      case "estadoOp" -> a.estadoOp;
      case "asignacion" -> a.asignacion;
      default -> "";
    };
  }

  private static void setTexto(Activo a, String campo, String v) {
    switch (campo) {
      case "codigo" -> a.codigo = v;
      case "tipo" -> a.tipo = v;
      case "marca" -> a.marca = v;
      case "modelo" -> a.modelo = v;
      case "serie" -> a.serie = v.isEmpty() ? null : v;
      case "ubicacion" -> a.ubicacion = v;
      case "responsable" -> a.responsable = v;
      case "estadoOp" -> a.estadoOp = v;
      case "asignacion" -> a.asignacion = v;
    }
  }

}
