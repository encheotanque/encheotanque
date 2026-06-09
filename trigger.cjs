const { execSync } = require('child_process');
execSync('/root/processador_nfe/venv/bin/python /root/processador_nfe/sincronizador_postos.py', {stdio: 'inherit'});
