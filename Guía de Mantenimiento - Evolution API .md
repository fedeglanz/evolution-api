# Guía de Mantenimiento - Evolution API Fork

## 📋 Información del Proyecto

- **Fork**: https://github.com/fedeglanz/evolution-api
- **Upstream**: https://github.com/EvolutionAPI/evolution-api
- **Producción**: https://evolution-api-jz3j.onrender.com
- **Servicios en Render**: PostgreSQL + Redis + Evolution API

## 🏗️ Arquitectura de Ramas

### Estrategia Recomendada

```
main (tu versión de producción)
├── custom-features (tus cambios personalizados)
└── upstream-sync (para sincronizar con el original)
```

## 🔄 Flujo de Trabajo para Actualizaciones

### 1. Mantener Sincronizado con Upstream

```bash
# Cambiar a la rama main
git checkout main

# Obtener las últimas actualizaciones del repositorio original
git fetch upstream

# Verificar qué cambios hay
git log --oneline main..upstream/main

# Mergear los cambios del upstream
git merge upstream/main

# Subir los cambios actualizados a tu fork
git push origin main
```

**¿Qué hace esto?**
- Trae las últimas actualizaciones del repositorio original
- Las integra en tu rama main
- Automáticamente redespliega en Render

### 2. Crear Cambios Personalizados

```bash
# Crear una nueva rama para tus cambios
git checkout -b custom-features

# Hacer tus modificaciones
# Editar archivos, agregar funcionalidades, etc.

# Commitear tus cambios
git add .
git commit -m "feat: agregar mi funcionalidad personalizada"

# Subir la rama
git push origin custom-features
```

### 3. Integrar Cambios Personalizados a Main

```bash
# Volver a main
git checkout main

# Mergear tus cambios personalizados
git merge custom-features

# Subir a producción
git push origin main
```

## 🚨 Manejo de Conflictos

### Cuando hay conflictos al mergear upstream

```bash
# Durante el merge aparecen conflictos
git merge upstream/main
# ERROR: Conflictos en archivo.js

# Ver los archivos en conflicto
git status

# Resolver conflictos manualmente
# Abrir cada archivo y decidir qué mantener

# Después de resolver, marcar como resuelto
git add archivo-resuelto.js

# Completar el merge
git commit -m "merge: resolver conflictos con upstream"

# Subir los cambios
git push origin main
```

### Tipos de Conflictos Comunes

1. **Archivos de configuración (.env, docker-compose.yml)**
   - Mantener tus configuraciones personalizadas
   - Revisar si hay nuevas variables importantes

2. **Código fuente**
   - Evaluar si tus cambios siguen siendo necesarios
   - Adaptar tu código a los nuevos cambios

3. **Dependencias (package.json)**
   - Generalmente aceptar las nuevas versiones
   - Probar que tus funcionalidades sigan funcionando

## 🛠️ Flujo de Trabajo Completo

### Escenario 1: Solo Actualizar (sin cambios personalizados)

```bash
# Actualización simple
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

### Escenario 2: Actualizar + Mantener Cambios Personalizados

```bash
# 1. Actualizar main con upstream
git checkout main
git fetch upstream
git merge upstream/main

# 2. Resolver conflictos si los hay
# (editar archivos manualmente)

# 3. Aplicar tus cambios personalizados
git checkout custom-features
git rebase main  # Aplica tus cambios sobre la nueva versión

# 4. Resolver conflictos del rebase si los hay

# 5. Volver a main y mergear
git checkout main
git merge custom-features

# 6. Subir a producción
git push origin main
```

### Escenario 3: Crear Nueva Funcionalidad

```bash
# 1. Asegurar que main esté actualizado
git checkout main
git fetch upstream
git merge upstream/main
git push origin main

# 2. Crear rama para nueva funcionalidad
git checkout -b feature/mi-nueva-funcionalidad

# 3. Desarrollar y commitear
git add .
git commit -m "feat: agregar nueva funcionalidad"

# 4. Testear localmente
docker-compose up -d

# 5. Mergear a main cuando esté listo
git checkout main
git merge feature/mi-nueva-funcionalidad
git push origin main

# 6. Limpiar rama temporal
git branch -d feature/mi-nueva-funcionalidad
```

## 📅 Rutina de Mantenimiento

### Semanal
```bash
# Revisar actualizaciones del upstream
git fetch upstream
git log --oneline main..upstream/main

# Si hay actualizaciones importantes, aplicarlas
git merge upstream/main
git push origin main
```

### Mensual
- Revisar los releases del repositorio original
- Actualizar documentación si hay cambios importantes
- Verificar que todos los servicios en Render estén funcionando

### Antes de Agregar Funcionalidades
```bash
# Siempre partir de la última versión
git checkout main
git fetch upstream
git merge upstream/main
git checkout -b nueva-funcionalidad
```

## 🔍 Comandos Útiles

### Ver el estado de tu repositorio
```bash
# Ver diferencias con upstream
git log --oneline main..upstream/main

# Ver tus cambios personalizados
git log --oneline upstream/main..main

# Ver estado actual
git status

# Ver historial gráfico
git log --oneline --graph --all
```

### Backup de seguridad
```bash
# Crear rama de backup antes de cambios importantes
git checkout -b backup-$(date +%Y%m%d)
git push origin backup-$(date +%Y%m%d)
```

## 🚀 Despliegue Automático

**Render está configurado para redesplegar automáticamente cuando:**
- Haces `git push origin main`
- Los cambios se suben a la rama main de tu fork

**Monitoreo:**
- Logs en tiempo real: https://dashboard.render.com
- URL de producción: https://evolution-api-jz3j.onrender.com

## 📚 Recursos Adicionales

### Documentación Oficial
- [Evolution API Docs](https://github.com/EvolutionAPI/evolution-api)
- [Git Branching](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging)
- [Render Docs](https://render.com/docs)

### Comandos de Emergencia

```bash
# Deshacer último commit (sin perder cambios)
git reset --soft HEAD~1

# Deshacer último commit (perdiendo cambios)
git reset --hard HEAD~1

# Volver a un commit específico
git checkout <commit-hash>

# Crear rama desde commit específico
git checkout -b recovery-branch <commit-hash>
```

## 🎯 Mejores Prácticas

1. **Siempre hacer backup** antes de merges importantes
2. **Probar localmente** antes de subir a producción
3. **Usar mensajes de commit descriptivos**
4. **Mantener ramas limpias** (borrar ramas ya mergeadas)
5. **Revisar logs de Render** después de cada despliegue
6. **Documentar cambios personalizados** en este archivo

---

**¿Necesitas ayuda?** Guarda esta documentación y úsala como referencia. ¡Ahora tienes todo lo necesario para mantener tu Evolution API actualizada y con tus funcionalidades personalizadas!