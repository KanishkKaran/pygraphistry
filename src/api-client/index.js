import { Subject } from 'rxjs/Subject';
import { Model } from 'viz-client/falcor';
import $$observable from 'symbol-observable';
import { Observable } from 'rxjs/Observable';
import { AsyncSubject } from 'rxjs/AsyncSubject';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { asap as AsapScheduler } from 'rxjs/scheduler/asap';
import { PostMessageDataSource } from '@graphistry/falcor-socket-datasource';
import fetchDataUntilSettled from '@graphistry/falcor-react-redux/lib/utils/fetchDataUntilSettled';
import {
    ref as $ref,
    atom as $atom,
    pathValue as $value,
    pathInvalidation as $invalidate
} from '@graphistry/falcor-json-graph';

import Color from 'color';

/**
 * @class Graphistry
 * @classdesc This object wraps a HTML IFrame of a Graphistry Visualization in order
 * to provide an API for interacting with the graph.
 * @extends Observable
 */
class Graphistry extends Observable {
    static view = null;
    static model = null;
    static workbook = null;
    static iFrame = null;

    static Color = Color;

    /**
     * Create Graphistry Observable by extending observable's methods
     * @param {Object} source - The source observable.
     */
    constructor(source) {
        if (!source || typeof source === 'function' || typeof source !== 'object') {
            super(source);
        } else {
            super();
            if (typeof source[$$observable] === 'function') {
                this.source = source[$$observable]();
            } else {
                this.source = this.constructor.from(source);
            }
        }
    }

    /**
     * Creates a new Observable with this as the source, and the passed
     * operator as the new Observable's operator.
     * @method Graphistry~lift
     * @param {Operator} operator - the operator defining the operation to take on the
     * observable
     * @return {Observable} a new observable with the operator applied
     */
    lift(operator) {
        const observable = new Graphistry(this);
        observable.operator = operator;
        return observable;
    }

    /**
     * Add columns to the current graph visuzliation's dataset
     * @method Graphistry.addColumns
     * @params {...Arrays} columns - One of more columns to be appended to the dataset
     * @return {Promise} A promise to return the result of the callback
     * @example
     * GraphistryJS(document.getElementById('viz'))
     *     .flatMap(function() {
     *         const columns = [
     *             ['edge', 'highways', [66, 101, 280], 'number'],
     *             ['point', 'theme parks', ['six flags', 'disney world', 'great america'], 'string']
     *         ];
     *         console.log('adding columns', columns);
     *         return g.addColumns.apply(g, columns);
     *     })
     */
    static addColumns(...columns) {
        const { view } = this;
        return new this(this
            .from(columns)
            .concatMap((column) => view.call('columns.add', column))
            .takeLast(1)
            .mergeMap(() => fetchDataUntilSettled({
                falcor: view, fragment: ({ columns = [] } = {}) => `{
                    columns: {
                        length, [0...${columns.length || 0}]: {
                            name, dataType, identifier, componentType
                        }
                    }
                }`
            }))
            .takeLast(1)
            .map(({ data }) => data.toJSON())
            .toPromise()
        );
    }


