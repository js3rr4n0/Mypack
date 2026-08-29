"use client";

import { Component, type ReactNode } from "react";

/**
 * Aisla la escena 3D del resto de la pagina.
 *
 * Sin esto, cualquier fallo dentro del canvas (WebGL no disponible, un recurso
 * que no carga, un driver que se cae) revienta todo el arbol de React y la
 * landing queda en blanco. Con esto, el 3D se degrada y la pagina sigue viva:
 * las zonas se siguen pudiendo comprar desde la lista y desde la vista 360.
 */
export default class CanvasBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[3d] la escena fallo, se usa el respaldo", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
