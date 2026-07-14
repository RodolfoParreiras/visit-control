#!/usr/bin/env bash
# =============================================================================
# Cria um novo usuário administrador no banco de dados.
# Usa pgcrypto (PostgreSQL nativo) para gerar o hash bcrypt.
# Uso: ./scripts/create-admin.sh
# =============================================================================
set -euo pipefail

if ! command -v docker &>/dev/null; then
  echo "Erro: docker não encontrado." >&2
  exit 1
fi

echo ""
echo "=== Criar novo administrador ==="
echo ""

read -rp  "Nome completo : " NAME
read -rp  "Login (único) : " LOGIN

while true; do
  read -rsp "Senha         : " PASSWORD; echo ""
  read -rsp "Confirme senha: " PASSWORD2; echo ""
  [ "$PASSWORD" = "$PASSWORD2" ] && break
  echo "As senhas não coincidem. Tente novamente."
done

if [ ${#PASSWORD} -lt 6 ]; then
  echo "Erro: senha deve ter pelo menos 6 caracteres." >&2
  exit 1
fi

echo ""
echo "Criando usuário..."

docker compose exec -T db psql -U visit_user -d visit_control \
  -v name="$NAME" \
  -v login="$LOGIN" \
  -v pass="$PASSWORD" << 'EOF'
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (name, login, password_hash, role, status)
VALUES (
  :'name',
  :'login',
  crypt(:'pass', gen_salt('bf', 10)),
  'admin',
  'active'
);
EOF

echo "✓ Usuário '$LOGIN' criado com sucesso."