     /**
     * Toggle a leftside panel
     * @method Graphistry.toggleLeftPanel
     * @param {string} [panel] - Name of panel: filters, exclusions, scene, labels, layout
     * @param {boolean} [turnOn] - Whether to make panel visible, or turn all off
     * @return {Promise} The result of the callback
     * @example
     *  GraphistryJS(document.getElementById('viz'))
     *     .flatMap(function (g) {
     *         window.g = g;
     *         console.log('opening filters');
     *         return g.toggleLeftPanel('filters', true);
     *     })
     */
    static toggleLeftPanel(panel, turnOn) {
        const { view } = this;
        if (turnOn) {
            return new this(view.set(
                $value(`filters.controls[0].selected`, panel === 'filters'),
                $value(`scene.controls[1].selected`, panel === 'scene'),
                $value(`labels.controls[0].selected`, panel === 'labels'),
                $value(`layout.controls[0].selected`, panel === 'layout'),
                $value(`exclusions.controls[0].selected`, panel === 'exclusions'),
                $value(`panels.left`,
                    panel === 'filters' ? $ref(view._path.concat(`filters`))
                    : panel === 'scene' ? $ref(view._path.concat(`scene`))
                    : panel === 'labels' ? $ref(view._path.concat(`labels`))
                    : panel === 'layout' ? $ref(view._path.concat(`layout`))
                    : $ref(view._path.concat(`exclusions`)))
            )
            .map(({ json }) => json.toJSON())
            .toPromise());
        } else {
            return new this(view.set(
                $value(`panels.left`, undefined),
                $value(`filters.controls[0].selected`, false),
                $value(`scene.controls[1].selected`, false),
                $value(`labels.controls[0].selected`, false),
                $value(`layout.controls[0].selected`, false),
                $value(`exclusions.controls[0].selected`, false)
            )
            .map(({ json }) => json.toJSON())
            .toPromise());
        }
    }

    /**
     * Toggle inspector panel
     * @method Graphistry.toggleInspector
     * @param {boolean} [turnOn] - Whether to make panel visible
     * @return {Promise} The result of the callback
     * @example
     *  GraphistryJS(document.getElementById('viz'))
     *     .flatMap(function (g) {
     *         window.g = g;
     *         console.log('opening inspector panel');
     *         return g.toggleInspector(true);
     *     })
     */
    static toggleInspector(turnOn) {
        const { view } = this;
        if (!turnOn) {
            return new this(view.set(
                $value(`panels.bottom`, undefined),
                $value(`inspector.controls[0].selected`, false),
            )
            .map(({ json }) => json.toJSON())
            .toPromise());
        } else {
            return new this(view.set(
                $value(`inspector.controls[0].selected`, true),
                $value(`timebar.controls[0].selected`, false),
                $value(`panels.bottom`, $ref(view._path.concat(`inspector`)))
            )
            .map(({ json }) => json.toJSON())
            .toPromise());
        }
    }

    /**
     * Toggle histogram panel
     * @method Graphistry.toggleHistograms
     * @param {boolean} [turnOn] - Whether to make panel visible
     * @return {Promise} The result of the callback
     * @example
     *  GraphistryJS(document.getElementById('viz'))
     *     .flatMap(function (g) {
     *         window.g = g;
     *         console.log('opening histogram panel');
     *         return g.toggleHistograms(true);
     *     })
     */
    static toggleHistograms(turnOn) {
        const { view } = this;
        if (!turnOn) {
            return new this(view.set(
                $value(`panels.right`, undefined),
                $value(`histograms.controls[0].selected`, false)
            )
            .map(({ json }) => json.toJSON())
            .toPromise());
        } else {
            return new this(view.set(
                $value(`histograms.controls[0].selected`, true),
                $value(`panels.right`, $ref(view._path.concat(`histograms`)))
            )
            .map(({ json }) => json.toJSON())
            .toPromise());
        }
    }

    /**
     * Close the filters panel
     * @method Graphistry.closeFilters
     * @return {Promise} The result of the callback
     * @example
     * GraphistryJS(document.getElementById('viz'))
     *     .flatMap(function (g) {
     *         window.g = g;
     *         console.log('closing filters');
     *         return g.closeFilters();
     *     })
     */
    static closeFilters() {
        const { view } = this;
        return new this(view.set(
            $value(`panels.left`, undefined),
            $value(`filters.controls[0].selected`, false)
        )
        .map(({ json }) => json.toJSON())
        .toPromise());
    }

    /**
     * Run one step of Graphistry's clustering algorithm
     * @method Graphistry.tickClustering
     * @static
     * @return {Promise} The result of the callback
     * @example
     * GraphistryJS(document.getElementById('viz'))
     *     .flatMap(function (g) {
     *         window.g = g;
     *         console.log('starting to cluster');
     *         return g.tickClustering();
     *     })
     */
    static tickClustering() {

        const { view } = this;

        return new this(view.call('tick')
            .map(({ json }) => json.toJSON())
            .toPromise());
    }

