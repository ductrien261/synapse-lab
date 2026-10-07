import math

from rest_framework import serializers


def validate_application_scenarios(value):
    def fail():
        raise serializers.ValidationError('Tình huống cần nội dung, các điểm minh họa và các bước hợp lệ.')

    if not isinstance(value, list) or len(value) > 20:
        fail()
    ids = set()
    text_fields = {'id', 'title', 'summary', 'tag', 'problem', 'model', 'solution', 'result', 'limitations'}
    for item in value:
        if not isinstance(item, dict) or set(item) - {'scene'} != text_fields | {'nodes', 'edges', 'steps'}:
            fail()
        if 'scene' in item:
            scene = item['scene']
            themes = {'route': {'factory', 'circuit', 'town', 'delivery'}, 'tour': {'robot', 'knight', 'terminal', 'flag'}, 'placement': {'sensor', 'calendar', 'tower', 'queen'}, 'subset': {'coins', 'crate', 'clock', 'receipt'}}
            if not isinstance(scene, dict) or not isinstance(scene.get('kind'), str) or scene['kind'] not in themes:
                fail()
            if not isinstance(scene.get('theme'), str) or scene['theme'] not in themes[scene['kind']]:
                fail()
            required = {'kind', 'theme', 'title'} | ({'values', 'target', 'unit'} if scene['kind'] == 'subset' else set())
            optional = {'caption', 'metricLabel', 'distance', 'alternatives'}
            if set(scene) - optional != required or not isinstance(scene['title'], str) or not scene['title'].strip():
                fail()
            for key in ('caption', 'metricLabel'):
                if key in scene and (not isinstance(scene[key], str) or not scene[key].strip()):
                    fail()
            if 'distance' in scene:
                distance = scene['distance']
                if scene['kind'] != 'route' or not isinstance(distance, dict) or set(distance) != {'metric', 'scale', 'unit'}:
                    fail()
                if distance['metric'] not in ('euclidean', 'manhattan') or not isinstance(distance['unit'], str) or not distance['unit'].strip():
                    fail()
                if type(distance['scale']) not in (int, float) or not math.isfinite(distance['scale']) or distance['scale'] <= 0:
                    fail()
            if scene['kind'] == 'subset':
                if not isinstance(scene['values'], list) or not isinstance(item['nodes'], list) or len(scene['values']) != len(item['nodes']):
                    fail()
                if any(type(n) not in (int, float) or not math.isfinite(n) or n <= 0 for n in [*scene['values'], scene['target']]):
                    fail()
                if not isinstance(scene['unit'], str) or not scene['unit'].strip():
                    fail()
        if any(not isinstance(item[k], str) or not item[k].strip() or len(item[k]) > 10000 for k in text_fields):
            fail()
        if item['id'] in ids:
            fail()
        ids.add(item['id'])
        nodes = item['nodes']
        if not isinstance(nodes, list) or not 1 <= len(nodes) <= 64:
            fail()
        if item.get('scene', {}).get('kind') in ('tour', 'placement') and math.isqrt(len(nodes)) ** 2 != len(nodes):
            fail()
        for node in nodes:
            if not isinstance(node, dict) or set(node) != {'label', 'x', 'y'}:
                fail()
            if not isinstance(node['label'], str) or not node['label'].strip():
                fail()
            if any(type(node[k]) not in (int, float) or not 5 <= node[k] <= 95 for k in ('x', 'y')):
                fail()
        def valid_route(route):
            return isinstance(route, list) and len(route) <= 128 and all(type(n) is int and 0 <= n < len(nodes) for n in route)
        if not isinstance(item['edges'], list) or len(item['edges']) > 512:
            fail()
        if any(not valid_route(edge) or len(edge) != 2 for edge in item['edges']):
            fail()
        sequences = [item['steps']]
        alternatives = item.get('scene', {}).get('alternatives', [])
        if not isinstance(alternatives, list) or len(alternatives) > 4:
            fail()
        variant_ids = {'initial'}
        for variant in alternatives:
            if not isinstance(variant, dict) or set(variant) != {'id', 'label', 'steps'}:
                fail()
            if any(not isinstance(variant[k], str) or not variant[k].strip() for k in ('id', 'label')):
                fail()
            if variant['id'] in variant_ids:
                fail()
            variant_ids.add(variant['id'])
            sequences.append(variant['steps'])
        for sequence in sequences:
            if not isinstance(sequence, list) or not 1 <= len(sequence) <= 300:
                fail()
            for step in sequence:
                if not isinstance(step, dict) or set(step) - {'phase'} != {'title', 'description', 'route', 'state'}:
                    fail()
                if any(not isinstance(step[k], str) or not step[k].strip() for k in ('title', 'description')):
                    fail()
                if step['state'] not in ('try', 'backtrack', 'success') or not valid_route(step['route']):
                    fail()
                if 'phase' in step and step['phase'] not in ('plan', 'move', 'act', 'done'):
                    fail()
    return value
