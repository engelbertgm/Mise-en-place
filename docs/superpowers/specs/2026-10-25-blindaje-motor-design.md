# Blindaje del motor de mep — diseño

Fecha: 2026-10-25 · Proyecto 1 de 4 (motor → interfaz → reglas nuevas → verificaciones más reales)

## Intención

mep existe para que un proyecto (website, webapp, SaaS) no salga con algo faltante que termine en una demanda, ni con calidad de "vibecoding". Quien escribe casi todo el código es Claude. Por eso los bloqueos de mep tienen que aguantar también los atajos del propio agente: hoy varios se pueden saltar sin que nadie se entere.

El objetivo no es hacer mep invulnerable a un atacante con acceso a la máquina (imposible: el agente tiene shell). El objetivo es que **ningún atajo sea silencioso**: saltarse un bloqueo debe requerir una acción del humano, o dejar un rastro que el CI detecta y bloquea.

**Nivel de blindaje elegido por el usuario (opción A):** cerrar todos los atajos obvios y hacer visible el resto. Un agente que se lo salte a propósito (script aparte que edita el perfil y recalcula el sello, o que llama al motor con la marca de canal humano) no se puede impedir en la misma máquina; ese caso se cubre con visibilidad: todo cambio de estado de mep aparece en el resumen del CI del PR a main (sección G), y el humano lo ve antes de hacer merge. Se descartó (opción B) exigir aprobación en GitHub para cada acción humana: más costoso y saca al humano de Claude Code.

## Huecos encontrados (estado en 0.1.6)

1. `.mep/profile.yaml` se puede editar directo (Edit/Write o Bash): cerrar sub-etapas, agregar overrides, `manual_confirmed`, sin pasar por la CLI.
2. `mep security record` lo puede correr cualquiera, y quien lo corre elige qué archivos se hashean (`--files README.md` en vez del archivo de auth).
3. `mep confirm <id> --by <nombre>` acepta cualquier nombre; Claude puede confirmar ítems manuales a nombre del humano. `override` y `threshold --yes` igual.
4. `prReviewGate` (`engine/src/gate.ts`) bloquea solo el primer intento de PR; el segundo pasa sin comprobar que hubo revisión.
5. El gate de deploy (`engine/src/deploy.ts`, `hooks/hooks.json`, `mods/register.ts`) solo reconoce `vercel`, `netlify`, `git push` y `gh pr`.

## Metas

- G1. Ningún archivo de estado de mep cambia por fuera de la CLI de mep sin que `mep verify` lo detecte y bloquee.
- G2. Las acciones que solo el humano debe tomar (confirmar un manual, desactivar un 🔴, relajar un umbral) no las puede completar Claude desde su Bash.
- G3. Un reporte de seguridad siempre cubre los archivos sensibles del repo relacionados con el ítem, aunque quien lo registra pase menos.
- G4. El PR a main exige una revisión registrada para ese commit, no un segundo intento.
- G5. El gate de deploy reconoce las plataformas comunes del stack de websites/webapps/SaaS.

## No-metas

- Firma criptográfica (HMAC, llaves): la llave viviría en la misma máquina que el agente; no agrega protección real frente a la guardia + detección.
- La interfaz visual (panel, silenciar el hook Stop): es el proyecto 2. Aquí solo se deja el mecanismo de "acción humana" que el panel usará después.
- Reglas nuevas del catálogo: proyecto 3.

## Anti-metas (sería un fracaso aunque funcione)

- Que el blindaje bloquee el flujo normal: los comandos legítimos de mep (`mep init`, `mep add --apply`, `mep phase close`, `mep codemap`, etc.) que escriben en `.mep/` deben seguir funcionando cuando los corre Claude.
- Falsos positivos de deploy: `vercel env pull`, `wrangler dev`, `firebase emulators:start`, `supabase start` no son deploys.
- Que el humano tenga que salir de Claude Code para cada confirmación en el caso normal.

## Diseño

### A. Guardia sobre `.mep/` (G1)

Archivos de estado protegidos: `.mep/profile.yaml`, `.mep/security/**`, `.mep/reviews/**` (o donde `review.ts` guarde las revisiones), `.mep/log`.

