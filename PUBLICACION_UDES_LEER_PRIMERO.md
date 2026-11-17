# SGD Tibú UDES — repositorio para evaluación académica

Este directorio contiene el **código fuente**, migraciones, pruebas, documentación técnica y configuración de compilación. No incluye el ejecutable Windows ni la base privada. El archivo ZIP Windows original se conserva separadamente.

## Antes de publicar

1. Crea un repositorio **privado** nuevo llamado `sgd-tibu-udes` en GitHub. No lo publiques dentro de `jungers`.
2. Revisa los archivos y evita subir cualquier `.env`, datos sacramentales personales, trazas de pruebas con sesiones, respaldos y contraseñas. El directorio se preparó excluyendo evidencias históricas, pero esta revisión no sustituye un escáner exhaustivo de secretos.
3. Deja el proyecto privado hasta verificar el resultado de GitHub Actions. Comparte acceso con la profesora de manera individual si es necesario.
4. El archivo `render-pago-referencia.yaml` proviene de Codex y solicita **plan Starter y disco persistente de pago**. **No importarlo como Blueprint gratuito**. Se retiró del nombre automático `render.yaml` precisamente para evitar activar servicios de pago por error.
5. Render gratis no ofrece almacenamiento local persistente para los PDF y archivos cargados. PostgreSQL en Neon sí persiste sus tablas. Antes de ofrecer un sistema funcional con documentos duraderos, adaptar el almacenamiento a una opción persistente con permisos, o autorizar un plan con disco.
6. Preparar `DATABASE_URL`, `SECRET_KEY`, `DEMO_PASSWORD` en secretos del servicio, nunca en Git. No reutilizar `admin123` ni cuentas de evaluación local en una web pública.
7. La instancia Neon `sgd_evaluacion` fue creada pero estaba vacía en la última comprobación; las migraciones y el despliegue público aún no se han ejecutado.

## Subida desde Windows (Git instalado)

Descomprime esta carpeta y abre PowerShell dentro de ella. Después de crear el repositorio **vacío y privado** en https://github.com/new, ejecuta:

```powershell
git init
git add .
git commit -m "Entrega verificada SGD Tibu UDES 3.1.0"
git branch -M main
git remote add origin https://github.com/lualloco76-dot/sgd-tibu-udes.git
git push -u origin main
```

Si falta identidad Git, configura `user.name` y `user.email` según tu cuenta. GitHub solicitará autenticación en el navegador o por gestor de credenciales; nunca pegues tokens aquí. Si prefieres, usa el conector de GitHub de ChatGPT una vez el repositorio exista y esté conectado.

## Pruebas

Revisa `AUDITORIA_20261116/REVISION_FUNCIONAL.md` y los tests de `backend/tests/` y `frontend/e2e/`. Los conteos allí son resultados declarados por Codex, todavía no confirmados en una instancia Render pública.
