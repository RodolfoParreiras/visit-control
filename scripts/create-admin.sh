#!/usr/bin/env bash
# =============================================================================
# Cria um novo usuário administrador no banco de dados.
# Uso: ./scripts/create-admin.sh
# =============================================================================
set -euo pipefail

# ── Verifica dependências ──────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "Erro: docker não encontrado." >&2
  exit 1
fi

# ── Coleta os dados ───────────────────────────────────────────────────────────
echo ""
echo "=== Criar novo administrador ==="
echo ""

read -rp "Nome completo : " NAME
read -rp "Login (único) : " LOGIN

while true; do
  read -rsp "Senha         : " PASSWORD
  echo ""
  read -rsp "Confirme senha: " PASSWORD2
  echo ""
  if [ "$PASSWORD" = "$PASSWORD2" ]; then
    break
  fi
  echo "As senhas não coincidem. Tente novamente."
done

if [ ${#PASSWORD} -lt 6 ]; then
  echo "Erro: senha deve ter pelo menos 6 caracteres." >&2
  exit 1
fi

# ── Gera hash bcrypt via Node dentro do container do backend ──────────────────
echo ""
echo "Gerando hash bcrypt..."

HASH=$(docker compose exec -T backend node -e "
const bcrypt = require('bcryptjs');
process.stdout.write(bcrypt.hashSync(process.env.PASS, 10));
" PASS="$PASSWORD")

if [ -z "$HASH" ]; then
  echo "Erro: falha ao gerar o hash da senha." >&2
  exit 1
fi

# ── Insere no banco ───────────────────────────────────────────────────────────
echo "Inserindo usuário no banco..."

docker compose exec -T db psql -U visit_user -d visit_control -v \
  name="$NAME" \
  login="$LOGIN" \
  hash="$HASH" <<'EOF'
INSERT INTO users (name, login, password_hash, role, status)
VALUES (:'name', :'login', :'hash', 'admin', 'active');
EOF

echo ""
echo "✓ Usuário '$LOGIN' criado com sucesso."
