package com.nexo.inventario.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marca un controlador (o método) que resuelve el permiso a mano, porque depende del cuerpo de la
 * petición y no de una única acción fija. El interceptor confía en esa comprobación explícita.
 *
 * <p>Uso restringido a {@code RegistroController}: crear/cerrar exigen "falla" o "mantenimiento"
 * según el tipo del registro.
 */
@Target({ ElementType.METHOD, ElementType.TYPE })
@Retention(RetentionPolicy.RUNTIME)
public @interface PermisosManuales {
}
