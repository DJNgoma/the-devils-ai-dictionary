#!/usr/bin/env bash
# Send an APNs alert from this Mac directly to Apple, bypassing the worker.
#
# Usage:
#   scripts/apns-local-send.sh <device-token> [--prod] [--title "..."] [--body "..."] [--slug "..."]
#
# Defaults to the sandbox endpoint. Reads the .p8 signing key, key id, team id,
# and bundle id from ~/Documents/DeveloperSecrets/TheDevilsAIDictionary/apns.env
# which must export APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, APNS_KEY_PATH.
#
# Requires: openssl, curl (with HTTP/2), jq.

set -euo pipefail

SECRETS_DIR="${HOME}/Documents/DeveloperSecrets/TheDevilsAIDictionary"
ENV_FILE="${SECRETS_DIR}/apns.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  cat >&2 <<EOF
Missing ${ENV_FILE}. Create it with:

  APNS_KEY_ID=MQJ4ZPJFP6
  APNS_TEAM_ID=5CND4GK432
  APNS_BUNDLE_ID=com.djngoma.devilsaidictionary
  APNS_KEY_PATH=${SECRETS_DIR}/AuthKey_MQJ4ZPJFP6.p8
EOF
  exit 1
fi

# shellcheck disable=SC1090
source "${ENV_FILE}"

: "${APNS_KEY_ID:?APNS_KEY_ID not set}"
: "${APNS_TEAM_ID:?APNS_TEAM_ID not set}"
: "${APNS_BUNDLE_ID:?APNS_BUNDLE_ID not set}"
: "${APNS_KEY_PATH:?APNS_KEY_PATH not set}"

if [[ ! -f "${APNS_KEY_PATH}" ]]; then
  echo "APNs key not found at ${APNS_KEY_PATH}" >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <device-token> [--prod] [--title T] [--body B] [--slug S]" >&2
  exit 2
fi

TOKEN="$1"; shift
HOST="api.sandbox.push.apple.com"
TITLE="Local APNs test"
BODY="Hello from scripts/apns-local-send.sh"
SLUG="hallucination"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prod) HOST="api.push.apple.com"; shift ;;
    --title) TITLE="$2"; shift 2 ;;
    --body) BODY="$2"; shift 2 ;;
    --slug) SLUG="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }

HEADER_JSON=$(printf '{"alg":"ES256","kid":"%s"}' "${APNS_KEY_ID}")
CLAIMS_JSON=$(printf '{"iss":"%s","iat":%d}' "${APNS_TEAM_ID}" "$(date +%s)")
HEADER_B64=$(printf '%s' "${HEADER_JSON}" | b64url)
CLAIMS_B64=$(printf '%s' "${CLAIMS_JSON}" | b64url)
SIGNING_INPUT="${HEADER_B64}.${CLAIMS_B64}"
SIG_B64=$(printf '%s' "${SIGNING_INPUT}" \
  | openssl dgst -sha256 -sign "${APNS_KEY_PATH}" \
  | openssl asn1parse -inform DER \
  | awk '/INTEGER/{print $NF}' \
  | while read -r hex; do printf '%064s' "${hex#:}" | tr ' ' 0; done \
  | xxd -r -p \
  | b64url)
JWT="${SIGNING_INPUT}.${SIG_B64}"

PAYLOAD=$(jq -nc \
  --arg title "${TITLE}" --arg body "${BODY}" --arg slug "${SLUG}" \
  --arg sent "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{aps:{alert:{title:$title,body:$body},sound:"default"},slug:$slug,source:"notificationTap",sent_at:$sent}')

echo "→ ${HOST}  topic=${APNS_BUNDLE_ID}  token=${TOKEN:0:12}…"
curl -v --http2 \
  --header "authorization: bearer ${JWT}" \
  --header "apns-topic: ${APNS_BUNDLE_ID}" \
  --header "apns-push-type: alert" \
  --header "apns-priority: 10" \
  --header "apns-expiration: $(( $(date +%s) + 3600 ))" \
  --data "${PAYLOAD}" \
  "https://${HOST}/3/device/${TOKEN}"
echo
