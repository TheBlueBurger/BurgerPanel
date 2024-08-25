ps aux | grep node | grep burgerpanel.mjs | awk "{print \$2}" | xargs kill -9
