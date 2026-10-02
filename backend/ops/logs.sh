#!/usr/bin/env bash
# View VitalVue container logs: pick a container, then live / last lines / errors / since / search.
#
#   ./backend/ops/logs.sh                    menu, containers on this machine (run it on the server)
#   ./backend/ops/logs.sh --server           menu, containers on the EC2 server over SSH (from your laptop)
#
# Quick commands (no menu); the container can be part of its name, e.g. "gateway", "mqtt":
#   ./backend/ops/logs.sh gateway -f               follow live
#   ./backend/ops/logs.sh backend -n 300           last 300 lines
#   ./backend/ops/logs.sh mqtt --errors            errors in the last 1000 lines
#   ./backend/ops/logs.sh mqtt --errors -f         errors, live
#   ./backend/ops/logs.sh scheduler --since 2h     everything from the last 2 hours
#   ./backend/ops/logs.sh gateway --grep 867956070000018    lines mentioning this text
# Add --server to any of them to run against the EC2 server.
#
# Ctrl+C stops live mode (and goes back to the menu in menu mode).

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVER_IP="${VV_SERVER_IP:-18.142.3.23}"            # same server and key as backend/deploy.sh
SERVER_USER="${VV_SERVER_USER:-ubuntu}"
KEY_PATH="${VV_KEY_PATH:-$PROJECT_ROOT/files/key.pem}"
NAME_FILTER="${VV_CONTAINER_FILTER:-vitalvue_}"
ERROR_PATTERN='error|exception|traceback|critical|fatal|failed|refused'

REMOTE=0
if [ -t 1 ]; then BOLD=$'\e[1m'; DIM=$'\e[2m'; RED=$'\e[31m'; GREEN=$'\e[32m'; RESET=$'\e[0m'; else BOLD=""; DIM=""; RED=""; GREEN=""; RESET=""; fi

die() { echo "${RED}$*${RESET}" >&2; echo "Run with -h for usage." >&2; exit 1; }

usage() {
    local me="${0#"$PROJECT_ROOT"/}"
    cat <<USAGE
${BOLD}View VitalVue container logs${RESET}

${BOLD}Usage${RESET}
  $me [--server]                         menu: pick a container, then a view
  $me [--server] <container> [view]      one view straight away

${BOLD}Where${RESET}
  (default)          containers on this machine (run it on the server)
  --server           the EC2 server over SSH (run it from your laptop)

${BOLD}Views${RESET} (default: last 200 lines)
  -f, --follow       live: new lines as they arrive (Ctrl+C to stop)
  -n, --tail N       last N lines
  --errors           error lines from the last 1000 (add -f for live errors)
  --since TIME       everything since TIME: 30m, 2h, 1d or 2026-10-01T09:00
  --grep TEXT        lines containing TEXT (case-insensitive), e.g. an IMEI
  -h, --help         this help

${BOLD}Containers${RESET} (any unique part of the name works)
  backend            API                       vitalvue_backend
  gateway            Wonlex / BPW8 watches     vitalvue_device_gateway
  mqtt               Veepoo watches            vitalvue_mqtt_worker
  scheduler          offline / baseline jobs   vitalvue_scheduler
  emqx               MQTT broker               vitalvue_emqx
  db, redis          database, cache           vitalvue_db, vitalvue_redis

${BOLD}Examples${RESET}
  $me --server                              menu for the server's containers
  $me --server gateway -f                   gateway, live
  $me --server mqtt --errors                recent mqtt-worker errors
  $me --server backend --errors -f          API errors, live
  $me --server gateway --grep 867956070000018   everything about one watch
  $me --server scheduler --since 2h         the scheduler's last 2 hours

${BOLD}Settings${RESET} (environment variables, all optional)
  VV_SERVER_IP=$SERVER_IP   VV_SERVER_USER=$SERVER_USER
  VV_KEY_PATH=${KEY_PATH#"$PROJECT_ROOT"/}   VV_CONTAINER_FILTER=$NAME_FILTER
USAGE
}

# Run docker here, or on the server over SSH (-t only when a live terminal is needed).
dk() {
    if [ "$REMOTE" = 1 ]; then
        local tty_flag="-T"
        [ "${DK_TTY:-0}" = 1 ] && tty_flag="-t"
        ssh $tty_flag -o LogLevel=ERROR -o StrictHostKeyChecking=accept-new -i "$KEY_PATH" \
            "$SERVER_USER@$SERVER_IP" "docker $(printf '%q ' "$@")"
    else
        docker "$@"
    fi
}

list_containers() {
    # name<TAB>status, VitalVue containers first by name
    dk ps -a --filter "name=$NAME_FILTER" --format '{{.Names}}\t{{.Status}}' | sort
}

resolve_container() {   # exact name, or a unique part of a name
    local wanted="$1" matches
    matches=$(list_containers | cut -f1 | grep -i -- "$wanted" || true)
    [ -z "$matches" ] && die "No container matching '$wanted'. Run without arguments to see the list."
    if [ "$(echo "$matches" | wc -l)" -gt 1 ]; then
        local exact
        exact=$(echo "$matches" | grep -ix -- "$wanted" || echo "$matches" | grep -ix -- "${NAME_FILTER}${wanted}" || true)
        [ -n "$exact" ] && { echo "$exact"; return; }
        die "'$wanted' matches several containers: $(echo "$matches" | tr '\n' ' ')"
    fi
    echo "$matches"
}

highlight() {   # colour error lines when printing to a terminal
    if [ -t 1 ]; then
        GREP_COLORS='mt=01;31' grep --line-buffered -iE --color=always "$ERROR_PATTERN|$" || true
    else
        cat
    fi
}

show_logs() {   # show_logs <container> <mode> [arg]
    local c="$1" mode="$2" arg="${3:-}"
    echo "${DIM}── $c · $mode${arg:+ $arg} ──${RESET}" >&2
    case "$mode" in
        follow)        DK_TTY=1 dk logs -f --tail 50 "$c" 2>&1 | highlight ;;
        tail)          dk logs --tail "${arg:-200}" "$c" 2>&1 | highlight ;;
        errors)        dk logs --tail "${arg:-1000}" "$c" 2>&1 | grep -iE --line-buffered "$ERROR_PATTERN" | highlight ;;
        errors-follow) DK_TTY=1 dk logs -f --tail 0 "$c" 2>&1 | grep -iE --line-buffered "$ERROR_PATTERN" | highlight ;;
        since)         dk logs --since "${arg:-1h}" "$c" 2>&1 | highlight ;;
        grep)          dk logs --tail 5000 "$c" 2>&1 | grep -iF --line-buffered -- "$arg" | highlight ;;
    esac
}

