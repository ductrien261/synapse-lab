"""Validate persisted simulation data before it reaches shared renderers."""
import json
import re

from rest_framework import serializers

MAX_BUNDLE_BYTES = 12_000_000
MAX_SOURCE_LENGTH = 100_000
MAX_STEPS = 2_500
TONES = {'idle', 'selected', 'active', 'rejected', 'complete'}


def _require(condition):
    if not condition:
        raise serializers.ValidationError('Dữ liệu mô phỏng không hợp lệ hoặc vượt giới hạn.')


def _choice(value, allowed):
    return isinstance(value, str) and value in allowed


def _validate_graph(graph):
    _require(isinstance(graph, dict) and isinstance(graph.get('nodes'), list)
             and isinstance(graph.get('edges'), list))
    _require(1 <= len(graph['nodes']) <= 100 and len(graph['edges']) <= 10_000)
    for node in graph['nodes']:
        _require(isinstance(node, dict) and type(node.get('id')) is int
                 and isinstance(node.get('label'), str) and _choice(node.get('tone'), TONES))
    ids = {node['id'] for node in graph['nodes']}
    _require(len(ids) == len(graph['nodes']))
    for edge in graph['edges']:
        _require(isinstance(edge, dict) and type(edge.get('from')) is int
                 and type(edge.get('to')) is int and edge['from'] in ids and edge['to'] in ids
                 and _choice(edge.get('tone'), TONES))
        _require('dashed' not in edge or type(edge['dashed']) is bool)


def _validate_panels(panels):
    _require(isinstance(panels, list) and 1 <= len(panels) <= 20)
    ids = []
    for panel in panels:
        _require(isinstance(panel, dict) and _choice(panel.get('kind'), {'matrix', 'array', 'chart'})
                 and isinstance(panel.get('id'), str) and isinstance(panel.get('title'), str))
        ids.append(panel['id'])
        cells = panel.get('cells')
        _require(isinstance(cells, list) and 1 <= len(cells) <= 20)
        _require(panel['kind'] == 'matrix' or len(cells) == 1)
        width = len(cells[0]) if isinstance(cells[0], list) else -1
        for row in cells:
            _require(isinstance(row, list) and len(row) <= 100 and len(row) == width)
            for cell in row:
                _require(isinstance(cell, dict) and isinstance(cell.get('value'), str)
                         and _choice(cell.get('tone'), TONES))
    _require(len(ids) == len(set(ids)))


def _validate_step(step, renderer, line_count):
    _require(isinstance(step, dict) and isinstance(step.get('message'), str))
    _require(type(step.get('codeLine')) is int and 1 <= step['codeLine'] <= line_count)
    action = step.get('action')
    _require(isinstance(action, dict) and isinstance(action.get('label'), str)
             and _choice(action.get('tone'), TONES))
    context = step.get('context')
    _require(isinstance(step.get('metrics'), list) and isinstance(context, dict)
             and isinstance(context.get('values'), list) and isinstance(context.get('title'), str))
    for item in step['metrics'] + context['values']:
        _require(isinstance(item, dict) and isinstance(item.get('label'), str)
                 and isinstance(item.get('value'), str))
    narration = step.get('narration')
    if narration is not None:
        _require(isinstance(narration, dict) and type(narration.get('pause')) is bool
                 and all(isinstance(narration.get(key), str) for key in ['conclusion', 'next']))
        _require(all(isinstance(text, str) for key, text in narration.items() if key != 'pause'))
    if renderer == 'matrix':
        _validate_panels(step.get('panels'))
    else:
        _validate_graph(step.get('graph'))


def _validate_trace(trace, renderer):
    _require(isinstance(trace, dict) and trace.get('renderer') == renderer)
    _require(isinstance(trace.get('summary'), str) and isinstance(trace.get('code'), dict))
    code = trace['code']
    _require(_choice(code.get('language'), {'cpp', 'javascript', 'typescript'})
             and isinstance(code.get('source'), str) and 0 < len(code['source']) <= MAX_SOURCE_LENGTH)
    line_count = len(code['source'].split('\n'))
    if 'visibleLines' in code:
        _require(isinstance(code['visibleLines'], list) and all(type(line) is int
                 and 1 <= line <= line_count for line in code['visibleLines']))
    _require(isinstance(trace.get('steps'), list) and 1 <= len(trace['steps']) <= MAX_STEPS)
    for step in trace['steps']:
        _validate_step(step, renderer, line_count)


def validate_simulation(value):
    if value == {}:
        return value
    _require(isinstance(value, dict) and set(value) == {'version', 'algorithm_path', 'config', 'samples'})
    _require(type(value['version']) is int and value['version'] == 1
             and isinstance(value['algorithm_path'], str)
             and re.fullmatch(r'[a-z0-9-]+/[a-z0-9-]+', value['algorithm_path']))
    _require(len(json.dumps(value, ensure_ascii=False).encode('utf-8')) <= MAX_BUNDLE_BYTES)
    config, samples = value['config'], value['samples']
    _require(isinstance(config, dict) and _choice(config.get('renderer'), {'matrix', 'graph'})
             and isinstance(config.get('title'), str) and isinstance(config.get('samples'), list))
    if 'customInput' in config:
        custom = config['customInput']
        _require(isinstance(custom, dict) and custom.get('kind') == 'undirected-graph'
                 and type(custom.get('minVertices')) is int and type(custom.get('maxVertices')) is int
                 and 2 <= custom['minVertices'] <= custom['maxVertices'] <= 6)
    _require(isinstance(samples, dict) and 1 <= len(samples) <= 20)
    keys = []
    for sample in config['samples']:
        _require(isinstance(sample, dict) and isinstance(sample.get('key'), str)
                 and isinstance(sample.get('label'), str))
        keys.append(sample['key'])
    _require(len(keys) == len(set(keys)) and set(keys) == set(samples))
    for trace in samples.values():
        _validate_trace(trace, config['renderer'])
    return value