- En el mod (`tool.call` para Edit, Write, MultiEdit, NotebookEdit) y en el hook clásico (`PreToolUse` con matcher `Edit|Write|MultiEdit|NotebookEdit`): denegar si la ruta cae en un archivo protegido. Mensaje: qué comando de mep usar en su lugar.
- En Bash (mod + hook clásico): denegar comandos que mencionan una ruta protegida junto con una operación de escritura (`>`, `>>`, `tee`, `sed -i`, `cp`, `mv`, `rm`, `truncate`, `git checkout --`, `git restore`, scripts `node -e`/`python -c` que la nombren), salvo que el comando sea una llamada al motor de mep. Es una heurística; lleva comentario `ponytail:` con su techo (un script en un archivo aparte la evade) y con que la detección B es la red de seguridad.

### B. Detección de cambios fuera de la CLI (G1)

- Cada vez que el motor guarda estado (`saveProfile`, `recordReport`, `recordReview`, `log`), agrega al final de `.mep/log` una línea `state <sha256>` con el hash del conjunto de archivos de estado (excluyendo esa última línea).
- `mep verify` (todos los modos, incluido CI) recalcula el hash; si no coincide con la última línea `state`, el resultado es un bloqueo tipo locked: "estado de mep modificado fuera de la CLI". Se resuelve con un comando humano (`mep resync`, acción humana según C) que muestra el diff contra el último commit y vuelve a sellar.
- Repos sin línea `state` (creados con 0.1.x): la primera ejecución de 0.2 sella sin bloquear y lo anota en el log. Ese evento (`seal-initial`) aparece en el resumen de G, para que borrar todas las líneas `state` y "re-sellar como repo viejo" quede a la vista.
- Merges (decisión de diseño, no del usuario): si `HEAD` es un merge y cada padre tenía un sello válido contra su propio árbol (`git show <padre>:<archivo>`), y git hizo el merge sin conflictos en los archivos de estado, el motor re-sella solo y anota `seal-merge`. Si algún padre no tenía sello válido, bloquea y pide `mep resync`.

### C. Acciones solo humanas (G2)

Acciones humanas: `confirm`, `override`, `threshold` cuando relaja, `resync`, `MEP_BYPASS=1`, y desactivar la guardia si algún día hiciera falta.

- `MEP_BYPASS` (decisión de diseño): la guardia de Bash deniega comandos que contienen `MEP_BYPASS`; solo cuenta si viene del entorno del proceso (lo puso el humano al abrir la sesión). Cada uso queda en el log y en el resumen de G.

- `--by` deja de ser texto libre: se toma de `git config user.name` (y email) en el momento de la acción.
- Canal humano principal: el mod atiende `command.run` para `/mep:confirm`, `/mep:override`, `/mep:threshold` y `/mep:resync` y llama al motor con una marca de canal humano, sin turno de Claude. Las skills existentes de `override` y similares pasan a explicar el comando y no ejecutarlo.
- Desde el Bash de Claude: el mod y el hook clásico deniegan `mep confirm|override|resync` y `mep threshold … --yes` (relajar). Mensaje: "esta acción es tuya: escribe /mep:confirm <id>".
- Canal de respaldo (sin mods, Claude Code < 2.1.287): el motor exige TTY interactivo (`process.stdin.isTTY`) y que la persona teclee el id del ítem; el Bash de Claude no tiene TTY. Se usa desde una terminal propia.
- **A verificar por quien construya, antes de implementar:** (1) si Claude puede disparar `command.run` de un mod al invocar la skill con el tool Skill — si puede, el canal principal debe distinguir "lo escribió el usuario"; (2) si el prefijo `!` del usuario pasa por `PreToolUse` — si no pasa, `! mep confirm …` es un canal humano válido extra. El diseño elige el mecanismo según lo que resulte; la meta G2 no cambia.

### D. Reportes de seguridad con alcance forzado (G3)

