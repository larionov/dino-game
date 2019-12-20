
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
(function () {
  'use strict';

  function noop() {}

  function add_location(element, file, line, column, char) {
  	element.__svelte_meta = {
  		loc: { file, line, column, char }
  	};
  }

  function run(fn) {
  	return fn();
  }

  function blank_object() {
  	return Object.create(null);
  }

  function run_all(fns) {
  	fns.forEach(run);
  }

  function is_function(thing) {
  	return typeof thing === 'function';
  }

  function safe_not_equal(a, b) {
  	return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
  }

  function validate_store(store, name) {
  	if (!store || typeof store.subscribe !== 'function') {
  		throw new Error(`'${name}' is not a store with a 'subscribe' method`);
  	}
  }

  function subscribe(component, store, callback) {
  	const unsub = store.subscribe(callback);

  	component.$$.on_destroy.push(unsub.unsubscribe
  		? () => unsub.unsubscribe()
  		: unsub);
  }

  function append(target, node) {
  	target.appendChild(node);
  }

  function insert(target, node, anchor) {
  	target.insertBefore(node, anchor || null);
  }

  function detach(node) {
  	node.parentNode.removeChild(node);
  }

  function element(name) {
  	return document.createElement(name);
  }

  function svg_element(name) {
  	return document.createElementNS('http://www.w3.org/2000/svg', name);
  }

  function text(data) {
  	return document.createTextNode(data);
  }

  function space() {
  	return text(' ');
  }

  function listen(node, event, handler, options) {
  	node.addEventListener(event, handler, options);
  	return () => node.removeEventListener(event, handler, options);
  }

  function stop_propagation(fn) {
  	return function(event) {
  		event.stopPropagation();
  		return fn.call(this, event);
  	};
  }

  function attr(node, attribute, value) {
  	if (value == null) node.removeAttribute(attribute);
  	else node.setAttribute(attribute, value);
  }

  function xlink_attr(node, attribute, value) {
  	node.setAttributeNS('http://www.w3.org/1999/xlink', attribute, value);
  }

  function to_number(value) {
  	return value === '' ? undefined : +value;
  }

  function children(element) {
  	return Array.from(element.childNodes);
  }

  function set_data(text, data) {
  	data = '' + data;
  	if (text.data !== data) text.data = data;
  }

  function set_style(node, key, value) {
  	node.style.setProperty(key, value);
  }

  let current_component;

  function set_current_component(component) {
  	current_component = component;
  }

  // TODO figure out if we still want to support
  // shorthand events, or if we want to implement
  // a real bubbling mechanism
  function bubble(component, event) {
  	const callbacks = component.$$.callbacks[event.type];

  	if (callbacks) {
  		callbacks.slice().forEach(fn => fn(event));
  	}
  }

  const dirty_components = [];

  const resolved_promise = Promise.resolve();
  let update_scheduled = false;
  const binding_callbacks = [];
  const render_callbacks = [];
  const flush_callbacks = [];

  function schedule_update() {
  	if (!update_scheduled) {
  		update_scheduled = true;
  		resolved_promise.then(flush);
  	}
  }

  function add_render_callback(fn) {
  	render_callbacks.push(fn);
  }

  function flush() {
  	const seen_callbacks = new Set();

  	do {
  		// first, call beforeUpdate functions
  		// and update components
  		while (dirty_components.length) {
  			const component = dirty_components.shift();
  			set_current_component(component);
  			update(component.$$);
  		}

  		while (binding_callbacks.length) binding_callbacks.shift()();

  		// then, once components are updated, call
  		// afterUpdate functions. This may cause
  		// subsequent updates...
  		while (render_callbacks.length) {
  			const callback = render_callbacks.pop();
  			if (!seen_callbacks.has(callback)) {
  				callback();

  				// ...so guard against infinite loops
  				seen_callbacks.add(callback);
  			}
  		}
  	} while (dirty_components.length);

  	while (flush_callbacks.length) {
  		flush_callbacks.pop()();
  	}

  	update_scheduled = false;
  }

  function update($$) {
  	if ($$.fragment) {
  		$$.update($$.dirty);
  		run_all($$.before_render);
  		$$.fragment.p($$.dirty, $$.ctx);
  		$$.dirty = null;

  		$$.after_render.forEach(add_render_callback);
  	}
  }

  function mount_component(component, target, anchor) {
  	const { fragment, on_mount, on_destroy, after_render } = component.$$;

  	fragment.m(target, anchor);

  	// onMount happens after the initial afterUpdate. Because
  	// afterUpdate callbacks happen in reverse order (inner first)
  	// we schedule onMount callbacks before afterUpdate callbacks
  	add_render_callback(() => {
  		const new_on_destroy = on_mount.map(run).filter(is_function);
  		if (on_destroy) {
  			on_destroy.push(...new_on_destroy);
  		} else {
  			// Edge case - component was destroyed immediately,
  			// most likely as a result of a binding initialising
  			run_all(new_on_destroy);
  		}
  		component.$$.on_mount = [];
  	});

  	after_render.forEach(add_render_callback);
  }

  function destroy(component, detaching) {
  	if (component.$$) {
  		run_all(component.$$.on_destroy);
  		component.$$.fragment.d(detaching);

  		// TODO null out other refs, including component.$$ (but need to
  		// preserve final state?)
  		component.$$.on_destroy = component.$$.fragment = null;
  		component.$$.ctx = {};
  	}
  }

  function make_dirty(component, key) {
  	if (!component.$$.dirty) {
  		dirty_components.push(component);
  		schedule_update();
  		component.$$.dirty = blank_object();
  	}
  	component.$$.dirty[key] = true;
  }

  function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
  	const parent_component = current_component;
  	set_current_component(component);

  	const props = options.props || {};

  	const $$ = component.$$ = {
  		fragment: null,
  		ctx: null,

  		// state
  		props: prop_names,
  		update: noop,
  		not_equal: not_equal$$1,
  		bound: blank_object(),

  		// lifecycle
  		on_mount: [],
  		on_destroy: [],
  		before_render: [],
  		after_render: [],
  		context: new Map(parent_component ? parent_component.$$.context : []),

  		// everything else
  		callbacks: blank_object(),
  		dirty: null
  	};

  	let ready = false;

  	$$.ctx = instance
  		? instance(component, props, (key, value) => {
  			if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
  				if ($$.bound[key]) $$.bound[key](value);
  				if (ready) make_dirty(component, key);
  			}
  		})
  		: props;

  	$$.update();
  	ready = true;
  	run_all($$.before_render);
  	$$.fragment = create_fragment($$.ctx);

  	if (options.target) {
  		if (options.hydrate) {
  			$$.fragment.l(children(options.target));
  		} else {
  			$$.fragment.c();
  		}

  		if (options.intro && component.$$.fragment.i) component.$$.fragment.i();
  		mount_component(component, options.target, options.anchor);
  		flush();
  	}

  	set_current_component(parent_component);
  }

  class SvelteComponent {
  	$destroy() {
  		destroy(this, true);
  		this.$destroy = noop;
  	}

  	$on(type, callback) {
  		const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
  		callbacks.push(callback);

  		return () => {
  			const index = callbacks.indexOf(callback);
  			if (index !== -1) callbacks.splice(index, 1);
  		};
  	}

  	$set() {
  		// overridden by instance, if it has props
  	}
  }

  class SvelteComponentDev extends SvelteComponent {
  	constructor(options) {
  		if (!options || (!options.target && !options.$$inline)) {
  			throw new Error(`'target' is a required option`);
  		}

  		super();
  	}

  	$destroy() {
  		super.$destroy();
  		this.$destroy = () => {
  			console.warn(`Component was already destroyed`); // eslint-disable-line no-console
  		};
  	}
  }

  var Sprites = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n<!-- Created with Inkscape (http://www.inkscape.org/) -->\n\n<svg\n   xmlns:dc=\"http://purl.org/dc/elements/1.1/\"\n   xmlns:cc=\"http://creativecommons.org/ns#\"\n   xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\"\n   xmlns:svg=\"http://www.w3.org/2000/svg\"\n   xmlns=\"http://www.w3.org/2000/svg\"\n   xmlns:xlink=\"http://www.w3.org/1999/xlink\"\n   xmlns:sodipodi=\"http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd\"\n   xmlns:inkscape=\"http://www.inkscape.org/namespaces/inkscape\"\n   version=\"1.1\"\n   id=\"svg184\"\n   width=\"8703.999\"\n   height=\"512\"\n   viewBox=\"0 0 8703.999 512\"\n   sodipodi:docname=\"Sprites-project.svg\"\n   inkscape:version=\"0.92.4 5da689c313, 2019-01-14\">\n  <metadata\n     id=\"metadata190\">\n    <rdf:RDF>\n      <cc:Work\n         rdf:about=\"\">\n        <dc:format>image/svg+xml</dc:format>\n        <dc:type\n           rdf:resource=\"http://purl.org/dc/dcmitype/StillImage\" />\n        <dc:title></dc:title>\n      </cc:Work>\n    </rdf:RDF>\n  </metadata>\n  <defs\n     id=\"defs188\">\n    <g\n       id=\"running\"\n       inkscape:label=\"#g4692\">\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 208,298.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4599\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 128,186.66669 v 8 8 h -8 -8 v 56 56 H 72 32 v 8 8 h -8 -8 v 8 8 h 8 8 v 8 8 h 8 8 v 8 8 H 32 16 v 8 8 H 8 0 v 8 8 h 24 24 v -8 -8 h 80 80 v 8 8 h 24 24 v -8 -8 h -8 -8 v -8 -8 h -8 -8 v -24 -24 h -8 -8 v -8 -8 h -8 -8 v -8 -8 h -8 -8 v -8 -8 h 8 8 v 8 8 h 8 8 v -8 -8 h 8 8 v -40 -40 h -8 -8 v -8 -8 h -8 -8 v 8 8 h -8 -8 v 24 24 h -8 -8 v -24 -24 h -8 -8 v -8 -8 h -8 z\"\n         id=\"path4597\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 208,298.66669 h 8 8 v -8 -8 h -8 -8 v 8 z\"\n         id=\"path4477\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 192,298.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4475\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 176,282.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4473\"\n         inkscape:connector-curvature=\"0\" />\n    </g>\n    <g\n       id=\"stone\">\n      <path\n         inkscape:connector-curvature=\"0\"\n         id=\"path4156\"\n         d=\"m 5648,456.66669 v -48 h 8 8 v -16 -16 h 8 8 v -24 -24 h 8 8 v -24 -24 h 8 8 v -16 -16 h 8 8 v -24 -24 h 8 8 v -32 -32 h 8 8 v -16 -16 h 16 16 v -8 -8 h 56 56 v 8 8 h 16 16 v 8 8 h 8 8 v 32 32 h 8 8 v 40 40 h 8 8 v 16 16 h 8 8 v 16 16 h 8 8 v 88 88 h -184 -184 z\"\n         style=\"fill:#8a8d8b\" />\n    </g>\n    <g\n       id=\"stone-scared\">\n      <path\n         inkscape:connector-curvature=\"0\"\n         id=\"path4152\"\n         d=\"m 5136,464.66669 v -40 h 8 8 v -24 -24 h 8 8 v -16 -16 h 8 8 v -24 -24 h 8 8 v -24 -24 h 8 8 v -24 -24 h 8 8 v -32 -32 h 8 8 v -16 -16 h 16 16 v -8 -8 h 56 56 v 8 8 h 16 16 v 8 8 h 8 8 v 32 32 h 8 8 v 48 48 h 8 8 v 16 16 h 8 8 v 16 16 h 8 8 v 80 80 h -184 -184 z m 224,-144 v -56 h -8 -8 v -8 -8 h -24 -24 v 24 24 h -8 -8 v 32 32 h 8 8 v 8 8 h 32 32 z m -48,32 v -8 h -8 -8 v -16 -16 h 8 8 v -24 -24 h 8 8 v 8 8 h 8 8 v 40 40 h -16 -16 z m -16,-144 v -24 h -24 -24 v 24 24 h 24 24 z m 112,0 v -24 h -24 -24 v 24 24 h 24 24 z\"\n         style=\"fill:#5c645e\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 5296,248.66669 v 24 24 h -8 -8 v 32 32 h 8 8 v 8 8 h 32 32 v -56 -56 h -8 -8 v -8 -8 h -24 z m 16,16 h 8 8 v 8 8 h 8 8 v 40 40 h -16 -16 v -8 -8 h -8 -8 v -16 -16 h 8 8 v -24 z\"\n         id=\"path4551\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 5376,200.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4549\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 5264,200.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4547\"\n         inkscape:connector-curvature=\"0\" />\n    </g>\n    <g\n       inkscape:label=\"#g4824\"\n       id=\"bird-flap\">\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 7952,346.66669 v 24 24 h 8 8 v -24 -24 h -8 z\"\n         id=\"path4678\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 7824,314.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4672\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 7872,298.66669 v 8 8 h -8 -8 v 8 8 h 8 8 v 8 8 h 16 16 v 24 24 h 16 16 v -32 -32 h 8 8 v -8 -8 h -8 -8 v -8 -8 h -32 z\"\n         id=\"path4660\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 7952,314.66669 v 8 8 h 32 32 v -8 -8 h -32 z\"\n         id=\"path4633\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 7856,314.66669 h 8 8 v -8 -8 h -8 -8 v 8 z\"\n         id=\"path4535\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 7840,330.66669 h -8 -8 v -8 -8 h 8 8 v -8 -8 h -16 -16 v 24 24 h 16 16 v -8 z\"\n         id=\"path4533\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 7856,330.66669 v -8 -8 h -8 -8 v 8 8 h 8 z\"\n         id=\"path4531\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 7872,346.66669 v -8 -8 h -8 -8 v 8 8 h 8 z\"\n         id=\"path4529\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 7904,394.66669 v -24 -24 h -16 -16 v 8 8 h 8 8 v 16 16 h 8 z\"\n         id=\"path4527\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 7936,394.66669 h -16 -16 v 8 8 h 16 16 v -8 z\"\n         id=\"path4525\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 7968,394.66669 h -8 -8 v 8 8 h 8 8 v -8 z\"\n         id=\"path4523\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 7872,282.66669 v 8 8 h 32 32 v 8 8 h 40 40 v 8 8 h -40 -40 v 32 32 h 8 8 v -24 -24 h 8 8 v 24 24 h 8 8 v -24 -24 h 24 24 v -24 -24 h -32 -32 v -8 -8 h -48 z\"\n         id=\"path4521\"\n         inkscape:connector-curvature=\"0\" />\n    </g>\n    <g\n       inkscape:label=\"#g4810\"\n       id=\"bird2-scared\">\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 7440,346.66669 v 24 24 h 8 8 v -24 -24 h -8 z\"\n         id=\"path4676\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 7312,314.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4670\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 7360,298.66669 v 8 8 h -8 -8 v 8 8 h 8 8 v 8 8 h 16 16 v 24 24 h 16 16 v -32 -32 h -8 -8 v -16 -16 h -24 z\"\n         id=\"path4658\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 7456,314.66669 v 8 8 h 24 24 v -8 -8 h -24 z\"\n         id=\"path4631\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 7424,298.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4545\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 7328,330.66669 h -8 -8 v -8 -8 h 8 8 v -8 -8 h -16 -16 v 24 24 h 16 16 v -8 z\"\n         id=\"path4519\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 7456,394.66669 h -8 -8 v 8 8 h 8 8 v -8 z\"\n         id=\"path4517\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 7424,394.66669 h 8 8 v -24 -24 h 8 8 v 24 24 h 8 8 v -24 -24 h 24 24 v -24 -24 h -32 -32 v 8 8 h 24 24 v 8 8 h -40 -40 v 32 z\"\n         id=\"path4515\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 7392,394.66669 v 8 8 h 16 16 v -8 -8 h -16 z\"\n         id=\"path4513\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 7360,346.66669 v 8 8 h 8 8 v 16 16 h 8 8 v -24 -24 h -16 z\"\n         id=\"path4511\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 7344,330.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4509\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 7344,314.66669 h -8 -8 v 8 8 h 8 8 v -8 z\"\n         id=\"path4507\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 7360,298.66669 h -8 -8 v 8 8 h 8 8 v -8 z\"\n         id=\"path4505\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 7360,282.66669 v 8 8 h 24 24 v -8 -8 h -24 z\"\n         id=\"path4503\"\n         inkscape:connector-curvature=\"0\" />\n    </g>\n    <g\n       id=\"bird-scared\"\n       inkscape:label=\"#g4794\">\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 6928,346.66669 v 24 24 h 8 8 v -24 -24 h -8 z\"\n         id=\"path4674\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 6800,314.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4668\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 6848,298.66669 v 8 8 h -8 -8 v 8 8 h 8 8 v 8 8 h 16 16 v 24 24 h 16 16 v -32 -32 h -8 -8 v -16 -16 h -24 z\"\n         id=\"path4656\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 6944,314.66669 v 8 8 h 24 24 v -8 -8 h -24 z\"\n         id=\"path4629\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 6912,298.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4543\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 6816,330.66669 h -8 -8 v -8 -8 h 8 8 v -8 -8 h -16 -16 v 24 24 h 16 16 v -8 z\"\n         id=\"path4501\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 6944,394.66669 h -8 -8 v 8 8 h 8 8 v -8 z\"\n         id=\"path4499\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 6912,394.66669 h 8 8 v -24 -24 h 8 8 v 24 24 h 8 8 v -24 -24 h 24 24 v -24 -24 h -32 -32 v 8 8 h 24 24 v 8 8 h -40 -40 v 32 z\"\n         id=\"path4497\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 6880,394.66669 v 8 8 h 16 16 v -8 -8 h -16 z\"\n         id=\"path4495\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 6848,346.66669 v 8 8 h 8 8 v 16 16 h 8 8 v -24 -24 h -16 z\"\n         id=\"path4493\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 6832,330.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4491\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 6832,314.66669 h -8 -8 v 8 8 h 8 8 v -8 z\"\n         id=\"path4489\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 6848,298.66669 h -8 -8 v 8 8 h 8 8 v -8 z\"\n         id=\"path4487\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 6848,282.66669 v 8 8 h 24 24 v -8 -8 h -24 z\"\n         id=\"path4485\"\n         inkscape:connector-curvature=\"0\" />\n    </g>\n    <g\n       id=\"running2\"\n       inkscape:label=\"#g4732\">\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 3280,298.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4621\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 3200,186.66669 v 8 8 h -8 -8 v 56 56 h -40 -40 v 8 8 h -8 -8 v 8 8 h 8 8 v 8 8 h 8 8 v 8 8 h -16 -16 v 16 16 h 24 24 v -8 -8 h 72 72 v 8 8 h 24 24 v -16 -16 h -16 -16 v -24 -24 h -8 -8 v -8 -8 h -8 -8 v -8 -8 h -8 -8 v -8 -8 h 8 8 v 8 8 h 8 8 v -8 -8 h 8 8 v -40 -40 h -8 -8 v -8 -8 h -8 -8 v 8 8 h -8 -8 v 24 24 h -8 -8 v -24 -24 h -8 -8 v -8 -8 h -8 z\"\n         id=\"path4619\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 3280,298.66669 h 8 8 v -8 -8 h -8 -8 v 8 z\"\n         id=\"path4483\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 3264,298.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4481\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 3248,282.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4479\"\n         inkscape:connector-curvature=\"0\" />\n    </g>\n    <g\n       inkscape:label=\"#g4685\"\n       id=\"idle\"\n       >\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 208,298.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4595\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 128,186.66669 v 8 8 h -8 -8 v 56 56 H 72 32 v 8 8 h -8 -8 v 8 8 h 8 8 v 8 8 h 8 8 v 24 24 h 8 8 v 8 8 h 16 16 v -16 -16 h 40 40 v 16 16 h 16 16 v -8 -8 h 8 8 v -40 -40 h -8 -8 v -8 -8 h -8 -8 v -8 -8 h -8 -8 v -8 -8 h 8 8 v 8 8 h 8 8 v -8 -8 h 8 8 v -40 -40 h -8 -8 v -8 -8 h -8 -8 v 8 8 h -8 -8 v 24 24 h -8 -8 v -24 -24 h -8 -8 v -8 -8 h -8 z\"\n         id=\"path4150\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 208,298.66669 h 8 8 v -8 -8 h -8 -8 v 8 z\"\n         id=\"path4471\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 192,298.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4469\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 176,282.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4467\"\n         inkscape:connector-curvature=\"0\" />\n    </g>\n    <g\n       id=\"crying\"\n       inkscape:label=\"#g4725\"\n       >\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 240,330.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4654\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 224,314.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4652\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 192,282.66669 v 8 8 h 8 8 v 8 8 h 8 8 v -16 -16 h -16 z\"\n         id=\"path4650\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 112,314.66669 h -8 -8 v 8 8 h 8 8 v -8 z\"\n         id=\"path4648\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 112,282.66669 v 16 16 h 8 8 v -8 -8 h 8 8 v -8 -8 h -16 z\"\n         id=\"path4646\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 128,186.66669 v 8 8 h -8 -8 v 32 32 h 24 24 v 8 8 h -8 -8 v 8 8 h -8 -8 v 8 8 h -8 -8 v 8 8 h -8 -8 v -8 -8 H 64 32 v 8 8 h -8 -8 v 8 8 h 8 8 v 8 8 h 8 8 v 8 8 H 32 16 v 16 16 h 24 24 v -8 -8 h 72 72 v 8 8 h 24 24 v -16 -16 h -16 -16 v -24 -24 h -8 -8 v -16 -16 h -8 -8 v -8 -8 h -8 -8 v -8 -8 h 24 24 v -32 -32 h -8 -8 v -8 -8 h -8 -8 v 8 8 h -8 -8 v 24 24 h -8 -8 v -24 -24 h -8 -8 v -8 -8 h -8 z m 32,112 h 8 8 v 8 8 h -8 -8 v -8 z\"\n         id=\"path4617\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 160,298.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4541\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 176,266.66669 v 8 8 h 24 24 v -8 -8 h -24 z\"\n         id=\"path4465\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 112,266.66669 v 8 8 h 24 24 v -8 -8 h -24 z\"\n         id=\"path4463\"\n         inkscape:connector-curvature=\"0\" />\n    </g>\n    <g\n       id=\"scared\"\n       inkscape:label=\"#g4714\"\n       >\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 172,298.66669 v 8 8 h -8 -8 v -8 -8 h -24 -24 v 8 8 H 68 28 v 8 8 h -8 -8 v 8 8 h 8 8 v 8 8 h 8 8 v 8 8 H 28 12 v 16 16 h 24 24 v -8 -8 h 72 72 v 8 8 h 24 24 v -16 -16 h -16 -16 v -24 -24 h -8 -8 v -8 -8 h 8 8 v -8 -8 h -24 z\"\n         id=\"path4615\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 172,250.66669 h 24 24 v -24 -24 h -8 -8 v -8 -8 h -8 -8 v 8 8 h -8 -8 v 24 z\"\n         id=\"path4613\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 156,250.66669 v 24 24 h 8 8 v -24 -24 h -8 z\"\n         id=\"path4611\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 124,186.66669 v 8 8 h -8 -8 v 24 24 h 24 24 v -24 -24 h -8 -8 v -8 -8 h -8 z\"\n         id=\"path4609\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 156,298.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4539\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 188,266.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4461\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 124,266.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4459\"\n         inkscape:connector-curvature=\"0\" />\n    </g>\n    <g\n       id=\"angry\"\n       inkscape:label=\"#g4705\"\n       >\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 176,298.66669 v 8 8 h -8 -8 v -8 -8 h -24 -24 v 8 8 H 72 32 v 8 8 h -8 -8 v 8 8 h 8 8 v 8 8 h 8 8 v 16 16 h -8 -8 v 16 16 h 16 16 v -8 -8 h 8 8 v -8 -8 h 56 56 v 8 8 h 8 8 v 8 8 h 16 16 v -16 -16 h -8 -8 v -32 -32 h -8 -8 v -8 -8 h 8 8 v -8 -8 h -24 z\"\n         id=\"path4607\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 176,250.66669 h 8 8 v -8 -8 h 8 8 v 8 8 h 8 8 v -24 -24 h -8 -8 v -8 -8 h -8 -8 v 8 8 h -8 -8 v 24 z\"\n         id=\"path4605\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 160,250.66669 v 24 24 h 8 8 v -24 -24 h -8 z\"\n         id=\"path4603\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 128,186.66669 v 8 8 h -8 -8 v 24 24 h 8 8 v -8 -8 h 8 8 v 8 8 h 8 8 v -24 -24 h -8 -8 v -8 -8 h -8 z\"\n         id=\"path4601\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 160,298.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4537\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 192,266.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4457\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 192,250.66669 h -8 -8 v 8 8 h 8 8 v -8 z\"\n         id=\"path4455\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 192,234.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4453\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 144,266.66669 h -8 -8 v 8 8 h 8 8 v -8 z\"\n         id=\"path4451\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 144,250.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4449\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 128,234.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4447\"\n         inkscape:connector-curvature=\"0\" />\n    </g>\n    <g\n       id=\"bird3\"\n       inkscape:label=\"#g4769\">\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 4752,314.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4666\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 4832,250.66669 v 40 40 h -8 -8 v -16 -16 h -8 -8 v 8 8 h -8 -8 v 8 8 h 8 8 v 8 8 h 48 48 v -8 -8 h -16 -16 v -40 -40 h -16 z\"\n         id=\"path4644\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 4832,218.66669 v 8 8 h 16 16 v -8 -8 h -16 z\"\n         id=\"path4638\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 4896,314.66669 v 8 8 h 24 24 v -8 -8 h -24 z\"\n         id=\"path4627\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 4768,330.66669 h -8 -8 v -8 -8 h 8 8 v -8 -8 h -16 -16 v 24 24 h 16 16 v -8 z\"\n         id=\"path4445\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 4800,346.66669 v 8 8 h 56 56 v -8 -8 h 24 24 v -24 -24 h -32 -32 v 8 8 h 24 24 v 8 8 h -24 -24 v 8 8 h -48 z\"\n         id=\"path4443\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 4784,330.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4441\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 4784,314.66669 h -8 -8 v 8 8 h 8 8 v -8 z\"\n         id=\"path4439\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 4800,298.66669 h -8 -8 v 8 8 h 8 8 v -8 z\"\n         id=\"path4437\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 4864,218.66669 v 8 8 h -16 -16 v -8 -8 h -8 -8 v 32 32 h -8 -8 v 8 8 h 8 8 v 16 16 h 8 8 v -40 -40 h 16 16 v 40 40 h 8 8 v -56 -56 h -8 z\"\n         id=\"path4435\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 4832,202.66669 v 8 8 h 16 16 v -8 -8 h -16 z\"\n         id=\"path4433\"\n         inkscape:connector-curvature=\"0\" />\n    </g>\n    <g\n       id=\"bird2\"\n       inkscape:label=\"#g4756\">\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 4240,314.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4664\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 4320,250.66669 v 40 40 h -8 -8 v -16 -16 h -8 -8 v 8 8 h -8 -8 v 8 8 h 8 8 v 8 8 h 48 48 v -16 -16 h -8 -8 v 8 8 h -8 -8 v -40 -40 h -16 z\"\n         id=\"path4642\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 4320,218.66669 v 8 8 h 16 16 v -8 -8 h -16 z\"\n         id=\"path4636\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 4384,314.66669 v 8 8 h 24 24 v -8 -8 h -24 z\"\n         id=\"path4625\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 4272,314.66669 h 8 8 v -8 -8 h -8 -8 v 8 z\"\n         id=\"path4431\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 4256,330.66669 h -8 -8 v -8 -8 h 8 8 v -8 -8 h -16 -16 v 24 24 h 16 16 v -8 z\"\n         id=\"path4429\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 4272,330.66669 v -8 -8 h -8 -8 v 8 8 h 8 z\"\n         id=\"path4427\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 4288,346.66669 v -8 -8 h -8 -8 v 8 8 h 8 z\"\n         id=\"path4425\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 4352,218.66669 v 8 8 h -16 -16 v -8 -8 h -8 -8 v 32 32 h -8 -8 v 8 8 h 8 8 v 16 16 h 8 8 v -40 -40 h 16 16 v 40 40 h 8 8 v -8 -8 h 32 32 v 8 8 h -24 -24 v 8 8 h -48 -48 v 8 8 h 56 56 v -8 -8 h 24 24 v -24 -24 h -32 -32 v -8 -8 h -8 -8 v -32 -32 h -8 z\"\n         id=\"path4423\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 4320,202.66669 v 8 8 h 16 16 v -8 -8 h -16 z\"\n         id=\"path4421\"\n         inkscape:connector-curvature=\"0\" />\n    </g>\n    <g\n       id=\"bird\"\n       inkscape:label=\"#g4744\">\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 3728,314.66669 v 8 8 h 8 8 v -8 -8 h -8 z\"\n         id=\"path4662\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 3808,250.66669 v 40 40 h -8 -8 v -16 -16 h -8 -8 v 8 8 h -8 -8 v 8 8 h 8 8 v 8 8 h 48 48 v -16 -16 h -8 -8 v 8 8 h -8 -8 v -40 -40 h -16 z\"\n         id=\"path4640\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#00fd31\"\n         d=\"m 3808,218.66669 v 8 8 h 16 16 v -8 -8 h -16 z\"\n         id=\"path4154\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#f70000\"\n         d=\"m 3872,314.66669 v 8 8 h 24 24 v -8 -8 h -24 z\"\n         id=\"path4623\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 3760,314.66669 h 8 8 v -8 -8 h -8 -8 v 8 z\"\n         id=\"path4419\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 3744,330.66669 h -8 -8 v -8 -8 h 8 8 v -8 -8 h -16 -16 v 24 24 h 16 16 v -8 z\"\n         id=\"path4417\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 3760,330.66669 v -8 -8 h -8 -8 v 8 8 h 8 z\"\n         id=\"path4415\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 3776,346.66669 v -8 -8 h -8 -8 v 8 8 h 8 z\"\n         id=\"path4413\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 3840,218.66669 v 8 8 h -16 -16 v -8 -8 h -8 -8 v 32 32 h -8 -8 v 8 8 h 8 8 v 16 16 h 8 8 v -40 -40 h 16 16 v 40 40 h 8 8 v -8 -8 h 32 32 v 8 8 h -24 -24 v 8 8 h -48 -48 v 8 8 h 56 56 v -8 -8 h 24 24 v -24 -24 h -32 -32 v -8 -8 h -8 -8 v -32 -32 h -8 z\"\n         id=\"path4411\"\n         inkscape:connector-curvature=\"0\" />\n      <path\n         style=\"fill:#000000\"\n         d=\"m 3808,202.66669 v 8 8 h 16 16 v -8 -8 h -16 z\"\n         id=\"path4148\"\n         inkscape:connector-curvature=\"0\" />\n    </g>\n\n  </defs>\n  <sodipodi:namedview\n     pagecolor=\"#ffffff\"\n     bordercolor=\"#666666\"\n     borderopacity=\"1\"\n     objecttolerance=\"10\"\n     gridtolerance=\"10\"\n     guidetolerance=\"10\"\n     inkscape:pageopacity=\"0\"\n     inkscape:pageshadow=\"2\"\n     inkscape:window-width=\"1912\"\n     inkscape:window-height=\"1049\"\n     id=\"namedview186\"\n     showgrid=\"true\"\n     showguides=\"true\"\n     inkscape:guide-bbox=\"true\"\n     fit-margin-right=\"-2.7755576e-17\"\n     fit-margin-top=\"0\"\n     fit-margin-left=\"0\"\n     fit-margin-bottom=\"0\"\n     inkscape:zoom=\"0.25\"\n     inkscape:cx=\"1627.2803\"\n     inkscape:cy=\"256.45743\"\n     inkscape:window-x=\"4\"\n     inkscape:window-y=\"27\"\n     inkscape:window-maximized=\"0\"\n     inkscape:current-layer=\"svg184\">\n    <sodipodi:guide\n       position=\"512,682.66669\"\n       orientation=\"1,0\"\n       id=\"guide214\"\n       inkscape:locked=\"false\" />\n    <inkscape:grid\n       type=\"xygrid\"\n       id=\"grid216\"\n       originx=\"0\"\n       originy=\"0\"\n       spacingx=\"512\"\n       spacingy=\"512\"\n       dotted=\"false\" />\n  </sodipodi:namedview>\n  <use xlink:href=\"#running\" />\n  <use xlink:href=\"#stone\"/>\n  <use xlink:href=\"#stone-scared\" />\n  <use xlink:href=\"#idle\"  transform=\"translate(512)\"/>\n  <use xlink:href=\"#angry\"  transform=\"translate(1024)\"/>\n  <use xlink:href=\"#scared\"  transform=\"translate(1538)\"/>\n  <use xlink:href=\"#crying\"  transform=\"translate(2048)\"/>\n  <use xlink:href=\"#bird\"/>\n  <use xlink:href=\"#bird-scared\"/>\n  <use xlink:href=\"#bird-flap\"/>\n</svg>\n";

  /* src/components/Character.svelte generated by Svelte v3.4.0 */

  const file = "src/components/Character.svelte";

  function create_fragment(ctx) {
  	var g, use, use_xlink_href_value, g_transform_value;

  	return {
  		c: function create() {
  			g = svg_element("g");
  			use = svg_element("use");
  			xlink_attr(use, "xlink:href", use_xlink_href_value = ctx.isJumping ? '#running' : ctx.cycle[ctx.current]);
  			attr(use, "transform", `scale(0.5, 0.5)`);
  			add_location(use, file, 12, 2, 320);
  			attr(g, "transform", g_transform_value = `translate(100, ${ctx.$posY})`);
  			add_location(g, file, 11, 0, 275);
  		},

  		l: function claim(nodes) {
  			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
  		},

  		m: function mount(target, anchor) {
  			insert(target, g, anchor);
  			append(g, use);
  		},

  		p: function update(changed, ctx) {
  			if ((changed.isJumping || changed.current) && use_xlink_href_value !== (use_xlink_href_value = ctx.isJumping ? '#running' : ctx.cycle[ctx.current])) {
  				xlink_attr(use, "xlink:href", use_xlink_href_value);
  			}

  			if ((changed.$posY) && g_transform_value !== (g_transform_value = `translate(100, ${ctx.$posY})`)) {
  				attr(g, "transform", g_transform_value);
  			}
  		},

  		i: noop,
  		o: noop,

  		d: function destroy(detaching) {
  			if (detaching) {
  				detach(g);
  			}
  		}
  	};
  }

  function instance($$self, $$props, $$invalidate) {
  	let $posY;

  	let { posY, isJumping } = $$props; validate_store(posY, 'posY'); subscribe($$self, posY, $$value => { $posY = $$value; $$invalidate('$posY', $posY); });
    console.log(posY);
    let cycle = ['#idle', '#running'];
    let current = 0;
    //const handlePress = () => current = (current + 1) % cycle.length;
    setInterval(() => { const $$result = current = (current + 1) % cycle.length; $$invalidate('current', current); return $$result; }, 100);

  	$$self.$set = $$props => {
  		if ('posY' in $$props) $$invalidate('posY', posY = $$props.posY);
  		if ('isJumping' in $$props) $$invalidate('isJumping', isJumping = $$props.isJumping);
  	};

  	return { posY, isJumping, cycle, current, $posY };
  }

  class Character extends SvelteComponentDev {
  	constructor(options) {
  		super(options);
  		init(this, options, instance, create_fragment, safe_not_equal, ["posY", "isJumping"]);

  		const { ctx } = this.$$;
  		const props = options.props || {};
  		if (ctx.posY === undefined && !('posY' in props)) {
  			console.warn("<Character> was created without expected prop 'posY'");
  		}
  		if (ctx.isJumping === undefined && !('isJumping' in props)) {
  			console.warn("<Character> was created without expected prop 'isJumping'");
  		}
  	}

  	get posY() {
  		throw new Error("<Character>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  	}

  	set posY(value) {
  		throw new Error("<Character>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  	}

  	get isJumping() {
  		throw new Error("<Character>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  	}

  	set isJumping(value) {
  		throw new Error("<Character>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  	}
  }

  /* src/components/Ground.svelte generated by Svelte v3.4.0 */

  const file$1 = "src/components/Ground.svelte";

  function create_fragment$1(ctx) {
  	var path;

  	return {
  		c: function create() {
  			path = svg_element("path");
  			attr(path, "d", "M387.996 0l-.381.53-.382.528h-.825l-.38.53-.382.529H0v.529h386.175l.381-.53.382-.528h.824l.382-.53.381-.529h2.052l.742.794.741.794h.846v.529h8.202v.529h.794v.529h7.144v-.529h.794v-.529h146.198l.38-.53.382-.529h.825l.381-.529.382-.529h2.052l.741.794.742.794h.846v.529h5.968l.382-.53.381-.529h.825l.381-.529.382-.529h2.052l.741.794.742.794h.846v.529H635v-.529h-59.002v-.53h-.846l-.742-.793-.74-.794h-3.112l-.38.53-.382.528h-.825l-.381.53-.382.529h-4.91v-.53h-.846l-.742-.793-.74-.794h-3.112l-.38.53-.382.528h-.825l-.381.53-.382.529H409.046v.529h-.794v.529h-5.556v-.529h-.794v-.529h-8.467v-.529h-.846l-.741-.794-.742-.794h-1.555zM29.104 3.704v.529h1.588v-.529h-.794zm50.8 0v.529h2.117v-.529h-1.058zm39.688 0v.529h1.587v-.529h-.794zm67.204 0v.529h2.117v-.529h-1.059zm117.475 0v.529h2.117v-.529h-1.059zm42.333 0v.529h1.588v-.529h-.794zm50.8 0v.529h2.117v-.529h-1.058zm39.688 0v.529h1.587v-.529h-.794zm67.204 0v.529h2.117v-.529h-1.059zm117.475 0v.529h2.117v-.529h-1.059zm-618.596.53v.528h2.117v-.529H4.233zm41.804 0v.528h.529v-.529h-.264zm8.996 0v.528h1.058v-.529h-.529zm42.333 0v.528h1.059v-.529h-.53zm17.463 0v.528h.529v-.529h-.265zm16.404 0v.528h.529v-.529h-.264zm39.688 0v.528h1.058v-.529h-.53zm21.695 0v.528h.53v-.529h-.265zm10.055 0v.528h1.587v-.529h-.794zm30.162 0v.528h1.588v-.529h-.794zm31.22 0v.528h1.588v-.529h-.793zm25.4 0v.528h.53v-.529h-.265zm2.118 0v.528h1.058v-.529h-.53zm7.408 0v.528h1.587v-.529h-.793zm22.754 0v.528h2.117v-.529h-1.059zm41.804 0v.528h.529v-.529h-.264zm8.996 0v.528h1.058v-.529h-.529zm42.333 0v.528h1.059v-.529h-.53zm17.463 0v.528h.529v-.529h-.265zm16.404 0v.528h.529v-.529h-.264zm39.688 0v.528h1.058v-.529h-.53zm21.695 0v.528h.53v-.529h-.265zm10.055 0v.528h1.587v-.529h-.794zm30.162 0v.528h1.588v-.529h-.794zm31.22 0v.528h1.588v-.529h-.793zm25.4 0v.528h.53v-.529h-.265zm2.117 0v.528h1.059v-.529h-.53zm7.409 0v.528h1.587v-.529h-.793zm-493.183.529v.529h.529v-.529h-.265zm35.983 0v.529h.529v-.529h-.265zm58.737 0v.529h1.059v-.529h-.53zm42.863 0v.529h.529v-.529h-.265zm12.7 0v.529h1.587v-.529h-.793zm167.216 0v.529h.53v-.529h-.265zm35.984 0v.529h.529v-.529h-.265zm58.737 0v.529h1.059v-.529h-.53zm42.863 0v.529h.529v-.529h-.265zm12.7 0v.529h1.587v-.529h-.793zm-568.325.529v.529h.529v-.529h-.265zm15.346 0v.529H38.1v-.529h-.53zm10.583 0v.529h2.117v-.529h-1.059zm24.87 0v.529h1.06v-.529h-.53zm21.697 0v.529h.529v-.529h-.265zm5.291 0v.529h1.588v-.529h-.794zm39.159 0v.529h.529v-.529h-.265zm2.116 0v.529h1.059v-.529h-.53zm8.467 0v.529h1.588v-.529h-.794zm96.308 0v.529h1.059v-.529h-.53zm57.15 0v.529h.529v-.529h-.264zm36.513 0v.529h.529v-.529h-.265zm15.346 0v.529h1.058v-.529h-.53zm10.583 0v.529h2.117v-.529h-1.059zm24.87 0v.529h1.06v-.529h-.53zm21.697 0v.529h.529v-.529h-.265zm5.291 0v.529h1.588v-.529h-.794zm39.159 0v.529h.529v-.529h-.265zm2.116 0v.529h1.059v-.529h-.53zm8.467 0v.529h1.587v-.529h-.793zm96.308 0v.529h1.059v-.529h-.53zm57.15 0v.529h.529v-.529h-.264zM0 5.82v.529h2.117V5.82H1.058zm7.408 0v.529h1.059V5.82h-.53zm17.992 0v.529h2.117V5.82h-1.059zm39.158 0v.529h.53V5.82h-.265zm112.713 0v.529h1.587V5.82h-.793zm42.862 0v.529h2.117V5.82h-1.058zm6.35 0v.529h.53V5.82h-.265zm50.8 0v.529h1.059V5.82h-.53zm33.867 0v.529h.529V5.82h-.264zm6.35 0v.529h2.117V5.82h-1.059zm7.408 0v.529h1.059V5.82h-.53zm17.992 0v.529h2.117V5.82h-1.059zm39.158 0v.529h.529V5.82h-.264zm112.713 0v.529h1.587V5.82h-.793zm42.862 0v.529h2.117V5.82h-1.058zm6.35 0v.529h.529V5.82h-.264zm50.8 0v.529h1.059V5.82h-.53zm33.867 0v.529h.529V5.82h-.264z");
  			attr(path, "fill", "#525252");
  			add_location(path, file$1, 0, 0, 0);
  		},

  		l: function claim(nodes) {
  			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
  		},

  		m: function mount(target, anchor) {
  			insert(target, path, anchor);
  		},

  		p: noop,
  		i: noop,
  		o: noop,

  		d: function destroy(detaching) {
  			if (detaching) {
  				detach(path);
  			}
  		}
  	};
  }

  class Ground extends SvelteComponentDev {
  	constructor(options) {
  		super(options);
  		init(this, options, null, create_fragment$1, safe_not_equal, []);
  	}
  }

  function noop$1() {}

  function safe_not_equal$1(a, b) {
  	return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
  }
  function writable(value, start = noop$1) {
      let stop;
      const subscribers = [];
      function set(new_value) {
          if (safe_not_equal$1(value, new_value)) {
              value = new_value;
              if (!stop) {
                  return; // not ready
              }
              subscribers.forEach((s) => s[1]());
              subscribers.forEach((s) => s[0](value));
          }
      }
      function update(fn) {
          set(fn(value));
      }
      function subscribe$$1(run$$1, invalidate = noop$1) {
          const subscriber = [run$$1, invalidate];
          subscribers.push(subscriber);
          if (subscribers.length === 1) {
              stop = start(set) || noop$1;
          }
          run$$1(value);
          return () => {
              const index = subscribers.indexOf(subscriber);
              if (index !== -1) {
                  subscribers.splice(index, 1);
              }
              if (subscribers.length === 0) {
                  stop();
              }
          };
      }
      return { set, update, subscribe: subscribe$$1 };
  }

  const posY = writable(-300);
  const posX = writable(-500);

  const isSettingsOpen = writable(false);

  const gravity = writable(10000);
  const jumpVector = writable(-2500);
  const frameLength = writable(0);

  /* src/components/Dyno.svelte generated by Svelte v3.4.0 */

  const file$2 = "src/components/Dyno.svelte";

  function create_fragment$2(ctx) {
  	var div, svg, defs, pattern0, path0, pattern1, rect, path1, g, g_transform_value, svg_viewBox_value, current, dispose;

  	add_render_callback(ctx.onwindowresize);

  	var character = new Character({
  		props: {
  		posY: posY,
  		isJumping: ctx.isJumping
  	},
  		$$inline: true
  	});

  	var ground = new Ground({ $$inline: true });

  	return {
  		c: function create() {
  			div = element("div");
  			svg = svg_element("svg");
  			defs = svg_element("defs");
  			pattern0 = svg_element("pattern");
  			path0 = svg_element("path");
  			pattern1 = svg_element("pattern");
  			rect = svg_element("rect");
  			path1 = svg_element("path");
  			character.$$.fragment.c();
  			g = svg_element("g");
  			ground.$$.fragment.c();
  			attr(path0, "d", "M 50 0 L 0 0 0 50");
  			attr(path0, "fill", "none");
  			attr(path0, "stroke", "gray");
  			attr(path0, "stroke-width", "0.5");
  			add_location(path0, file$2, 67, 8, 1779);
  			attr(pattern0, "id", "smallGrid");
  			attr(pattern0, "width", "50");
  			attr(pattern0, "height", "50");
  			attr(pattern0, "patternUnits", "userSpaceOnUse");
  			add_location(pattern0, file$2, 66, 6, 1693);
  			attr(rect, "width", "100");
  			attr(rect, "height", "100");
  			attr(rect, "fill", "url(#smallGrid)");
  			add_location(rect, file$2, 70, 8, 1960);
  			attr(path1, "d", "M 100 0 L 0 0 0 100");
  			attr(path1, "fill", "none");
  			attr(path1, "stroke", "gray");
  			attr(path1, "stroke-width", "1");
  			add_location(path1, file$2, 71, 8, 2024);
  			attr(pattern1, "id", "grid");
  			attr(pattern1, "width", "100");
  			attr(pattern1, "height", "100");
  			attr(pattern1, "patternUnits", "userSpaceOnUse");
  			add_location(pattern1, file$2, 69, 6, 1877);
  			add_location(defs, file$2, 65, 4, 1680);
  			attr(g, "transform", g_transform_value = `translate(${-ctx.$posX}, 805), scale(4,4)`);
  			add_location(g, file$2, 77, 4, 2265);
  			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
  			attr(svg, "class", "w-screen h-screen");
  			attr(svg, "viewBox", svg_viewBox_value = `0 0 ${ctx.width} ${ctx.height}`);
  			attr(svg, "shape-rendering", "crispEdges");
  			add_location(svg, file$2, 63, 2, 1544);
  			div.className = "flex items-center justify-center h-screen bg-gray-200";
  			add_location(div, file$2, 62, 0, 1474);

  			dispose = [
  				listen(window, "keydown", ctx.handleKeydown),
  				listen(window, "click", ctx.handleKeydown),
  				listen(window, "touchstart", ctx.handleKeydown),
  				listen(window, "resize", ctx.onwindowresize)
  			];
  		},

  		l: function claim(nodes) {
  			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
  		},

  		m: function mount(target, anchor) {
  			insert(target, div, anchor);
  			append(div, svg);
  			append(svg, defs);
  			append(defs, pattern0);
  			append(pattern0, path0);
  			append(defs, pattern1);
  			append(pattern1, rect);
  			append(pattern1, path1);
  			mount_component(character, svg, null);
  			append(svg, g);
  			mount_component(ground, g, null);
  			current = true;
  		},

  		p: function update(changed, ctx) {
  			var character_changes = {};
  			if (changed.posY) character_changes.posY = posY;
  			if (changed.isJumping) character_changes.isJumping = ctx.isJumping;
  			character.$set(character_changes);

  			if ((!current || changed.$posX) && g_transform_value !== (g_transform_value = `translate(${-ctx.$posX}, 805), scale(4,4)`)) {
  				attr(g, "transform", g_transform_value);
  			}

  			if ((!current || changed.width || changed.height) && svg_viewBox_value !== (svg_viewBox_value = `0 0 ${ctx.width} ${ctx.height}`)) {
  				attr(svg, "viewBox", svg_viewBox_value);
  			}
  		},

  		i: function intro(local) {
  			if (current) return;
  			character.$$.fragment.i(local);

  			ground.$$.fragment.i(local);

  			current = true;
  		},

  		o: function outro(local) {
  			character.$$.fragment.o(local);
  			ground.$$.fragment.o(local);
  			current = false;
  		},

  		d: function destroy(detaching) {
  			if (detaching) {
  				detach(div);
  			}

  			character.$destroy();

  			ground.$destroy();

  			run_all(dispose);
  		}
  	};
  }

  let floorY = 600;

  let speedGround = 600;

  function instance$1($$self, $$props, $$invalidate) {
  	let $posY, $frameLength, $gravity, $posX, $jumpVector;

  	validate_store(posY, 'posY');
  	subscribe($$self, posY, $$value => { $posY = $$value; $$invalidate('$posY', $posY); });
  	validate_store(frameLength, 'frameLength');
  	subscribe($$self, frameLength, $$value => { $frameLength = $$value; $$invalidate('$frameLength', $frameLength); });
  	validate_store(gravity, 'gravity');
  	subscribe($$self, gravity, $$value => { $gravity = $$value; $$invalidate('$gravity', $gravity); });
  	validate_store(posX, 'posX');
  	subscribe($$self, posX, $$value => { $posX = $$value; $$invalidate('$posX', $posX); });
  	validate_store(jumpVector, 'jumpVector');
  	subscribe($$self, jumpVector, $$value => { $jumpVector = $$value; $$invalidate('$jumpVector', $jumpVector); });

  	
    let windowWidth;
    let windowHeight;
    let width = 0;
    let height = 0;

    let isJumping = false;

    let speedVector = 0;
    let prevTime = 0;

    $posY = floorY; posY.set($posY);

    const render = (timestamp) => {
        if (!prevTime) $$invalidate('prevTime', prevTime = timestamp);
        $frameLength = timestamp - prevTime; frameLength.set($frameLength);
        $$invalidate('isJumping', isJumping = true);
        $$invalidate('speedVector', speedVector += $gravity * $frameLength/1000);

        $posY += speedVector * $frameLength/1000; posY.set($posY);
        $posX += speedGround * $frameLength/1000; posX.set($posX);

        if ($posY > floorY) {
            $$invalidate('speedVector', speedVector = 0);
            $posY = floorY; posY.set($posY);
            $$invalidate('isJumping', isJumping = false);
        }
        $$invalidate('prevTime', prevTime = timestamp);
        requestAnimationFrame(render);
    };

    requestAnimationFrame(render);

    const handleKeydown = (e) => {
        // console.log(e);
        if (e.type === 'touchstart' || e.type === 'click' || e.code === 'Space') {
            $$invalidate('speedVector', speedVector = $jumpVector);
            $$invalidate('prevTime', prevTime = 0);
        }
    };

  	function onwindowresize() {
  		windowWidth = window.innerWidth; $$invalidate('windowWidth', windowWidth);
  		windowHeight = window.innerHeight; $$invalidate('windowHeight', windowHeight);
  	}

  	$$self.$$.update = ($$dirty = { windowWidth: 1, windowHeight: 1, $posX: 1 }) => {
  		if ($$dirty.windowWidth) { $$invalidate('width', width = windowWidth < 800 ? 800 : windowWidth); }
  		if ($$dirty.windowHeight) { $$invalidate('height', height = windowHeight); }
  		if ($$dirty.$posX) { if ($posX > 1650) { $posX = 0; posX.set($posX); } }
  	};

  	return {
  		windowWidth,
  		windowHeight,
  		width,
  		height,
  		isJumping,
  		handleKeydown,
  		$posX,
  		onwindowresize
  	};
  }

  class Dyno extends SvelteComponentDev {
  	constructor(options) {
  		super(options);
  		init(this, options, instance$1, create_fragment$2, safe_not_equal, []);
  	}
  }

  /* src/components/Router.svelte generated by Svelte v3.4.0 */

  function create_fragment$3(ctx) {
  	return {
  		c: noop,

  		l: function claim(nodes) {
  			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
  		},

  		m: noop,
  		p: noop,
  		i: noop,
  		o: noop,
  		d: noop
  	};
  }

  function instance$2($$self) {
  	/**Renderless component to act as a simple router using the History API
     *On browser load, parse the url and extract parameters
     */
    window.onload = function() {
      if (window.location.search.length > 0) {
        const params = window.location.search.substr(1);
        params.split("&").forEach(param => {
          const key = param.split("=")[0];
          const value = parseFloat(param.split("=")[1]);
          console.log(`Parameter of ${key} is ${value}`);
        });
      }
    };

    /**
     * Handle broswer back events here
     */
    window.onpopstate = function(event) {
      if (event.state) ;
    };

  	return {};
  }

  class Router extends SvelteComponentDev {
  	constructor(options) {
  		super(options);
  		init(this, options, instance$2, create_fragment$3, safe_not_equal, []);
  	}
  }

  /* src/components/Settings.svelte generated by Svelte v3.4.0 */

  const file$3 = "src/components/Settings.svelte";

  function create_fragment$4(ctx) {
  	var div12, div0, t0, div11, button0, svg0, path0, t1, span, t3, div10, div2, p, t5, div1, svg1, path1, t6, div5, input0, t7, div4, div3, t8_value = Math.round(ctx.$jumpVector), t8, t9, small0, t11, div8, input1, t12, div7, div6, t13, t14, small1, t16, div9, button1, t18, button2, div12_class_value, dispose;

  	return {
  		c: function create() {
  			div12 = element("div");
  			div0 = element("div");
  			t0 = space();
  			div11 = element("div");
  			button0 = element("button");
  			svg0 = svg_element("svg");
  			path0 = svg_element("path");
  			t1 = space();
  			span = element("span");
  			span.textContent = "(Esc)";
  			t3 = space();
  			div10 = element("div");
  			div2 = element("div");
  			p = element("p");
  			p.textContent = "Simple Modal!";
  			t5 = space();
  			div1 = element("div");
  			svg1 = svg_element("svg");
  			path1 = svg_element("path");
  			t6 = space();
  			div5 = element("div");
  			input0 = element("input");
  			t7 = space();
  			div4 = element("div");
  			div3 = element("div");
  			t8 = text(t8_value);
  			t9 = space();
  			small0 = element("small");
  			small0.textContent = "jumpVector";
  			t11 = space();
  			div8 = element("div");
  			input1 = element("input");
  			t12 = space();
  			div7 = element("div");
  			div6 = element("div");
  			t13 = text(ctx.$gravity);
  			t14 = space();
  			small1 = element("small");
  			small1.textContent = "gravity";
  			t16 = space();
  			div9 = element("div");
  			button1 = element("button");
  			button1.textContent = "Action";
  			t18 = space();
  			button2 = element("button");
  			button2.textContent = "Close";
  			div0.className = "modal-overlay absolute w-full h-full bg-gray-900 opacity-50";
  			add_location(div0, file$3, 15, 2, 357);
  			attr(path0, "d", "M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z");
  			add_location(path0, file$3, 21, 8, 838);
  			attr(svg0, "class", "fill-current text-white");
  			attr(svg0, "xmlns", "http://www.w3.org/2000/svg");
  			attr(svg0, "width", "18");
  			attr(svg0, "height", "18");
  			attr(svg0, "viewBox", "0 0 18 18");
  			add_location(svg0, file$3, 20, 6, 714);
  			span.className = "text-sm";
  			add_location(span, file$3, 23, 6, 990);
  			button0.className = "modal-close absolute top-0 right-0 cursor-pointer flex flex-col items-center mt-4 mr-4 text-white text-sm z-50";
  			add_location(button0, file$3, 19, 4, 551);
  			p.className = "text-2xl font-bold";
  			add_location(p, file$3, 30, 8, 1257);
  			attr(path1, "d", "M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z");
  			add_location(path1, file$3, 33, 12, 1526);
  			attr(svg1, "class", "fill-current text-black");
  			attr(svg1, "xmlns", "http://www.w3.org/2000/svg");
  			attr(svg1, "width", "18");
  			attr(svg1, "height", "18");
  			attr(svg1, "viewBox", "0 0 18 18");
  			add_location(svg1, file$3, 32, 10, 1398);
  			div1.className = "modal-close cursor-pointer z-50";
  			add_location(div1, file$3, 31, 8, 1313);
  			div2.className = "flex justify-between items-center pb-3";
  			add_location(div2, file$3, 29, 6, 1196);
  			input0.className = "w-full";
  			attr(input0, "type", "range");
  			input0.min = -3000;
  			input0.max = 3000;
  			input0.step = 1;
  			add_location(input0, file$3, 40, 8, 1758);
  			add_location(div3, file$3, 48, 10, 1965);
  			add_location(small0, file$3, 51, 10, 2036);
  			set_style(div4, "padding-left", "10px");
  			add_location(div4, file$3, 47, 8, 1921);
  			div5.className = "w-full";
  			add_location(div5, file$3, 39, 6, 1729);
  			input1.className = "w-full";
  			attr(input1, "type", "range");
  			input1.min = -3000;
  			input1.max = 3000;
  			input1.step = 1;
  			add_location(input1, file$3, 55, 8, 2125);
  			add_location(div6, file$3, 63, 10, 2329);
  			add_location(small1, file$3, 66, 10, 2383);
  			set_style(div7, "padding-left", "10px");
  			add_location(div7, file$3, 62, 8, 2285);
  			div8.className = "w-full";
  			add_location(div8, file$3, 54, 6, 2096);
  			button1.className = "px-4 bg-transparent p-3 rounded-lg text-indigo-500 hover:bg-gray-100 hover:text-indigo-400 mr-2";
  			add_location(button1, file$3, 71, 8, 2504);
  			button2.className = "modal-close px-4 bg-indigo-500 p-3 rounded-lg text-white hover:bg-indigo-400";
  			add_location(button2, file$3, 72, 8, 2669);
  			div9.className = "flex justify-end pt-2";
  			add_location(div9, file$3, 70, 6, 2460);
  			div10.className = "modal-content py-4 text-left px-6";
  			add_location(div10, file$3, 27, 4, 1123);
  			div11.className = "modal-container bg-white w-11/12 md:max-w-md mx-auto rounded shadow-lg z-50 overflow-y-auto";
  			add_location(div11, file$3, 17, 2, 440);
  			div12.className = div12_class_value = `modal ${ctx.$isOpen ? '' : 'opacity-0 pointer-events-none'} fixed w-full h-full top-0 left-0 flex items-center justify-center`;
  			add_location(div12, file$3, 12, 0, 188);

  			dispose = [
  				listen(button0, "click", ctx.handleCloseButton),
  				listen(div1, "click", ctx.handleCloseButton),
  				listen(input0, "change", ctx.input0_change_input_handler),
  				listen(input0, "input", ctx.input0_change_input_handler),
  				listen(input1, "change", ctx.input1_change_input_handler),
  				listen(input1, "input", ctx.input1_change_input_handler),
  				listen(button1, "click", ctx.handleCloseButton),
  				listen(button2, "click", ctx.handleCloseButton),
  				listen(div12, "click", stop_propagation(ctx.click_handler))
  			];
  		},

  		l: function claim(nodes) {
  			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
  		},

  		m: function mount(target, anchor) {
  			insert(target, div12, anchor);
  			append(div12, div0);
  			append(div12, t0);
  			append(div12, div11);
  			append(div11, button0);
  			append(button0, svg0);
  			append(svg0, path0);
  			append(button0, t1);
  			append(button0, span);
  			append(div11, t3);
  			append(div11, div10);
  			append(div10, div2);
  			append(div2, p);
  			append(div2, t5);
  			append(div2, div1);
  			append(div1, svg1);
  			append(svg1, path1);
  			append(div10, t6);
  			append(div10, div5);
  			append(div5, input0);

  			input0.value = ctx.$jumpVector;

  			append(div5, t7);
  			append(div5, div4);
  			append(div4, div3);
  			append(div3, t8);
  			append(div4, t9);
  			append(div4, small0);
  			append(div10, t11);
  			append(div10, div8);
  			append(div8, input1);

  			input1.value = ctx.$gravity;

  			append(div8, t12);
  			append(div8, div7);
  			append(div7, div6);
  			append(div6, t13);
  			append(div7, t14);
  			append(div7, small1);
  			append(div10, t16);
  			append(div10, div9);
  			append(div9, button1);
  			append(div9, t18);
  			append(div9, button2);
  		},

  		p: function update(changed, ctx) {
  			if (changed.$jumpVector) input0.value = ctx.$jumpVector;

  			if ((changed.$jumpVector) && t8_value !== (t8_value = Math.round(ctx.$jumpVector))) {
  				set_data(t8, t8_value);
  			}

  			if (changed.$gravity) input1.value = ctx.$gravity;

  			if (changed.$gravity) {
  				set_data(t13, ctx.$gravity);
  			}

  			if ((changed.$isOpen) && div12_class_value !== (div12_class_value = `modal ${ctx.$isOpen ? '' : 'opacity-0 pointer-events-none'} fixed w-full h-full top-0 left-0 flex items-center justify-center`)) {
  				div12.className = div12_class_value;
  			}
  		},

  		i: noop,
  		o: noop,

  		d: function destroy(detaching) {
  			if (detaching) {
  				detach(div12);
  			}

  			run_all(dispose);
  		}
  	};
  }

  function instance$3($$self, $$props, $$invalidate) {
  	let $isOpen, $jumpVector, $gravity;

  	validate_store(jumpVector, 'jumpVector');
  	subscribe($$self, jumpVector, $$value => { $jumpVector = $$value; $$invalidate('$jumpVector', $jumpVector); });
  	validate_store(gravity, 'gravity');
  	subscribe($$self, gravity, $$value => { $gravity = $$value; $$invalidate('$gravity', $gravity); });

  	let { isOpen } = $$props; validate_store(isOpen, 'isOpen'); subscribe($$self, isOpen, $$value => { $isOpen = $$value; $$invalidate('$isOpen', $isOpen); });
    const handleCloseButton = () => {
        isOpen.set(false);
    };

  	function click_handler(event) {
  		bubble($$self, event);
  	}

  	function input0_change_input_handler() {
  		jumpVector.set(to_number(this.value));
  	}

  	function input1_change_input_handler() {
  		gravity.set(to_number(this.value));
  	}

  	$$self.$set = $$props => {
  		if ('isOpen' in $$props) $$invalidate('isOpen', isOpen = $$props.isOpen);
  	};

  	return {
  		isOpen,
  		handleCloseButton,
  		click_handler,
  		$isOpen,
  		$jumpVector,
  		$gravity,
  		input0_change_input_handler,
  		input1_change_input_handler
  	};
  }

  class Settings extends SvelteComponentDev {
  	constructor(options) {
  		super(options);
  		init(this, options, instance$3, create_fragment$4, safe_not_equal, ["isOpen"]);

  		const { ctx } = this.$$;
  		const props = options.props || {};
  		if (ctx.isOpen === undefined && !('isOpen' in props)) {
  			console.warn("<Settings> was created without expected prop 'isOpen'");
  		}
  	}

  	get isOpen() {
  		throw new Error("<Settings>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  	}

  	set isOpen(value) {
  		throw new Error("<Settings>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  	}
  }

  /* src/App.svelte generated by Svelte v3.4.0 */

  const file$4 = "src/App.svelte";

  function create_fragment$5(ctx) {
  	var div0, t0, div1, button, small, t1_value = ctx.$frameLength.toFixed(0), t1, t2, svg, path, t3, main, t4, t5, current, dispose;

  	var router = new Router({ $$inline: true });

  	var settings = new Settings({
  		props: {
  		isOpen: isSettingsOpen,
  		onClose: ctx.onSettingsClose
  	},
  		$$inline: true
  	});

  	var dyno = new Dyno({ $$inline: true });

  	return {
  		c: function create() {
  			div0 = element("div");
  			t0 = space();
  			div1 = element("div");
  			button = element("button");
  			small = element("small");
  			t1 = text(t1_value);
  			t2 = space();
  			svg = svg_element("svg");
  			path = svg_element("path");
  			t3 = space();
  			main = element("main");
  			router.$$.fragment.c();
  			t4 = space();
  			settings.$$.fragment.c();
  			t5 = space();
  			dyno.$$.fragment.c();
  			set_style(div0, "display", "none");
  			add_location(div0, file$4, 38, 0, 1274);
  			add_location(small, file$4, 44, 2, 1454);
  			attr(path, "class", "heroicon-ui");
  			attr(path, "d", "M9 4.58V4c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2v.58a8 8 0 0 1 1.92 1.11l.5-.29a2 2 0 0 1 2.74.73l1 1.74a2 2 0 0 1-.73 2.73l-.5.29a8.06 8.06 0 0 1 0 2.22l.5.3a2 2 0 0 1 .73 2.72l-1 1.74a2 2 0 0 1-2.73.73l-.5-.3A8 8 0 0 1 15 19.43V20a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-.58a8 8 0 0 1-1.92-1.11l-.5.29a2 2 0 0 1-2.74-.73l-1-1.74a2 2 0 0 1 .73-2.73l.5-.29a8.06 8.06 0 0 1 0-2.22l-.5-.3a2 2 0 0 1-.73-2.72l1-1.74a2 2 0 0 1 2.73-.73l.5.3A8 8 0 0 1 9 4.57zM7.88 7.64l-.54.51-1.77-1.02-1 1.74 1.76 1.01-.17.73a6.02 6.02 0 0 0 0 2.78l.17.73-1.76 1.01 1 1.74 1.77-1.02.54.51a6 6 0 0 0 2.4 1.4l.72.2V20h2v-2.04l.71-.2a6 6 0 0 0 2.41-1.4l.54-.51 1.77 1.02 1-1.74-1.76-1.01.17-.73a6.02 6.02 0 0 0 0-2.78l-.17-.73 1.76-1.01-1-1.74-1.77 1.02-.54-.51a6 6 0 0 0-2.4-1.4l-.72-.2V4h-2v2.04l-.71.2a6 6 0 0 0-2.41 1.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z");
  			add_location(path, file$4, 45, 85, 1580);
  			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
  			attr(svg, "viewBox", "0 0 24 24");
  			attr(svg, "width", "24");
  			attr(svg, "height", "24");
  			add_location(svg, file$4, 45, 2, 1497);
  			button.className = "relative bg-transparent border ";
  			add_location(button, file$4, 40, 2, 1349);
  			div1.className = "absolute";
  			add_location(div1, file$4, 39, 0, 1324);
  			main.className = "overflow-hidden";
  			add_location(main, file$4, 48, 0, 2491);
  			dispose = listen(button, "click", stop_propagation(ctx.onSettingsClick));
  		},

  		l: function claim(nodes) {
  			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
  		},

  		m: function mount(target, anchor) {
  			insert(target, div0, anchor);
  			div0.innerHTML = Sprites;
  			insert(target, t0, anchor);
  			insert(target, div1, anchor);
  			append(div1, button);
  			append(button, small);
  			append(small, t1);
  			append(button, t2);
  			append(button, svg);
  			append(svg, path);
  			insert(target, t3, anchor);
  			insert(target, main, anchor);
  			mount_component(router, main, null);
  			append(main, t4);
  			mount_component(settings, main, null);
  			append(main, t5);
  			mount_component(dyno, main, null);
  			current = true;
  		},

  		p: function update(changed, ctx) {
  			if ((!current || changed.$frameLength) && t1_value !== (t1_value = ctx.$frameLength.toFixed(0))) {
  				set_data(t1, t1_value);
  			}

  			var settings_changes = {};
  			if (changed.isSettingsOpen) settings_changes.isOpen = isSettingsOpen;
  			if (changed.onSettingsClose) settings_changes.onClose = ctx.onSettingsClose;
  			settings.$set(settings_changes);
  		},

  		i: function intro(local) {
  			if (current) return;
  			router.$$.fragment.i(local);

  			settings.$$.fragment.i(local);

  			dyno.$$.fragment.i(local);

  			current = true;
  		},

  		o: function outro(local) {
  			router.$$.fragment.o(local);
  			settings.$$.fragment.o(local);
  			dyno.$$.fragment.o(local);
  			current = false;
  		},

  		d: function destroy(detaching) {
  			if (detaching) {
  				detach(div0);
  				detach(t0);
  				detach(div1);
  				detach(t3);
  				detach(main);
  			}

  			router.$destroy();

  			settings.$destroy();

  			dyno.$destroy();

  			dispose();
  		}
  	};
  }

  function instance$4($$self, $$props, $$invalidate) {
  	let $isSettingsOpen, $frameLength;

  	validate_store(isSettingsOpen, 'isSettingsOpen');
  	subscribe($$self, isSettingsOpen, $$value => { $isSettingsOpen = $$value; $$invalidate('$isSettingsOpen', $isSettingsOpen); });
  	validate_store(frameLength, 'frameLength');
  	subscribe($$self, frameLength, $$value => { $frameLength = $$value; $$invalidate('$frameLength', $frameLength); });

  	


    const onSettingsClick = () => {

        $isSettingsOpen = !$isSettingsOpen; isSettingsOpen.set($isSettingsOpen);
    };
    const onSettingsClose = (e) => {
        $isSettingsOpen = false; isSettingsOpen.set($isSettingsOpen);
    };
    if ('serviceWorker' in navigator) {
        //navigator.serviceWorker.register('/service-worker.js');

        navigator.serviceWorker.addEventListener('activate', function(event) {
            event.waitUntil(
                caches.keys().then(function(cacheNames) {
                    return Promise.all(
                        cacheNames.filter(function(cacheName) {
                            return true;
                            // Return true if you want to remove this cache,
                            // but remember that caches are shared across
                            // the whole origin
                        }).map(function(cacheName) {
                            return caches.delete(cacheName);
                        })
                    );
                })
            );
        });
    }

  	return {
  		onSettingsClick,
  		onSettingsClose,
  		$frameLength
  	};
  }

  class App extends SvelteComponentDev {
  	constructor(options) {
  		super(options);
  		init(this, options, instance$4, create_fragment$5, safe_not_equal, []);
  	}
  }

  const app = new App({
    target: document.body
  });

}());
//# sourceMappingURL=main.js.map
