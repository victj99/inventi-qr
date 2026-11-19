package com.nexo.inventario.controllers;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

/** Devuelve mensajes de error legibles para la interfaz (400, 401, 403, 404, 409, 429…). */
@RestControllerAdvice
public class ApiErrors {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> estado(ResponseStatusException ex) {
        String mensaje = ex.getReason() != null ? ex.getReason() : "No se pudo completar la operación";
        return cuerpo(ex.getStatusCode().value(), mensaje);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> validacion(MethodArgumentNotValidException ex) {
        String detalle = ex.getBindingResult().getFieldErrors().stream()
                .map(ApiErrors::campo)
                .distinct()
                .collect(Collectors.joining(", "));
        if (detalle.isEmpty()) {
            detalle = "revisa los datos enviados";
        }
        return cuerpo(400, "Datos no válidos: " + detalle);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> cuerpoInvalido(HttpMessageNotReadableException ex) {
        return cuerpo(400, "El cuerpo de la solicitud no es válido");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> duplicado(DataIntegrityViolationException ex) {
        return cuerpo(409, "Ya existe un registro con esos datos (código o serie duplicados)");
    }

    private static String campo(FieldError e) {
        String motivo = e.getDefaultMessage() == null ? "no válido" : e.getDefaultMessage();
        return e.getField() + " " + motivo;
    }

    private ResponseEntity<Map<String, Object>> cuerpo(int estado, String mensaje) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", estado);
        body.put("message", mensaje);
        return ResponseEntity.status(estado).body(body);
    }
}
