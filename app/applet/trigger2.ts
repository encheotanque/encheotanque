import { execSync } from 'child_process';
execSync('python /root/processador_nfe/sincronizador_postos.py', {stdio: 'inherit'});
