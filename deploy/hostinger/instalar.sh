#!/usr/bin/env bash
# Instalacion inicial SGD Tibu en VPS Hostinger Ubuntu 26.04.
# Nunca reinstala el SO, no borra datos ni cambia cortafuegos.
set -Eeuo pipefail
umask 077
trap 'echo "ERROR: instalacion detenida en linea $LINENO. Revise el mensaje anterior; no se borraron volumenes." >&2' ERR

REPO_URL='https://github.com/lualloco76-dot/sgd-tibu-udes.git'
ROOT='/opt/sgd-tibu'

if [[ "$(id -u)" -ne 0 ]]; then
  echo 'Ejecute como root con sudo o en la consola root de Hostinger.' >&2
  exit 1
fi
if [[ ! -r /etc/os-release ]]; then
  echo 'No se pudo identificar el sistema operativo.' >&2
  exit 1
fi
source /etc/os-release
if [[ "${ID:-}" != 'ubuntu' ]]; then
  echo 'Esta instalacion esta preparada exclusivamente para Ubuntu.' >&2
  exit 1
fi
printf 'Servidor detectado: %s\n' "${PRETTY_NAME:-Ubuntu}"
if [[ -d "$ROOT" ]]; then
  echo "La carpeta $ROOT ya existe. Detenido para no sobrescribir un despliegue previo." >&2
  exit 1
fi
if command -v ss >/dev/null 2>&1; then
  if [[ -n "$(ss -H -tln '( sport = :80 or sport = :443 )' || true)" ]]; then
    echo 'Puerto 80 o 443 ocupado. Hay un servicio web previo; revise antes de instalar.' >&2
    exit 1
  fi
fi

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  printf 'Dominio o subdominio propio (por ejemplo sgd.sudominio.com): '
  read -r DOMAIN
fi
DOMAIN="${DOMAIN,,}"
if [[ ! "$DOMAIN" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ || "$DOMAIN" != *.* || "$DOMAIN" == *.example.com || "$DOMAIN" == *.ejemplo.com || "$DOMAIN" == *..* ]]; then
  echo 'Dominio no valido. Registre un dominio/subdominio real que apunte al VPS.' >&2
  exit 1
fi

FREE_KB="$(df -Pk / | awk 'NR==2 {print $4}')"
if [[ -n "$FREE_KB" && "$FREE_KB" -lt 8388608 ]]; then
  echo 'Espacio disponible insuficiente (< 8 GiB).' >&2
  exit 1
fi
MEM_KB="$(awk '/MemTotal:/{print $2}' /proc/meminfo)"
if [[ -n "$MEM_KB" && "$MEM_KB" -lt 1572864 ]]; then
  echo 'Menos de 1.5 GiB RAM: dimensione recursos antes de instalar.' >&2
  exit 1
fi
if command -v docker >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
  echo 'Docker existe sin Compose; revise esa instalacion antes de continuar.' >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git gnupg openssl
if ! command -v docker >/dev/null 2>&1; then
  echo 'Instalando Docker Engine y Compose desde Docker oficial.'
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  cat > /etc/apt/sources.list.d/docker.sources <<DOCKER_REPO
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
DOCKER_REPO
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi

docker compose version
git clone --depth 1 "$REPO_URL" "$ROOT"
cd "$ROOT/deploy/hostinger"

POSTGRES_PASSWORD="$(openssl rand -hex 32)"
SECRET_KEY="$(openssl rand -hex 48)"
DEMO_PASSWORD="$(openssl rand -hex 24)"
cat > .env <<ENV_FILE
DOMAIN=$DOMAIN
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
SECRET_KEY=$SECRET_KEY
DEMO_PASSWORD=$DEMO_PASSWORD
DEMO_SEED_ENABLED=true
ENV_FILE
chmod 600 .env
unset POSTGRES_PASSWORD SECRET_KEY DEMO_PASSWORD

docker compose config --quiet
echo 'Construyendo contenedores.'
docker compose up -d --build
docker compose ps
echo '--- Salud del backend ---'
docker compose exec -T app python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=15).read().decode())"
echo '--- Tablas de PostgreSQL ---'
docker compose exec -T db psql -U sgd -d sgd_evaluacion -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"

cat <<MESSAGE
SGD Tibu: instalacion de contenedores iniciada y verificacion local efectuada.
URL prevista: https://$DOMAIN
Para emitir HTTPS, el registro DNS A debe apuntar a la IP publica de este VPS.
Las contrasenas solo se guardan en $ROOT/deploy/hostinger/.env (permisos 600).
No comparta ese archivo ni sus valores.
Comprobar HTTPS despues de propagar DNS:
  curl -fsS https://$DOMAIN/health
  cd $ROOT/deploy/hostinger && docker compose ps
No ejecutar: docker compose down -v (borra datos persistentes).
MESSAGE
