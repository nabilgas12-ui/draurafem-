#!/bin/sh
cd "$(dirname "$0")"
(sleep 1; xdg-open http://localhost:8080/login.html 2>/dev/null || open http://localhost:8080/login.html) &
python3 -m http.server 8080