- `catalog/sensitive.yaml` se agrupa por tema (decisión de diseño): `auth`, `payments`, `db`, `config`, `uploads`, `webhooks` u otros que salgan de la lista actual. Cada ítem de seguridad declara `sensitive: [<grupos>]`; sin declaración, cubre todos los grupos. Es un cambio de esquema mínimo, no reglas nuevas, y evita que tocar pagos venza el reporte de HSTS.
- `mep security record --id <id>` calcula los archivos a hashear como: los archivos del repo que coinciden con los grupos del ítem, más los que pase `--files`. `--files` solo puede agregar, nunca quitar.
- Si no hay ningún archivo sensible detectado para el ítem, el reporte se acepta con los archivos pasados, y esa condición queda escrita en el reporte.
- Si la entrada del hook expone el tipo de agente (subagente `mep-security`), la guardia de Bash permite `mep security record` solo desde ese agente. Si no lo expone, no se restringe (el alcance forzado ya cierra lo principal); se anota como techo.

### E. Revisión de PR real (G4)

- `mep review record --pr --must-fix <n> --notes …` guarda la revisión de la rama en un archivo versionado bajo el mismo directorio de revisiones, ligada al hash del código sin `.mep` (`hashProject`, igual que las revisiones de sub-etapa), no al SHA de HEAD: así hacer commit de la revisión no la vence (decisión de diseño).
- `prReviewGate` bloquea mientras no exista una revisión de PR vigente con `must_fix = 0`. Se elimina el comportamiento "el segundo intento pasa".
- El CI (`templates/ci/mep.yml`, ruta de `verify` en CI) exige la misma revisión vigente en los PR a main, porque un merge hecho en GitHub no pasa por los hooks.
- El mensaje del bloqueo dice exactamente qué correr (Ponytail: `/ponytail-review branch` y luego `mep review record --pr --tool ponytail …`).

### F. Más plataformas de deploy (G5)

Se agregan a `deploy.ts` (y a `mayDeploy`, `hooks/hooks.json` y el mod):

| Plataforma | Producción | Preview | No es deploy |
| --- | --- | --- | --- |
| Cloudflare | `wrangler deploy`, `wrangler pages deploy` (rama main o sin `--branch`) | `wrangler pages deploy --branch <no-main>`, `wrangler versions upload` | `wrangler dev`, `wrangler login`, `wrangler tail` |
| Fly.io | `fly deploy`, `flyctl deploy` | — | `fly logs`, `fly status` |
| Railway | `railway up`, `railway redeploy` | — | `railway logs`, `railway link` |
| Firebase | `firebase deploy` | `firebase hosting:channel:deploy` | `firebase emulators:*`, `firebase login` |
| Supabase | `supabase db push`, `supabase functions deploy` (contra el proyecto enlazado) | — | `supabase start`, `supabase db reset` (local) |

Netlify y Vercel quedan como están. Los prefijos `npx`, `pnpm dlx`, `bunx` se cubren porque los patrones usan `\b`.

### G. Resumen de cambios de estado en el PR (visibilidad, opción A)

- En CI, en PRs a main, `mep verify --prod` compara el estado de mep de la base del PR contra el de la rama y escribe en el resumen del job (`$GITHUB_STEP_SUMMARY`) una tabla con cada cambio: overrides nuevos (id, razón, quién), confirmaciones manuales, sub-etapas cerradas, umbrales relajados, usos de `MEP_BYPASS`, `seal-initial`, `seal-merge`, `resync`, y reportes de seguridad/revisiones nuevos.
- Si no hay cambios de estado, el resumen lo dice en una línea.
- No bloquea por sí mismo: su función es que el humano vea todo antes del merge. Lo que bloquea sigue siendo B, C, D y E.

## Restricciones

- Mismo estilo del repo: TypeScript estricto, módulos chicos, comentarios en inglés en el código, mensajes al usuario en español, sin dependencias nuevas.
- `deploy.ts` sigue siendo puro (lo importa el mod).
- El mod y el hook clásico deben comportarse igual (el hook es el respaldo).
- Cada hueco cerrado lleva al menos una prueba que falla si el hueco se reabre: `tests/*.spec.ts` para el motor, `mods/register.test.ts` para el mod.
- Versión 0.2.0, con entrada en `CHANGELOG.md` y nota de migración (sellado automático de `state`).

## Lo que queda a criterio de quien construya

- Formato exacto de la línea `state` y qué archivos entran al hash (siempre que cubra los listados en A).
- Lista exacta de operaciones de escritura en la heurística de Bash.
- Texto de los mensajes de bloqueo, siempre en una o dos líneas y diciendo qué hacer.
- Mecanismo final del canal humano según lo que resulte de la verificación en C.