run_live() {   # Ctrl+C stops the live view without quitting the menu
    trap 'echo; echo "${DIM}(stopped)${RESET}"' INT
    "$@"
    trap - INT
}

menu() {
    while true; do
        local rows
        local where="" hint="is Docker running?"
        [ "$REMOTE" = 1 ] && where=" on $SERVER_IP" && hint="can you SSH to $SERVER_IP with $KEY_PATH?"
        rows=$(list_containers) || die "Couldn't list containers ($hint)"
        [ -z "$rows" ] && die "No containers whose name contains '$NAME_FILTER'."
        echo
        echo "${BOLD}VitalVue containers${RESET}$where"
        local i=0 names=()
        while IFS=$'\t' read -r name status; do
            i=$((i + 1)); names+=("$name")
            local colour="$GREEN"; [[ "$status" != Up* ]] && colour="$RED"
            printf "  %2d) %-28s %s%s%s\n" "$i" "$name" "$colour" "$status" "$RESET"
        done <<< "$rows"
        echo "   q) quit"
        read -rp "Container: " pick || exit 0
        [[ "$pick" == q* ]] && exit 0
        [[ "$pick" =~ ^[0-9]+$ ]] && [ "$pick" -ge 1 ] && [ "$pick" -le "$i" ] || { echo "Pick 1–$i."; continue; }
        local c="${names[$((pick - 1))]}"

        while true; do
            echo
            echo "${BOLD}$c${RESET}"
            echo "  1) Live (follow)"
            echo "  2) Last N lines"
            echo "  3) Errors (recent)"
            echo "  4) Errors (live)"
            echo "  5) Since… (e.g. 30m, 2h, 2026-10-01T09:00)"
            echo "  6) Search text"
            echo "  b) Back to containers    q) Quit"
            read -rp "View: " mode || exit 0
            case "$mode" in
                1) run_live show_logs "$c" follow ;;
                2) read -rp "How many lines? [200] " n; show_logs "$c" tail "${n:-200}" ;;
                3) read -rp "Look through how many recent lines? [1000] " n; show_logs "$c" errors "${n:-1000}" ;;
                4) run_live show_logs "$c" errors-follow ;;
                5) read -rp "Since [1h]: " s; show_logs "$c" since "${s:-1h}" ;;
                6) read -rp "Text to find: " t; [ -n "$t" ] && show_logs "$c" grep "$t" ;;
                b|B) break ;;
                q|Q) exit 0 ;;
                *) echo "Pick 1–6, b or q." ;;
            esac
        done
    done
}

# ── arguments ────────────────────────────────────────────────────────────────────────
container="" mode="" arg="" follow=0
while [ $# -gt 0 ]; do
    case "$1" in
        --server) REMOTE=1 ;;
        -f|--follow) follow=1 ;;
        -n|--tail) mode="tail"; arg="${2:?-n needs a number}"; shift ;;
        --errors) mode="errors" ;;
        --since) mode="since"; arg="${2:?--since needs a time, e.g. 2h}"; shift ;;
        --grep) mode="grep"; arg="${2:?--grep needs text}"; shift ;;
        -h|--help|help) usage; exit 0 ;;
        -*) die "Unknown option $1." ;;
        *) container="$1" ;;
    esac
    shift
done

if [ "$REMOTE" = 1 ]; then
    [ -f "$KEY_PATH" ] || die "SSH key not found at $KEY_PATH (set VV_KEY_PATH)."
else
    command -v docker >/dev/null || die "Docker isn't available here. On your laptop, use --server."
fi

if [ -z "$container" ]; then
    [ -n "$mode" ] || [ "$follow" = 1 ] && die "Name a container for quick commands, e.g.: $0 gateway -f"
    menu
    exit 0
fi

c=$(resolve_container "$container") || exit 1
case "$mode:$follow" in
    errors:1) show_logs "$c" errors-follow ;;
    errors:0) show_logs "$c" errors 1000 ;;
    ":1")     show_logs "$c" follow ;;
    ":0")     show_logs "$c" tail 200 ;;
    *:1)      die "-f works with --errors or on its own." ;;
    *)        show_logs "$c" "$mode" "$arg" ;;
esac