    /**
     * Center the view of the graph
     * @method Graphistry.autocenter
     * @static
     * @param {number} percentile - Controls sensitivity to outliers
     * @param {function} [cb] - Callback function of type callback(error, result)
     * @return {Promise} The result of the callback
     * @example
     * GraphistryJS(document.getElementById('viz'))
     *     .flatMap(function (g) {
     *         window.g = g;
     *         console.log('centering');
     *         return g.autocenter(.90);
     *     })
     */
    static autocenter(percentile, cb) {

    }

    /**
     * Center the view of the graph
     * @method Graphistry.getCurrentWorkbook
     * @static
     * @param {function} [cb] - Callback function of type callback(error, result)
     * @return {Promise} The result of the callback
     * @example
     * GraphistryJS(document.getElementById('viz'))
     *     .flatMap(function (g) {
     *         window.g = g;
     *         return g.getCurrentWorkbook(function (err, obj){ alert('id: ' + obj.id); });
     *     })
     */
    static getCurrentWorkbook() {
        const { workbook } = this;
         return new this(workbook.get('id')
            .map(({ json }) => json.toJSON())
            .toPromise());
    }

    /**
     * Save the current workbook. A saved workbook will persist the analytics state
     * of the visualization, including active filters and exclusions
     * @method Graphistry.saveWorkbook
     * @static
     * @return {Promise} The result of the callback
     * @example
     * GraphistryJS(document.getElementById('viz'))
     *     .flatMap(function (g) {
     *         window.g = g;
     *         return g.saveWorkbook();
     *     })
     */
    static saveWorkbook() {

        const { workbook } = this;

        return new this(workbook.call('save')
            .map(({ json }) => json.toJSON())
            .toPromise());
    }


    /**
     * Hide or Show Toolbar UI
     * @method Graphistry.toogleToolbar
     * @static
     * @param {boolean} show - Set to true to show toolbar, and false to hide toolbar.
     * @return {Promise} The result of the callback
     * @example
     *
     * <button onclick="window.graphistry.toggleToolbar(false)">Hide toolbar</button>
     * <button onclick="window.graphistry.toggleToolbar(true)">Show toolbar</button>
     *
     */
    static toggleToolbar(show) {
        return this.updateSetting('showToolbar', !!show);
    }

    /**
     * Add a filter to the visualization with the given expression
     * @method Graphistry.addFilter
     * @static
     * @param {string} expr - An expression using the same language as our in-tool
     * exclusion and filter panel
     * @return {Promise} The result of the callback
     * @example
     * graphistry.addFilter('degree > 0');
     */
    static addFilter(expr) {

        const { view } = this;

        return new this(view.call('filters.add', expr)
            .map(({ json }) => json.toJSON())
            .toPromise());
    }

    /**
     * Add an to the visualization with the given expression
     * @method Graphistry.addExclusion
     * @static
     * @param {string} expr - An expression using the same language as our in-tool
     * exclusion and filter panel
     * @return {Promise} The result of the callback
     * @example
     * graphistry.addExclusion('degree > 0');
     */
    static addExclusion(expr) {
        const { view } = this;

        return new this(view.call('exclusions.add', expr)
            .map(({ json }) => json.toJSON())
            .toPromise());

    }




