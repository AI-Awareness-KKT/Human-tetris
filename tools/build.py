"""Build this project's playable page. Python standard library only."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
template=(root/'src/game-template.html').read_text()
for gid,data in json.loads((root/'src/games.json').read_text()).items():
    page=template.replace('{{ID}}',gid)
    for key,value in data.items():page=page.replace('{{'+key+'}}',value)
    assert '{{' not in page, 'Unresolved template value'
    (root/data['FILE']).write_text(page)
(root/'assets/logic.mjs').write_text((root/'src/logic.mjs').read_text())
print('Built play.html and browser game rules.')
