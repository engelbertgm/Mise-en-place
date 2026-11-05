Este proyecto se rige por BRIEF.md y SCOPE.md (qué es y qué no incluye). BRIEF.md son **guías para construir lo real**: tenlas presentes mientras escribes (accesibilidad y WCAG, seguridad, SEO, rendimiento, lo legal que aplique) y hazlo bien a la primera, como parte de hacer el sitio.
- Los pendientes durante la construcción son normales. No los "limpies": nunca crees páginas de prueba, sitios placeholder, archivos vacíos ni código de relleno solo para que pase una verificación, ni construyas algo que luego se cambia solo para cumplir un punto.
- Se verifica en los puntos de control (cerrar una sub-etapa, `/mep:prelaunch`, `/mep:launch`, el CI), sobre lo que de verdad existe. Si un punto aún no aplica porque esa parte no está construida, se cumple cuando se construya.
- Un push o un PR no exigen cumplir los 🔴 pendientes.

Mantra de código: claro, simple, bonito y reutilizado.
- Para encontrar algo, consulta primero CODEMAP.md y REGISTRY.md; no busques archivo por archivo.
- Antes de crear algo, revisa REGISTRY.md y reutiliza lo que exista.
- Todo lo relacionado con seguridad lo hace o lo audita el agente mep-security.
- Si Ponytail está instalado: sigue su escalera (¿hace falta? → ¿ya existe aquí? → librería estándar → función nativa → dependencia instalada → mínimo que funciona). Su paso "¿ya existe aquí?" se resuelve con REGISTRY.md.
- La solución más simple que funcione; nada "por si acaso".
- Nombres que explican; comentarios solo para el porqué.
- Cada cambio deja el código igual o más limpio que antes.