    /**
     * Add an to the visualization with the given expression
     * Key settings: showArrows, pruneOrphans, edgeOpacity, edgeSize, pointOpacity,
     * pointSize, labelOpacity, labelEnabled, labelPOI, zoom
     * @method Graphistry.updateSetting
     * @static
     * @param {string} name - the name of the setting to change
     * @param {string} val - the value to set the setting to.
     * @return {Promise} The result of the callback
     */
    static updateSetting(name, val) {

        const lookup = {

            //models/toolbar.js
            'showToolbar': ['view', 'toolbar.visible'],

            //models/scene/scene.js
            'showArrows':   ['view', 'scene.renderer.showArrows'],
            'pruneOrphans': ['view', 'scene.renderer.pruneOrphans'],
            'background':   ['view', 'scene.renderer.background.color'],
            'edgeOpacity':  ['view', 'scene.renderer.edges.opacity'],
            'edgeSize':     ['view', 'scene.renderer.edges.scaling'],
            'pointOpacity': ['view', 'scene.renderer.points.opacity'],
            'pointSize':    ['view', 'scene.renderer.points.scaling'],

            //models/camera.js
            'zoom': ['view', 'scene.camera.zoom'],

            //models/label.js
            'labelOpacity': ['view', 'scene.labels.opacity'],
            'labelEnabled': ['view', 'scene.labels.enabled'],
            'labelPOI': ['view', 'scene.labels.poiEnabled'],
            'labelColor': ['view', 'scene.labels.foreground.color'],
            'labelBackground': ['view', 'scene.labels.background.color'],

            //models/layout.js => viz-worker/simulator/layout.config.js:
            'precisionVsSpeed': ['view', 'layout.options.tau']

        };

        const [model, path] = lookup[name];

        return new this(this[model].set($value(path, val))
            .map(({ json }) => json.toJSON())
            .toPromise());
    }

    /**
     * Add an to the visualization with the given expression
     * @method Graphistry.updateZoom
     * @static
     * @param {string} level - Controls how far to zoom in or out.
     * @param {string} val - the value to set the setting to.
     * @return {Promise} The result of the callback
     */
    static updateZoom(level) {
        return this.updateSetting('zoom', level);
    }

    /**
     * Subscribe to label events
     * @method Graphistry.subscribeLabels
     * @static
     * @param {subscriptions} subscriptions - A list of subscriptions that
     * will subscribe to any label updates
     * @return {Promise} The result of the callback
     */
    static subscribeLabels({ onChange, onExit }) {

        const labelsStream = this.labelsStream || (this.labelsStream = this
            .fromEvent(window, 'message')
            .filter(({ data }) => data && data.type === 'labels-update')
            .map(({ data } = {}) => data.labels || [])
            .scan((sources, labels) => {

                const { labelsById, newSources } = labels.reduce((memo, label) => {

                    const { id } = label;
                    const { labelsById, newSources } = memo;

                    const source = (id in sources) &&
                        sources[id] || new ReplaySubject(1);

                    if (id in sources) {
                        delete sources[id];
                    }

                    labelsById[id] = label;
                    newSources[id] = source;

                    return memo;
                },  { labelsById: {}, newSources: Object.create(null) });

                for (const id in sources) {
                    sources[id].complete();
                }

                for (const id in newSources) {
                    newSources[id].next(labelsById[id]);
                }

                return newSources;
            }, Object.create(null))
            .multicast(() => new ReplaySubject(1))
            .let((connectable) => {
                connectable.connect();
                return connectable.refCount();
            })
        );

        return labelsStream.mergeMap(
                (sources) => Object.keys(sources),
                (sources, id) => sources[id]
            )
            .mergeMap((group) => group
                .do(({ id, type, pageX, pageY }) => onChange && onChange(id, type, pageX, pageY))
                .takeLast(1)
                .do(({ id, type }) => onExit && onExit(id, type))
            )
            .subscribe();
    }


}

