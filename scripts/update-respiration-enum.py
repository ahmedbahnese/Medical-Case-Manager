from pathlib import Path
root = Path('/home/ubuntu/Medical-Case-Manager-full/lib/api-zod/src')
old = "'high_frequency', 'vent', 'cpap', 'hfnc', 'standby', 'box', 'no'"
new = "'high_frequency', 'vent', 'cpap', 'hfnc', 'oxygen_mask', 'standby', 'box', 'no'"
old_pipe = "'high_frequency' | 'vent' | 'cpap' | 'hfnc' | 'standby' | 'box' | 'no'"
new_pipe = "'high_frequency' | 'vent' | 'cpap' | 'hfnc' | 'oxygen_mask' | 'standby' | 'box' | 'no'"
changed = 0
for p in root.rglob('*.ts'):
    s = p.read_text()
    n = s.replace(old, new).replace(old_pipe, new_pipe)
    if n != s:
        p.write_text(n)
        changed += 1
print(f'updated {changed} api-zod files')
