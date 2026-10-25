Este proyecto se rige por BRIEF.md (checklist) y SCOPE.md (qué es y qué no incluye). Los ítems 🔴 son requisitos no negociables.

Mantra de código: claro, simple, bonito y reutilizado.
- Para encontrar algo, consulta primero CODEMAP.md y REGISTRY.md; no busques archivo por archivo.
- Antes de crear algo, revisa REGISTRY.md y reutiliza lo que exista.
- Todo lo relacionado con seguridad lo hace o lo audita el agente mep-security.
- Ponytail está activo: sigue su escalera (¿hace falta? → ¿ya existe aquí? → librería estándar → función nativa → dependencia instalada → mínimo que funciona). Su paso "¿ya existe aquí?" se resuelve con REGISTRY.md.
- La solución más simple que funcione; nada "por si acaso".
- Nombres que explican; comentarios solo para el porqué.
- Cada cambio deja el código igual o más limpio que antes.
