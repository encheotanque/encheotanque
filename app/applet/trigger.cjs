const { execSync } = require('child_process');
execSync('python3 /root/processador_nfe/sincronizador_postos.py', {stdio: 'inherit'});
