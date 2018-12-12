import requests
import os

from graphistry.src import util_arrow, util_dict, graph_rectify, util_graph

NODE_ID  = '__node_id__'
EDGE_ID  = '__edge_id__'
EDGE_SRC = '__edge_src__'
EDGE_DST = '__edge_dst__'

class Plotter(object):

    _data = {
        'nodes': None,
        'edges': None
    }

    _bindings = {
        # node : data
        'node_id': None,

        # edge : data
        'edge_id': None,
        'edge_src': None,
        'edge_dst': None,

        # node : visualization
        'node_title': None,
        'node_label': None,
        'node_color': None,
        'node_size': None,

        # edge : visualization
        'edge_title': None,
        'edge_label': None,
        'edge_color': None,
        'edge_weight': None,
    }

    _bindings_map = {
        'node_id':     'nodeId',
        'edge_id':     'edgeId',
        'edge_src':    'source',
        'edge_dst':    'destination',
        'edge_color':  'edgeColor',
        'edge_label':  'edgeLabel',
        'edge_title':  'edgeTitle',
        'edge_weight': 'edgeWeight',
        'node_color':  'pointColor',
        'node_label':  'pointLabel',
        'node_title':  'pointTitle',
        'node_size':   'pointSize'
    }

    _settings = {
        'height': 100
    }

    def __init__(
        self,
        base=None,
        data=None,
        bindings=None,
        settings=None
    ):
        if base is None:
            base = self

        self._data     = data     or base._data     or self._data
        self._bindings = bindings or base._bindings or self._bindings
        self._settings = settings or base._settings or self._settings

    def data(self,  **data):
        if 'graph' in data:
            (edges, nodes) = util_graph.decompose(data['graph'])
            return self.data(
                edges=edges,
                nodes=nodes
            )

        if 'edges' in data:
            data['edges'] = util_arrow.to_arrow(data['edges'])

        if 'nodes' in data:
            data['nodes'] = util_arrow.to_arrow(data['nodes'])

        return Plotter(
            self,
            data=util_dict.assign(self._data, data)
        )

    def bind(self,  **bindings):
        return Plotter(
            self,
            bindings=util_dict.assign(self._bindings, bindings)
        )

    def settings(self, **settings):
        return Plotter(
            self,
            settings=util_dict.assign(self._settings, settings)
        )

    def nodes(self, nodes):
        return self.data(nodes=nodes)

    def edges(self, edges):
        return self.data(edges=edges)

    def graph(self, graph):
        return self.data(graph=graph)

    def plot(self):
        # TODO(cwharris): verify required bindings

        (edges, nodes) = graph_rectify.rectify(
            edges=self._data['edges'],
            nodes=self._data['nodes'],
            edge=self._bindings['edge_id'],
            node=self._bindings['node_id'],
            edge_src=self._bindings['edge_src'],
            edge_dst=self._bindings['edge_dst'],
            safe=True
        )

        nodeBuffer = util_arrow.table_to_buffer(nodes)
        edgeBuffer = util_arrow.table_to_buffer(edges)

        import pyarrow as arrow

        a = arrow.open_stream(nodeBuffer)
        b = arrow.open_stream(edgeBuffer)

        files = {
            'nodes': ('nodes', nodeBuffer, 'application/octet-stream'),
            'edges': ('edges', edgeBuffer, 'application/octet-stream')
        }

        data = {
            self._bindings_map[binding]: item
            for binding, item in self._bindings.items()
            if item is not None
        }
        
        response = requests.post(
            # 'http://streamgl-datasets/datasets', # TODO(cwharris): configurable via env + graphistry.register(...) 'GRAPHISTRY_HOSTNAME'
            'http://localhost/datasets',
            files=files,
            data=data
        )

        # TODO(cwharris): Try to present a friendly error message.

        response.raise_for_status()

        # TODO(cwharris): Transform in to appropriate return value (HTML, etc).

        jres = response.json()

        return "localhost/graph/%s" % (jres['revisionId'])