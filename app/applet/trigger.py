import subprocess

try:
    subprocess.run(['python3', '/root/processador_nfe/sincronizador_postos.py'], check=True)
except Exception as e:
    import traceback
    traceback.print_exc()