/**
 * Function that creates a Graphistry Wrapped IFrame
 * @func GraphistryJS
 * @param {Object} IFrame - An IFrame that incudes a Graphistry visualization.
 * @return {Graphistry}
 * @example
 *
 * <iframe id="viz" src="http://127.0.0.1:10000/graph/graph.html?dataset=Miserables" />
 * <script>
 * document.addEventListener("DOMContentLoaded", function () {
 *
 *     GraphistryJS(document.getElementById('viz'))
 *         .flatMap(function (g) {
 *             window.g = g;
 *             document.getElementById('controls').style.opacity=1.0;
 *             console.log('opening filters');
 *             return g.openFilters();
 *         })
 *         .delay(5000)
 *         .flatMap(function() {
 *             console.log('filters opened');
 *             const columns = [
 *                 ['edge', 'highways', [66, 101, 280], 'number'],
 *                 ['point', 'theme parks', ['six flags', 'disney world', 'great america'], 'string']
 *             ];
 *             console.log('adding columns', columns);
 *             return g.addColumns.apply(g, columns);
 *        })
 *         .subscribe(function (result) {
 *             console.log('all columns: ', result);
 *         });
 * });
 * </script>
 *
 */
function GraphistryJS(iFrame) {

    if (!iFrame) {
        throw new Error('No iframe provided to Graphistry');
    }

    const model = new Model({
        recycleJSON: true,
        scheduler: AsapScheduler,
        treatErrorsAsValues: true,
        allowFromWhenceYouCame: true,
        source: new PostMessageDataSource(window, iFrame.contentWindow)
    });

    class InstalledGraphistry extends Graphistry {
        static model = model;
        static iFrame = iFrame;
        lift(operator) {
            const observable = new InstalledGraphistry(this);
            observable.operator = operator;
            return observable;
        }
    }

    InstalledGraphistry = wrapStaticObservableMethods(Observable, InstalledGraphistry);

    return InstalledGraphistry.defer(() => {

        const initEvent = Observable
            .fromEvent(window, 'message')
            .filter(({ data }) => data && data.type === 'init')
            .do(({ data }) => model.setCache(data.cache))
            .mergeMap(
                ({ data }) => model.get(`workbooks.open.views.current.id`),
                ({ data, source }, { json }) => {

                    const workbook = json.workbooks.open;
                    const view = workbook.views.current;

                    InstalledGraphistry.workbook = model.deref(workbook);
                    InstalledGraphistry.view = model.deref(view);

                    console.log(`initialized with view '${view.id}'`);
                    console.log('parent sending initialized message');

                    source.postMessage({
                        type: 'initialized',
                        agent: 'graphistryjs',
                        version: __VERSION__
                    }, '*');

                    return InstalledGraphistry;
                }
            )
            .take(1)
            .multicast(new AsyncSubject());

        initEvent.connect();

        console.log('parent sending ready message');

        // trigger hello if missed initial one
        iFrame.contentWindow.postMessage({
            type: 'ready',
            agent: 'graphistryjs',
            version: __VERSION__
        }, '*');

        return initEvent;
    });
}

import 'rxjs/add/operator/do';
import 'rxjs/add/operator/let';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/last';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/merge';
import 'rxjs/add/operator/concat';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/finally';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/concatMap';
import 'rxjs/add/operator/multicast';
import 'rxjs/add/operator/toPromise';
import 'rxjs/add/operator/takeUntil';

import 'rxjs/add/observable/of';
import 'rxjs/add/observable/from';
import 'rxjs/add/observable/defer';
import 'rxjs/add/observable/timer';
import 'rxjs/add/observable/merge';
import 'rxjs/add/observable/concat';
import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/observable/bindCallback';

Graphistry = wrapStaticObservableMethods(Observable, Graphistry);

module.exports = GraphistryJS;
module.exports.GraphistryJS = GraphistryJS;

function wrapStaticObservableMethods(Observable, Graphistry) {
    function createStaticWrapper(staticMethodName) {
        return function(...args) {
            return new Graphistry(Observable[staticMethodName](...args));
        }
    }
    for (const staticMethodName in Observable) {
        Graphistry[staticMethodName] = createStaticWrapper(staticMethodName);
    }
    Graphistry.bindCallback = (...args) => (...args2) => new Graphistry(Observable.bindCallback(...args)(...args2));
    return Graphistry;
}