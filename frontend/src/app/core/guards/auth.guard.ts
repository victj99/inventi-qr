import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { getUsuario, haySesion } from '../services/api.service';
import { can } from '../models/permisos';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  if (haySesion()) return true;
  return router.createUrlTree(['/login'], { queryParams: { next: state.url } });
};

export const loginGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (!haySesion()) return true;
  return router.createUrlTree(['/inicio']);
};

/** Evita que una ruta de permiso se abra escribiendo la URL. El servidor ya la bloquea. */
export const permisoGuard = (accion: string): CanActivateFn => () => {
  const router = inject(Router);
  const usuario = getUsuario();
  if (can(usuario?.rol, accion)) return true;
  return router.createUrlTree(['/inicio']);
};
