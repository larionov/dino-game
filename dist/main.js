
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

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var howler = createCommonjsModule(function (module, exports) {
  /*!
   *  howler.js v2.1.2
   *  howlerjs.com
   *
   *  (c) 2013-2019, James Simpson of GoldFire Studios
   *  goldfirestudios.com
   *
   *  MIT License
   */

  (function() {

    /** Global Methods **/
    /***************************************************************************/

    /**
     * Create the global controller. All contained methods and properties apply
     * to all sounds that are currently playing or will be in the future.
     */
    var HowlerGlobal = function() {
      this.init();
    };
    HowlerGlobal.prototype = {
      /**
       * Initialize the global Howler object.
       * @return {Howler}
       */
      init: function() {
        var self = this || Howler;

        // Create a global ID counter.
        self._counter = 1000;

        // Pool of unlocked HTML5 Audio objects.
        self._html5AudioPool = [];
        self.html5PoolSize = 10;

        // Internal properties.
        self._codecs = {};
        self._howls = [];
        self._muted = false;
        self._volume = 1;
        self._canPlayEvent = 'canplaythrough';
        self._navigator = (typeof window !== 'undefined' && window.navigator) ? window.navigator : null;

        // Public properties.
        self.masterGain = null;
        self.noAudio = false;
        self.usingWebAudio = true;
        self.autoSuspend = true;
        self.ctx = null;

        // Set to false to disable the auto audio unlocker.
        self.autoUnlock = true;

        // Setup the various state values for global tracking.
        self._setup();

        return self;
      },

      /**
       * Get/set the global volume for all sounds.
       * @param  {Float} vol Volume from 0.0 to 1.0.
       * @return {Howler/Float}     Returns self or current volume.
       */
      volume: function(vol) {
        var self = this || Howler;
        vol = parseFloat(vol);

        // If we don't have an AudioContext created yet, run the setup.
        if (!self.ctx) {
          setupAudioContext();
        }

        if (typeof vol !== 'undefined' && vol >= 0 && vol <= 1) {
          self._volume = vol;

          // Don't update any of the nodes if we are muted.
          if (self._muted) {
            return self;
          }

          // When using Web Audio, we just need to adjust the master gain.
          if (self.usingWebAudio) {
            self.masterGain.gain.setValueAtTime(vol, Howler.ctx.currentTime);
          }

          // Loop through and change volume for all HTML5 audio nodes.
          for (var i=0; i<self._howls.length; i++) {
            if (!self._howls[i]._webAudio) {
              // Get all of the sounds in this Howl group.
              var ids = self._howls[i]._getSoundIds();

              // Loop through all sounds and change the volumes.
              for (var j=0; j<ids.length; j++) {
                var sound = self._howls[i]._soundById(ids[j]);

                if (sound && sound._node) {
                  sound._node.volume = sound._volume * vol;
                }
              }
            }
          }

          return self;
        }

        return self._volume;
      },

      /**
       * Handle muting and unmuting globally.
       * @param  {Boolean} muted Is muted or not.
       */
      mute: function(muted) {
        var self = this || Howler;

        // If we don't have an AudioContext created yet, run the setup.
        if (!self.ctx) {
          setupAudioContext();
        }

        self._muted = muted;

        // With Web Audio, we just need to mute the master gain.
        if (self.usingWebAudio) {
          self.masterGain.gain.setValueAtTime(muted ? 0 : self._volume, Howler.ctx.currentTime);
        }

        // Loop through and mute all HTML5 Audio nodes.
        for (var i=0; i<self._howls.length; i++) {
          if (!self._howls[i]._webAudio) {
            // Get all of the sounds in this Howl group.
            var ids = self._howls[i]._getSoundIds();

            // Loop through all sounds and mark the audio node as muted.
            for (var j=0; j<ids.length; j++) {
              var sound = self._howls[i]._soundById(ids[j]);

              if (sound && sound._node) {
                sound._node.muted = (muted) ? true : sound._muted;
              }
            }
          }
        }

        return self;
      },

      /**
       * Unload and destroy all currently loaded Howl objects.
       * @return {Howler}
       */
      unload: function() {
        var self = this || Howler;

        for (var i=self._howls.length-1; i>=0; i--) {
          self._howls[i].unload();
        }

        // Create a new AudioContext to make sure it is fully reset.
        if (self.usingWebAudio && self.ctx && typeof self.ctx.close !== 'undefined') {
          self.ctx.close();
          self.ctx = null;
          setupAudioContext();
        }

        return self;
      },

      /**
       * Check for codec support of specific extension.
       * @param  {String} ext Audio file extention.
       * @return {Boolean}
       */
      codecs: function(ext) {
        return (this || Howler)._codecs[ext.replace(/^x-/, '')];
      },

      /**
       * Setup various state values for global tracking.
       * @return {Howler}
       */
      _setup: function() {
        var self = this || Howler;

        // Keeps track of the suspend/resume state of the AudioContext.
        self.state = self.ctx ? self.ctx.state || 'suspended' : 'suspended';

        // Automatically begin the 30-second suspend process
        self._autoSuspend();

        // Check if audio is available.
        if (!self.usingWebAudio) {
          // No audio is available on this system if noAudio is set to true.
          if (typeof Audio !== 'undefined') {
            try {
              var test = new Audio();

              // Check if the canplaythrough event is available.
              if (typeof test.oncanplaythrough === 'undefined') {
                self._canPlayEvent = 'canplay';
              }
            } catch(e) {
              self.noAudio = true;
            }
          } else {
            self.noAudio = true;
          }
        }

        // Test to make sure audio isn't disabled in Internet Explorer.
        try {
          var test = new Audio();
          if (test.muted) {
            self.noAudio = true;
          }
        } catch (e) {}

        // Check for supported codecs.
        if (!self.noAudio) {
          self._setupCodecs();
        }

        return self;
      },

      /**
       * Check for browser support for various codecs and cache the results.
       * @return {Howler}
       */
      _setupCodecs: function() {
        var self = this || Howler;
        var audioTest = null;

        // Must wrap in a try/catch because IE11 in server mode throws an error.
        try {
          audioTest = (typeof Audio !== 'undefined') ? new Audio() : null;
        } catch (err) {
          return self;
        }

        if (!audioTest || typeof audioTest.canPlayType !== 'function') {
          return self;
        }

        var mpegTest = audioTest.canPlayType('audio/mpeg;').replace(/^no$/, '');

        // Opera version <33 has mixed MP3 support, so we need to check for and block it.
        var checkOpera = self._navigator && self._navigator.userAgent.match(/OPR\/([0-6].)/g);
        var isOldOpera = (checkOpera && parseInt(checkOpera[0].split('/')[1], 10) < 33);

        self._codecs = {
          mp3: !!(!isOldOpera && (mpegTest || audioTest.canPlayType('audio/mp3;').replace(/^no$/, ''))),
          mpeg: !!mpegTest,
          opus: !!audioTest.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ''),
          ogg: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''),
          oga: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''),
          wav: !!audioTest.canPlayType('audio/wav; codecs="1"').replace(/^no$/, ''),
          aac: !!audioTest.canPlayType('audio/aac;').replace(/^no$/, ''),
          caf: !!audioTest.canPlayType('audio/x-caf;').replace(/^no$/, ''),
          m4a: !!(audioTest.canPlayType('audio/x-m4a;') || audioTest.canPlayType('audio/m4a;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
          mp4: !!(audioTest.canPlayType('audio/x-mp4;') || audioTest.canPlayType('audio/mp4;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
          weba: !!audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, ''),
          webm: !!audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, ''),
          dolby: !!audioTest.canPlayType('audio/mp4; codecs="ec-3"').replace(/^no$/, ''),
          flac: !!(audioTest.canPlayType('audio/x-flac;') || audioTest.canPlayType('audio/flac;')).replace(/^no$/, '')
        };

        return self;
      },

      /**
       * Some browsers/devices will only allow audio to be played after a user interaction.
       * Attempt to automatically unlock audio on the first user interaction.
       * Concept from: http://paulbakaus.com/tutorials/html5/web-audio-on-ios/
       * @return {Howler}
       */
      _unlockAudio: function() {
        var self = this || Howler;

        // Only run this if Web Audio is supported and it hasn't already been unlocked.
        if (self._audioUnlocked || !self.ctx) {
          return;
        }

        self._audioUnlocked = false;
        self.autoUnlock = false;

        // Some mobile devices/platforms have distortion issues when opening/closing tabs and/or web views.
        // Bugs in the browser (especially Mobile Safari) can cause the sampleRate to change from 44100 to 48000.
        // By calling Howler.unload(), we create a new AudioContext with the correct sampleRate.
        if (!self._mobileUnloaded && self.ctx.sampleRate !== 44100) {
          self._mobileUnloaded = true;
          self.unload();
        }

        // Scratch buffer for enabling iOS to dispose of web audio buffers correctly, as per:
        // http://stackoverflow.com/questions/24119684
        self._scratchBuffer = self.ctx.createBuffer(1, 1, 22050);

        // Call this method on touch start to create and play a buffer,
        // then check if the audio actually played to determine if
        // audio has now been unlocked on iOS, Android, etc.
        var unlock = function(e) {
          // Create a pool of unlocked HTML5 Audio objects that can
          // be used for playing sounds without user interaction. HTML5
          // Audio objects must be individually unlocked, as opposed
          // to the WebAudio API which only needs a single activation.
          // This must occur before WebAudio setup or the source.onended
          // event will not fire.
          for (var i=0; i<self.html5PoolSize; i++) {
            try {
              var audioNode = new Audio();

              // Mark this Audio object as unlocked to ensure it can get returned
              // to the unlocked pool when released.
              audioNode._unlocked = true;

              // Add the audio node to the pool.
              self._releaseHtml5Audio(audioNode);
            } catch (e) {
              self.noAudio = true;
            }
          }

          // Loop through any assigned audio nodes and unlock them.
          for (var i=0; i<self._howls.length; i++) {
            if (!self._howls[i]._webAudio) {
              // Get all of the sounds in this Howl group.
              var ids = self._howls[i]._getSoundIds();

              // Loop through all sounds and unlock the audio nodes.
              for (var j=0; j<ids.length; j++) {
                var sound = self._howls[i]._soundById(ids[j]);

                if (sound && sound._node && !sound._node._unlocked) {
                  sound._node._unlocked = true;
                  sound._node.load();
                }
              }
            }
          }

          // Fix Android can not play in suspend state.
          self._autoResume();

          // Create an empty buffer.
          var source = self.ctx.createBufferSource();
          source.buffer = self._scratchBuffer;
          source.connect(self.ctx.destination);

          // Play the empty buffer.
          if (typeof source.start === 'undefined') {
            source.noteOn(0);
          } else {
            source.start(0);
          }

          // Calling resume() on a stack initiated by user gesture is what actually unlocks the audio on Android Chrome >= 55.
          if (typeof self.ctx.resume === 'function') {
            self.ctx.resume();
          }

          // Setup a timeout to check that we are unlocked on the next event loop.
          source.onended = function() {
            source.disconnect(0);

            // Update the unlocked state and prevent this check from happening again.
            self._audioUnlocked = true;

            // Remove the touch start listener.
            document.removeEventListener('touchstart', unlock, true);
            document.removeEventListener('touchend', unlock, true);
            document.removeEventListener('click', unlock, true);

            // Let all sounds know that audio has been unlocked.
            for (var i=0; i<self._howls.length; i++) {
              self._howls[i]._emit('unlock');
            }
          };
        };

        // Setup a touch start listener to attempt an unlock in.
        document.addEventListener('touchstart', unlock, true);
        document.addEventListener('touchend', unlock, true);
        document.addEventListener('click', unlock, true);

        return self;
      },

      /**
       * Get an unlocked HTML5 Audio object from the pool. If none are left,
       * return a new Audio object and throw a warning.
       * @return {Audio} HTML5 Audio object.
       */
      _obtainHtml5Audio: function() {
        var self = this || Howler;

        // Return the next object from the pool if one exists.
        if (self._html5AudioPool.length) {
          return self._html5AudioPool.pop();
        }

        //.Check if the audio is locked and throw a warning.
        var testPlay = new Audio().play();
        if (testPlay && typeof Promise !== 'undefined' && (testPlay instanceof Promise || typeof testPlay.then === 'function')) {
          testPlay.catch(function() {
            console.warn('HTML5 Audio pool exhausted, returning potentially locked audio object.');
          });
        }

        return new Audio();
      },

      /**
       * Return an activated HTML5 Audio object to the pool.
       * @return {Howler}
       */
      _releaseHtml5Audio: function(audio) {
        var self = this || Howler;

        // Don't add audio to the pool if we don't know if it has been unlocked.
        if (audio._unlocked) {
          self._html5AudioPool.push(audio);
        }

        return self;
      },

      /**
       * Automatically suspend the Web Audio AudioContext after no sound has played for 30 seconds.
       * This saves processing/energy and fixes various browser-specific bugs with audio getting stuck.
       * @return {Howler}
       */
      _autoSuspend: function() {
        var self = this;

        if (!self.autoSuspend || !self.ctx || typeof self.ctx.suspend === 'undefined' || !Howler.usingWebAudio) {
          return;
        }

        // Check if any sounds are playing.
        for (var i=0; i<self._howls.length; i++) {
          if (self._howls[i]._webAudio) {
            for (var j=0; j<self._howls[i]._sounds.length; j++) {
              if (!self._howls[i]._sounds[j]._paused) {
                return self;
              }
            }
          }
        }

        if (self._suspendTimer) {
          clearTimeout(self._suspendTimer);
        }

        // If no sound has played after 30 seconds, suspend the context.
        self._suspendTimer = setTimeout(function() {
          if (!self.autoSuspend) {
            return;
          }

          self._suspendTimer = null;
          self.state = 'suspending';
          self.ctx.suspend().then(function() {
            self.state = 'suspended';

            if (self._resumeAfterSuspend) {
              delete self._resumeAfterSuspend;
              self._autoResume();
            }
          });
        }, 30000);

        return self;
      },

      /**
       * Automatically resume the Web Audio AudioContext when a new sound is played.
       * @return {Howler}
       */
      _autoResume: function() {
        var self = this;

        if (!self.ctx || typeof self.ctx.resume === 'undefined' || !Howler.usingWebAudio) {
          return;
        }

        if (self.state === 'running' && self._suspendTimer) {
          clearTimeout(self._suspendTimer);
          self._suspendTimer = null;
        } else if (self.state === 'suspended') {
          self.ctx.resume().then(function() {
            self.state = 'running';

            // Emit to all Howls that the audio has resumed.
            for (var i=0; i<self._howls.length; i++) {
              self._howls[i]._emit('resume');
            }
          });

          if (self._suspendTimer) {
            clearTimeout(self._suspendTimer);
            self._suspendTimer = null;
          }
        } else if (self.state === 'suspending') {
          self._resumeAfterSuspend = true;
        }

        return self;
      }
    };

    // Setup the global audio controller.
    var Howler = new HowlerGlobal();

    /** Group Methods **/
    /***************************************************************************/

    /**
     * Create an audio group controller.
     * @param {Object} o Passed in properties for this group.
     */
    var Howl = function(o) {
      var self = this;

      // Throw an error if no source is provided.
      if (!o.src || o.src.length === 0) {
        console.error('An array of source files must be passed with any new Howl.');
        return;
      }

      self.init(o);
    };
    Howl.prototype = {
      /**
       * Initialize a new Howl group object.
       * @param  {Object} o Passed in properties for this group.
       * @return {Howl}
       */
      init: function(o) {
        var self = this;

        // If we don't have an AudioContext created yet, run the setup.
        if (!Howler.ctx) {
          setupAudioContext();
        }

        // Setup user-defined default properties.
        self._autoplay = o.autoplay || false;
        self._format = (typeof o.format !== 'string') ? o.format : [o.format];
        self._html5 = o.html5 || false;
        self._muted = o.mute || false;
        self._loop = o.loop || false;
        self._pool = o.pool || 5;
        self._preload = (typeof o.preload === 'boolean') ? o.preload : true;
        self._rate = o.rate || 1;
        self._sprite = o.sprite || {};
        self._src = (typeof o.src !== 'string') ? o.src : [o.src];
        self._volume = o.volume !== undefined ? o.volume : 1;
        self._xhrWithCredentials = o.xhrWithCredentials || false;

        // Setup all other default properties.
        self._duration = 0;
        self._state = 'unloaded';
        self._sounds = [];
        self._endTimers = {};
        self._queue = [];
        self._playLock = false;

        // Setup event listeners.
        self._onend = o.onend ? [{fn: o.onend}] : [];
        self._onfade = o.onfade ? [{fn: o.onfade}] : [];
        self._onload = o.onload ? [{fn: o.onload}] : [];
        self._onloaderror = o.onloaderror ? [{fn: o.onloaderror}] : [];
        self._onplayerror = o.onplayerror ? [{fn: o.onplayerror}] : [];
        self._onpause = o.onpause ? [{fn: o.onpause}] : [];
        self._onplay = o.onplay ? [{fn: o.onplay}] : [];
        self._onstop = o.onstop ? [{fn: o.onstop}] : [];
        self._onmute = o.onmute ? [{fn: o.onmute}] : [];
        self._onvolume = o.onvolume ? [{fn: o.onvolume}] : [];
        self._onrate = o.onrate ? [{fn: o.onrate}] : [];
        self._onseek = o.onseek ? [{fn: o.onseek}] : [];
        self._onunlock = o.onunlock ? [{fn: o.onunlock}] : [];
        self._onresume = [];

        // Web Audio or HTML5 Audio?
        self._webAudio = Howler.usingWebAudio && !self._html5;

        // Automatically try to enable audio.
        if (typeof Howler.ctx !== 'undefined' && Howler.ctx && Howler.autoUnlock) {
          Howler._unlockAudio();
        }

        // Keep track of this Howl group in the global controller.
        Howler._howls.push(self);

        // If they selected autoplay, add a play event to the load queue.
        if (self._autoplay) {
          self._queue.push({
            event: 'play',
            action: function() {
              self.play();
            }
          });
        }

        // Load the source file unless otherwise specified.
        if (self._preload) {
          self.load();
        }

        return self;
      },

      /**
       * Load the audio file.
       * @return {Howler}
       */
      load: function() {
        var self = this;
        var url = null;

        // If no audio is available, quit immediately.
        if (Howler.noAudio) {
          self._emit('loaderror', null, 'No audio support.');
          return;
        }

        // Make sure our source is in an array.
        if (typeof self._src === 'string') {
          self._src = [self._src];
        }

        // Loop through the sources and pick the first one that is compatible.
        for (var i=0; i<self._src.length; i++) {
          var ext, str;

          if (self._format && self._format[i]) {
            // If an extension was specified, use that instead.
            ext = self._format[i];
          } else {
            // Make sure the source is a string.
            str = self._src[i];
            if (typeof str !== 'string') {
              self._emit('loaderror', null, 'Non-string found in selected audio sources - ignoring.');
              continue;
            }

            // Extract the file extension from the URL or base64 data URI.
            ext = /^data:audio\/([^;,]+);/i.exec(str);
            if (!ext) {
              ext = /\.([^.]+)$/.exec(str.split('?', 1)[0]);
            }

            if (ext) {
              ext = ext[1].toLowerCase();
            }
          }

          // Log a warning if no extension was found.
          if (!ext) {
            console.warn('No file extension was found. Consider using the "format" property or specify an extension.');
          }

          // Check if this extension is available.
          if (ext && Howler.codecs(ext)) {
            url = self._src[i];
            break;
          }
        }

        if (!url) {
          self._emit('loaderror', null, 'No codec support for selected audio sources.');
          return;
        }

        self._src = url;
        self._state = 'loading';

        // If the hosting page is HTTPS and the source isn't,
        // drop down to HTML5 Audio to avoid Mixed Content errors.
        if (window.location.protocol === 'https:' && url.slice(0, 5) === 'http:') {
          self._html5 = true;
          self._webAudio = false;
        }

        // Create a new sound object and add it to the pool.
        new Sound(self);

        // Load and decode the audio data for playback.
        if (self._webAudio) {
          loadBuffer(self);
        }

        return self;
      },

      /**
       * Play a sound or resume previous playback.
       * @param  {String/Number} sprite   Sprite name for sprite playback or sound id to continue previous.
       * @param  {Boolean} internal Internal Use: true prevents event firing.
       * @return {Number}          Sound ID.
       */
      play: function(sprite, internal) {
        var self = this;
        var id = null;

        // Determine if a sprite, sound id or nothing was passed
        if (typeof sprite === 'number') {
          id = sprite;
          sprite = null;
        } else if (typeof sprite === 'string' && self._state === 'loaded' && !self._sprite[sprite]) {
          // If the passed sprite doesn't exist, do nothing.
          return null;
        } else if (typeof sprite === 'undefined') {
          // Use the default sound sprite (plays the full audio length).
          sprite = '__default';

          // Check if there is a single paused sound that isn't ended. 
          // If there is, play that sound. If not, continue as usual.  
          if (!self._playLock) {
            var num = 0;
            for (var i=0; i<self._sounds.length; i++) {
              if (self._sounds[i]._paused && !self._sounds[i]._ended) {
                num++;
                id = self._sounds[i]._id;
              }
            }

            if (num === 1) {
              sprite = null;
            } else {
              id = null;
            }
          }
        }

        // Get the selected node, or get one from the pool.
        var sound = id ? self._soundById(id) : self._inactiveSound();

        // If the sound doesn't exist, do nothing.
        if (!sound) {
          return null;
        }

        // Select the sprite definition.
        if (id && !sprite) {
          sprite = sound._sprite || '__default';
        }

        // If the sound hasn't loaded, we must wait to get the audio's duration.
        // We also need to wait to make sure we don't run into race conditions with
        // the order of function calls.
        if (self._state !== 'loaded') {
          // Set the sprite value on this sound.
          sound._sprite = sprite;

          // Mark this sound as not ended in case another sound is played before this one loads.
          sound._ended = false;

          // Add the sound to the queue to be played on load.
          var soundId = sound._id;
          self._queue.push({
            event: 'play',
            action: function() {
              self.play(soundId);
            }
          });

          return soundId;
        }

        // Don't play the sound if an id was passed and it is already playing.
        if (id && !sound._paused) {
          // Trigger the play event, in order to keep iterating through queue.
          if (!internal) {
            self._loadQueue('play');
          }

          return sound._id;
        }

        // Make sure the AudioContext isn't suspended, and resume it if it is.
        if (self._webAudio) {
          Howler._autoResume();
        }

        // Determine how long to play for and where to start playing.
        var seek = Math.max(0, sound._seek > 0 ? sound._seek : self._sprite[sprite][0] / 1000);
        var duration = Math.max(0, ((self._sprite[sprite][0] + self._sprite[sprite][1]) / 1000) - seek);
        var timeout = (duration * 1000) / Math.abs(sound._rate);
        var start = self._sprite[sprite][0] / 1000;
        var stop = (self._sprite[sprite][0] + self._sprite[sprite][1]) / 1000;
        var loop = !!(sound._loop || self._sprite[sprite][2]);
        sound._sprite = sprite;

        // Mark the sound as ended instantly so that this async playback
        // doesn't get grabbed by another call to play while this one waits to start.
        sound._ended = false;

        // Update the parameters of the sound.
        var setParams = function() {
          sound._paused = false;
          sound._seek = seek;
          sound._start = start;
          sound._stop = stop;
          sound._loop = loop;
        };

        // End the sound instantly if seek is at the end.
        if (seek >= stop) {
          self._ended(sound);
          return;
        }

        // Begin the actual playback.
        var node = sound._node;
        if (self._webAudio) {
          // Fire this when the sound is ready to play to begin Web Audio playback.
          var playWebAudio = function() {
            self._playLock = false;
            setParams();
            self._refreshBuffer(sound);

            // Setup the playback params.
            var vol = (sound._muted || self._muted) ? 0 : sound._volume;
            node.gain.setValueAtTime(vol, Howler.ctx.currentTime);
            sound._playStart = Howler.ctx.currentTime;

            // Play the sound using the supported method.
            if (typeof node.bufferSource.start === 'undefined') {
              sound._loop ? node.bufferSource.noteGrainOn(0, seek, 86400) : node.bufferSource.noteGrainOn(0, seek, duration);
            } else {
              sound._loop ? node.bufferSource.start(0, seek, 86400) : node.bufferSource.start(0, seek, duration);
            }

            // Start a new timer if none is present.
            if (timeout !== Infinity) {
              self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
            }

            if (!internal) {
              setTimeout(function() {
                self._emit('play', sound._id);
                self._loadQueue();
              }, 0);
            }
          };

          if (Howler.state === 'running') {
            playWebAudio();
          } else {
            self._playLock = true;

            // Wait for the audio context to resume before playing.
            self.once('resume', playWebAudio);

            // Cancel the end timer.
            self._clearTimer(sound._id);
          }
        } else {
          // Fire this when the sound is ready to play to begin HTML5 Audio playback.
          var playHtml5 = function() {
            node.currentTime = seek;
            node.muted = sound._muted || self._muted || Howler._muted || node.muted;
            node.volume = sound._volume * Howler.volume();
            node.playbackRate = sound._rate;

            // Some browsers will throw an error if this is called without user interaction.
            try {
              var play = node.play();

              // Support older browsers that don't support promises, and thus don't have this issue.
              if (play && typeof Promise !== 'undefined' && (play instanceof Promise || typeof play.then === 'function')) {
                // Implements a lock to prevent DOMException: The play() request was interrupted by a call to pause().
                self._playLock = true;

                // Set param values immediately.
                setParams();

                // Releases the lock and executes queued actions.
                play
                  .then(function() {
                    self._playLock = false;
                    node._unlocked = true;
                    if (!internal) {
                      self._emit('play', sound._id);
                      self._loadQueue();
                    }
                  })
                  .catch(function() {
                    self._playLock = false;
                    self._emit('playerror', sound._id, 'Playback was unable to start. This is most commonly an issue ' +
                      'on mobile devices and Chrome where playback was not within a user interaction.');

                    // Reset the ended and paused values.
                    sound._ended = true;
                    sound._paused = true;
                  });
              } else if (!internal) {
                self._playLock = false;
                setParams();
                self._emit('play', sound._id);
                self._loadQueue();
              }

              // Setting rate before playing won't work in IE, so we set it again here.
              node.playbackRate = sound._rate;

              // If the node is still paused, then we can assume there was a playback issue.
              if (node.paused) {
                self._emit('playerror', sound._id, 'Playback was unable to start. This is most commonly an issue ' +
                  'on mobile devices and Chrome where playback was not within a user interaction.');
                return;
              }

              // Setup the end timer on sprites or listen for the ended event.
              if (sprite !== '__default' || sound._loop) {
                self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
              } else {
                self._endTimers[sound._id] = function() {
                  // Fire ended on this audio node.
                  self._ended(sound);

                  // Clear this listener.
                  node.removeEventListener('ended', self._endTimers[sound._id], false);
                };
                node.addEventListener('ended', self._endTimers[sound._id], false);
              }
            } catch (err) {
              self._emit('playerror', sound._id, err);
            }
          };

          // If this is streaming audio, make sure the src is set and load again.
          if (node.src === 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA') {
            node.src = self._src;
            node.load();
          }

          // Play immediately if ready, or wait for the 'canplaythrough'e vent.
          var loadedNoReadyState = (window && window.ejecta) || (!node.readyState && Howler._navigator.isCocoonJS);
          if (node.readyState >= 3 || loadedNoReadyState) {
            playHtml5();
          } else {
            self._playLock = true;

            var listener = function() {
              // Begin playback.
              playHtml5();

              // Clear this listener.
              node.removeEventListener(Howler._canPlayEvent, listener, false);
            };
            node.addEventListener(Howler._canPlayEvent, listener, false);

            // Cancel the end timer.
            self._clearTimer(sound._id);
          }
        }

        return sound._id;
      },

      /**
       * Pause playback and save current position.
       * @param  {Number} id The sound ID (empty to pause all in group).
       * @return {Howl}
       */
      pause: function(id) {
        var self = this;

        // If the sound hasn't loaded or a play() promise is pending, add it to the load queue to pause when capable.
        if (self._state !== 'loaded' || self._playLock) {
          self._queue.push({
            event: 'pause',
            action: function() {
              self.pause(id);
            }
          });

          return self;
        }

        // If no id is passed, get all ID's to be paused.
        var ids = self._getSoundIds(id);

        for (var i=0; i<ids.length; i++) {
          // Clear the end timer.
          self._clearTimer(ids[i]);

          // Get the sound.
          var sound = self._soundById(ids[i]);

          if (sound && !sound._paused) {
            // Reset the seek position.
            sound._seek = self.seek(ids[i]);
            sound._rateSeek = 0;
            sound._paused = true;

            // Stop currently running fades.
            self._stopFade(ids[i]);

            if (sound._node) {
              if (self._webAudio) {
                // Make sure the sound has been created.
                if (!sound._node.bufferSource) {
                  continue;
                }

                if (typeof sound._node.bufferSource.stop === 'undefined') {
                  sound._node.bufferSource.noteOff(0);
                } else {
                  sound._node.bufferSource.stop(0);
                }

                // Clean up the buffer source.
                self._cleanBuffer(sound._node);
              } else if (!isNaN(sound._node.duration) || sound._node.duration === Infinity) {
                sound._node.pause();
              }
            }
          }

          // Fire the pause event, unless `true` is passed as the 2nd argument.
          if (!arguments[1]) {
            self._emit('pause', sound ? sound._id : null);
          }
        }

        return self;
      },

      /**
       * Stop playback and reset to start.
       * @param  {Number} id The sound ID (empty to stop all in group).
       * @param  {Boolean} internal Internal Use: true prevents event firing.
       * @return {Howl}
       */
      stop: function(id, internal) {
        var self = this;

        // If the sound hasn't loaded, add it to the load queue to stop when capable.
        if (self._state !== 'loaded' || self._playLock) {
          self._queue.push({
            event: 'stop',
            action: function() {
              self.stop(id);
            }
          });

          return self;
        }

        // If no id is passed, get all ID's to be stopped.
        var ids = self._getSoundIds(id);

        for (var i=0; i<ids.length; i++) {
          // Clear the end timer.
          self._clearTimer(ids[i]);

          // Get the sound.
          var sound = self._soundById(ids[i]);

          if (sound) {
            // Reset the seek position.
            sound._seek = sound._start || 0;
            sound._rateSeek = 0;
            sound._paused = true;
            sound._ended = true;

            // Stop currently running fades.
            self._stopFade(ids[i]);

            if (sound._node) {
              if (self._webAudio) {
                // Make sure the sound's AudioBufferSourceNode has been created.
                if (sound._node.bufferSource) {
                  if (typeof sound._node.bufferSource.stop === 'undefined') {
                    sound._node.bufferSource.noteOff(0);
                  } else {
                    sound._node.bufferSource.stop(0);
                  }

                  // Clean up the buffer source.
                  self._cleanBuffer(sound._node);
                }
              } else if (!isNaN(sound._node.duration) || sound._node.duration === Infinity) {
                sound._node.currentTime = sound._start || 0;
                sound._node.pause();

                // If this is a live stream, stop download once the audio is stopped.
                if (sound._node.duration === Infinity) {
                  self._clearSound(sound._node);
                }
              }
            }

            if (!internal) {
              self._emit('stop', sound._id);
            }
          }
        }

        return self;
      },

      /**
       * Mute/unmute a single sound or all sounds in this Howl group.
       * @param  {Boolean} muted Set to true to mute and false to unmute.
       * @param  {Number} id    The sound ID to update (omit to mute/unmute all).
       * @return {Howl}
       */
      mute: function(muted, id) {
        var self = this;

        // If the sound hasn't loaded, add it to the load queue to mute when capable.
        if (self._state !== 'loaded'|| self._playLock) {
          self._queue.push({
            event: 'mute',
            action: function() {
              self.mute(muted, id);
            }
          });

          return self;
        }

        // If applying mute/unmute to all sounds, update the group's value.
        if (typeof id === 'undefined') {
          if (typeof muted === 'boolean') {
            self._muted = muted;
          } else {
            return self._muted;
          }
        }

        // If no id is passed, get all ID's to be muted.
        var ids = self._getSoundIds(id);

        for (var i=0; i<ids.length; i++) {
          // Get the sound.
          var sound = self._soundById(ids[i]);

          if (sound) {
            sound._muted = muted;

            // Cancel active fade and set the volume to the end value.
            if (sound._interval) {
              self._stopFade(sound._id);
            }

            if (self._webAudio && sound._node) {
              sound._node.gain.setValueAtTime(muted ? 0 : sound._volume, Howler.ctx.currentTime);
            } else if (sound._node) {
              sound._node.muted = Howler._muted ? true : muted;
            }

            self._emit('mute', sound._id);
          }
        }

        return self;
      },

      /**
       * Get/set the volume of this sound or of the Howl group. This method can optionally take 0, 1 or 2 arguments.
       *   volume() -> Returns the group's volume value.
       *   volume(id) -> Returns the sound id's current volume.
       *   volume(vol) -> Sets the volume of all sounds in this Howl group.
       *   volume(vol, id) -> Sets the volume of passed sound id.
       * @return {Howl/Number} Returns self or current volume.
       */
      volume: function() {
        var self = this;
        var args = arguments;
        var vol, id;

        // Determine the values based on arguments.
        if (args.length === 0) {
          // Return the value of the groups' volume.
          return self._volume;
        } else if (args.length === 1 || args.length === 2 && typeof args[1] === 'undefined') {
          // First check if this is an ID, and if not, assume it is a new volume.
          var ids = self._getSoundIds();
          var index = ids.indexOf(args[0]);
          if (index >= 0) {
            id = parseInt(args[0], 10);
          } else {
            vol = parseFloat(args[0]);
          }
        } else if (args.length >= 2) {
          vol = parseFloat(args[0]);
          id = parseInt(args[1], 10);
        }

        // Update the volume or return the current volume.
        var sound;
        if (typeof vol !== 'undefined' && vol >= 0 && vol <= 1) {
          // If the sound hasn't loaded, add it to the load queue to change volume when capable.
          if (self._state !== 'loaded'|| self._playLock) {
            self._queue.push({
              event: 'volume',
              action: function() {
                self.volume.apply(self, args);
              }
            });

            return self;
          }

          // Set the group volume.
          if (typeof id === 'undefined') {
            self._volume = vol;
          }

          // Update one or all volumes.
          id = self._getSoundIds(id);
          for (var i=0; i<id.length; i++) {
            // Get the sound.
            sound = self._soundById(id[i]);

            if (sound) {
              sound._volume = vol;

              // Stop currently running fades.
              if (!args[2]) {
                self._stopFade(id[i]);
              }

              if (self._webAudio && sound._node && !sound._muted) {
                sound._node.gain.setValueAtTime(vol, Howler.ctx.currentTime);
              } else if (sound._node && !sound._muted) {
                sound._node.volume = vol * Howler.volume();
              }

              self._emit('volume', sound._id);
            }
          }
        } else {
          sound = id ? self._soundById(id) : self._sounds[0];
          return sound ? sound._volume : 0;
        }

        return self;
      },

      /**
       * Fade a currently playing sound between two volumes (if no id is passsed, all sounds will fade).
       * @param  {Number} from The value to fade from (0.0 to 1.0).
       * @param  {Number} to   The volume to fade to (0.0 to 1.0).
       * @param  {Number} len  Time in milliseconds to fade.
       * @param  {Number} id   The sound id (omit to fade all sounds).
       * @return {Howl}
       */
      fade: function(from, to, len, id) {
        var self = this;

        // If the sound hasn't loaded, add it to the load queue to fade when capable.
        if (self._state !== 'loaded' || self._playLock) {
          self._queue.push({
            event: 'fade',
            action: function() {
              self.fade(from, to, len, id);
            }
          });

          return self;
        }

        // Make sure the to/from/len values are numbers.
        from = parseFloat(from);
        to = parseFloat(to);
        len = parseFloat(len);

        // Set the volume to the start position.
        self.volume(from, id);

        // Fade the volume of one or all sounds.
        var ids = self._getSoundIds(id);
        for (var i=0; i<ids.length; i++) {
          // Get the sound.
          var sound = self._soundById(ids[i]);

          // Create a linear fade or fall back to timeouts with HTML5 Audio.
          if (sound) {
            // Stop the previous fade if no sprite is being used (otherwise, volume handles this).
            if (!id) {
              self._stopFade(ids[i]);
            }

            // If we are using Web Audio, let the native methods do the actual fade.
            if (self._webAudio && !sound._muted) {
              var currentTime = Howler.ctx.currentTime;
              var end = currentTime + (len / 1000);
              sound._volume = from;
              sound._node.gain.setValueAtTime(from, currentTime);
              sound._node.gain.linearRampToValueAtTime(to, end);
            }

            self._startFadeInterval(sound, from, to, len, ids[i], typeof id === 'undefined');
          }
        }

        return self;
      },

      /**
       * Starts the internal interval to fade a sound.
       * @param  {Object} sound Reference to sound to fade.
       * @param  {Number} from The value to fade from (0.0 to 1.0).
       * @param  {Number} to   The volume to fade to (0.0 to 1.0).
       * @param  {Number} len  Time in milliseconds to fade.
       * @param  {Number} id   The sound id to fade.
       * @param  {Boolean} isGroup   If true, set the volume on the group.
       */
      _startFadeInterval: function(sound, from, to, len, id, isGroup) {
        var self = this;
        var vol = from;
        var diff = to - from;
        var steps = Math.abs(diff / 0.01);
        var stepLen = Math.max(4, (steps > 0) ? len / steps : len);
        var lastTick = Date.now();

        // Store the value being faded to.
        sound._fadeTo = to;

        // Update the volume value on each interval tick.
        sound._interval = setInterval(function() {
          // Update the volume based on the time since the last tick.
          var tick = (Date.now() - lastTick) / len;
          lastTick = Date.now();
          vol += diff * tick;

          // Make sure the volume is in the right bounds.
          vol = Math.max(0, vol);
          vol = Math.min(1, vol);

          // Round to within 2 decimal points.
          vol = Math.round(vol * 100) / 100;

          // Change the volume.
          if (self._webAudio) {
            sound._volume = vol;
          } else {
            self.volume(vol, sound._id, true);
          }

          // Set the group's volume.
          if (isGroup) {
            self._volume = vol;
          }

          // When the fade is complete, stop it and fire event.
          if ((to < from && vol <= to) || (to > from && vol >= to)) {
            clearInterval(sound._interval);
            sound._interval = null;
            sound._fadeTo = null;
            self.volume(to, sound._id);
            self._emit('fade', sound._id);
          }
        }, stepLen);
      },

      /**
       * Internal method that stops the currently playing fade when
       * a new fade starts, volume is changed or the sound is stopped.
       * @param  {Number} id The sound id.
       * @return {Howl}
       */
      _stopFade: function(id) {
        var self = this;
        var sound = self._soundById(id);

        if (sound && sound._interval) {
          if (self._webAudio) {
            sound._node.gain.cancelScheduledValues(Howler.ctx.currentTime);
          }

          clearInterval(sound._interval);
          sound._interval = null;
          self.volume(sound._fadeTo, id);
          sound._fadeTo = null;
          self._emit('fade', id);
        }

        return self;
      },

      /**
       * Get/set the loop parameter on a sound. This method can optionally take 0, 1 or 2 arguments.
       *   loop() -> Returns the group's loop value.
       *   loop(id) -> Returns the sound id's loop value.
       *   loop(loop) -> Sets the loop value for all sounds in this Howl group.
       *   loop(loop, id) -> Sets the loop value of passed sound id.
       * @return {Howl/Boolean} Returns self or current loop value.
       */
      loop: function() {
        var self = this;
        var args = arguments;
        var loop, id, sound;

        // Determine the values for loop and id.
        if (args.length === 0) {
          // Return the grou's loop value.
          return self._loop;
        } else if (args.length === 1) {
          if (typeof args[0] === 'boolean') {
            loop = args[0];
            self._loop = loop;
          } else {
            // Return this sound's loop value.
            sound = self._soundById(parseInt(args[0], 10));
            return sound ? sound._loop : false;
          }
        } else if (args.length === 2) {
          loop = args[0];
          id = parseInt(args[1], 10);
        }

        // If no id is passed, get all ID's to be looped.
        var ids = self._getSoundIds(id);
        for (var i=0; i<ids.length; i++) {
          sound = self._soundById(ids[i]);

          if (sound) {
            sound._loop = loop;
            if (self._webAudio && sound._node && sound._node.bufferSource) {
              sound._node.bufferSource.loop = loop;
              if (loop) {
                sound._node.bufferSource.loopStart = sound._start || 0;
                sound._node.bufferSource.loopEnd = sound._stop;
              }
            }
          }
        }

        return self;
      },

      /**
       * Get/set the playback rate of a sound. This method can optionally take 0, 1 or 2 arguments.
       *   rate() -> Returns the first sound node's current playback rate.
       *   rate(id) -> Returns the sound id's current playback rate.
       *   rate(rate) -> Sets the playback rate of all sounds in this Howl group.
       *   rate(rate, id) -> Sets the playback rate of passed sound id.
       * @return {Howl/Number} Returns self or the current playback rate.
       */
      rate: function() {
        var self = this;
        var args = arguments;
        var rate, id;

        // Determine the values based on arguments.
        if (args.length === 0) {
          // We will simply return the current rate of the first node.
          id = self._sounds[0]._id;
        } else if (args.length === 1) {
          // First check if this is an ID, and if not, assume it is a new rate value.
          var ids = self._getSoundIds();
          var index = ids.indexOf(args[0]);
          if (index >= 0) {
            id = parseInt(args[0], 10);
          } else {
            rate = parseFloat(args[0]);
          }
        } else if (args.length === 2) {
          rate = parseFloat(args[0]);
          id = parseInt(args[1], 10);
        }

        // Update the playback rate or return the current value.
        var sound;
        if (typeof rate === 'number') {
          // If the sound hasn't loaded, add it to the load queue to change playback rate when capable.
          if (self._state !== 'loaded' || self._playLock) {
            self._queue.push({
              event: 'rate',
              action: function() {
                self.rate.apply(self, args);
              }
            });

            return self;
          }

          // Set the group rate.
          if (typeof id === 'undefined') {
            self._rate = rate;
          }

          // Update one or all volumes.
          id = self._getSoundIds(id);
          for (var i=0; i<id.length; i++) {
            // Get the sound.
            sound = self._soundById(id[i]);

            if (sound) {
              // Keep track of our position when the rate changed and update the playback
              // start position so we can properly adjust the seek position for time elapsed.
              if (self.playing(id[i])) {
                sound._rateSeek = self.seek(id[i]);
                sound._playStart = self._webAudio ? Howler.ctx.currentTime : sound._playStart;
              }
              sound._rate = rate;

              // Change the playback rate.
              if (self._webAudio && sound._node && sound._node.bufferSource) {
                sound._node.bufferSource.playbackRate.setValueAtTime(rate, Howler.ctx.currentTime);
              } else if (sound._node) {
                sound._node.playbackRate = rate;
              }

              // Reset the timers.
              var seek = self.seek(id[i]);
              var duration = ((self._sprite[sound._sprite][0] + self._sprite[sound._sprite][1]) / 1000) - seek;
              var timeout = (duration * 1000) / Math.abs(sound._rate);

              // Start a new end timer if sound is already playing.
              if (self._endTimers[id[i]] || !sound._paused) {
                self._clearTimer(id[i]);
                self._endTimers[id[i]] = setTimeout(self._ended.bind(self, sound), timeout);
              }

              self._emit('rate', sound._id);
            }
          }
        } else {
          sound = self._soundById(id);
          return sound ? sound._rate : self._rate;
        }

        return self;
      },

      /**
       * Get/set the seek position of a sound. This method can optionally take 0, 1 or 2 arguments.
       *   seek() -> Returns the first sound node's current seek position.
       *   seek(id) -> Returns the sound id's current seek position.
       *   seek(seek) -> Sets the seek position of the first sound node.
       *   seek(seek, id) -> Sets the seek position of passed sound id.
       * @return {Howl/Number} Returns self or the current seek position.
       */
      seek: function() {
        var self = this;
        var args = arguments;
        var seek, id;

        // Determine the values based on arguments.
        if (args.length === 0) {
          // We will simply return the current position of the first node.
          id = self._sounds[0]._id;
        } else if (args.length === 1) {
          // First check if this is an ID, and if not, assume it is a new seek position.
          var ids = self._getSoundIds();
          var index = ids.indexOf(args[0]);
          if (index >= 0) {
            id = parseInt(args[0], 10);
          } else if (self._sounds.length) {
            id = self._sounds[0]._id;
            seek = parseFloat(args[0]);
          }
        } else if (args.length === 2) {
          seek = parseFloat(args[0]);
          id = parseInt(args[1], 10);
        }

        // If there is no ID, bail out.
        if (typeof id === 'undefined') {
          return self;
        }

        // If the sound hasn't loaded, add it to the load queue to seek when capable.
        if (self._state !== 'loaded' || self._playLock) {
          self._queue.push({
            event: 'seek',
            action: function() {
              self.seek.apply(self, args);
            }
          });

          return self;
        }

        // Get the sound.
        var sound = self._soundById(id);

        if (sound) {
          if (typeof seek === 'number' && seek >= 0) {
            // Pause the sound and update position for restarting playback.
            var playing = self.playing(id);
            if (playing) {
              self.pause(id, true);
            }

            // Move the position of the track and cancel timer.
            sound._seek = seek;
            sound._ended = false;
            self._clearTimer(id);

            // Update the seek position for HTML5 Audio.
            if (!self._webAudio && sound._node && !isNaN(sound._node.duration)) {
              sound._node.currentTime = seek;
            }

            // Seek and emit when ready.
            var seekAndEmit = function() {
              self._emit('seek', id);

              // Restart the playback if the sound was playing.
              if (playing) {
                self.play(id, true);
              }
            };

            // Wait for the play lock to be unset before emitting (HTML5 Audio).
            if (playing && !self._webAudio) {
              var emitSeek = function() {
                if (!self._playLock) {
                  seekAndEmit();
                } else {
                  setTimeout(emitSeek, 0);
                }
              };
              setTimeout(emitSeek, 0);
            } else {
              seekAndEmit();
            }
          } else {
            if (self._webAudio) {
              var realTime = self.playing(id) ? Howler.ctx.currentTime - sound._playStart : 0;
              var rateSeek = sound._rateSeek ? sound._rateSeek - sound._seek : 0;
              return sound._seek + (rateSeek + realTime * Math.abs(sound._rate));
            } else {
              return sound._node.currentTime;
            }
          }
        }

        return self;
      },

      /**
       * Check if a specific sound is currently playing or not (if id is provided), or check if at least one of the sounds in the group is playing or not.
       * @param  {Number}  id The sound id to check. If none is passed, the whole sound group is checked.
       * @return {Boolean} True if playing and false if not.
       */
      playing: function(id) {
        var self = this;

        // Check the passed sound ID (if any).
        if (typeof id === 'number') {
          var sound = self._soundById(id);
          return sound ? !sound._paused : false;
        }

        // Otherwise, loop through all sounds and check if any are playing.
        for (var i=0; i<self._sounds.length; i++) {
          if (!self._sounds[i]._paused) {
            return true;
          }
        }

        return false;
      },

      /**
       * Get the duration of this sound. Passing a sound id will return the sprite duration.
       * @param  {Number} id The sound id to check. If none is passed, return full source duration.
       * @return {Number} Audio duration in seconds.
       */
      duration: function(id) {
        var self = this;
        var duration = self._duration;

        // If we pass an ID, get the sound and return the sprite length.
        var sound = self._soundById(id);
        if (sound) {
          duration = self._sprite[sound._sprite][1] / 1000;
        }

        return duration;
      },

      /**
       * Returns the current loaded state of this Howl.
       * @return {String} 'unloaded', 'loading', 'loaded'
       */
      state: function() {
        return this._state;
      },

      /**
       * Unload and destroy the current Howl object.
       * This will immediately stop all sound instances attached to this group.
       */
      unload: function() {
        var self = this;

        // Stop playing any active sounds.
        var sounds = self._sounds;
        for (var i=0; i<sounds.length; i++) {
          // Stop the sound if it is currently playing.
          if (!sounds[i]._paused) {
            self.stop(sounds[i]._id);
          }

          // Remove the source or disconnect.
          if (!self._webAudio) {
            // Set the source to 0-second silence to stop any downloading (except in IE).
            self._clearSound(sounds[i]._node);

            // Remove any event listeners.
            sounds[i]._node.removeEventListener('error', sounds[i]._errorFn, false);
            sounds[i]._node.removeEventListener(Howler._canPlayEvent, sounds[i]._loadFn, false);

            // Release the Audio object back to the pool.
            Howler._releaseHtml5Audio(sounds[i]._node);
          }

          // Empty out all of the nodes.
          delete sounds[i]._node;

          // Make sure all timers are cleared out.
          self._clearTimer(sounds[i]._id);
        }

        // Remove the references in the global Howler object.
        var index = Howler._howls.indexOf(self);
        if (index >= 0) {
          Howler._howls.splice(index, 1);
        }

        // Delete this sound from the cache (if no other Howl is using it).
        var remCache = true;
        for (i=0; i<Howler._howls.length; i++) {
          if (Howler._howls[i]._src === self._src || self._src.indexOf(Howler._howls[i]._src) >= 0) {
            remCache = false;
            break;
          }
        }

        if (cache && remCache) {
          delete cache[self._src];
        }

        // Clear global errors.
        Howler.noAudio = false;

        // Clear out `self`.
        self._state = 'unloaded';
        self._sounds = [];
        self = null;

        return null;
      },

      /**
       * Listen to a custom event.
       * @param  {String}   event Event name.
       * @param  {Function} fn    Listener to call.
       * @param  {Number}   id    (optional) Only listen to events for this sound.
       * @param  {Number}   once  (INTERNAL) Marks event to fire only once.
       * @return {Howl}
       */
      on: function(event, fn, id, once) {
        var self = this;
        var events = self['_on' + event];

        if (typeof fn === 'function') {
          events.push(once ? {id: id, fn: fn, once: once} : {id: id, fn: fn});
        }

        return self;
      },

      /**
       * Remove a custom event. Call without parameters to remove all events.
       * @param  {String}   event Event name.
       * @param  {Function} fn    Listener to remove. Leave empty to remove all.
       * @param  {Number}   id    (optional) Only remove events for this sound.
       * @return {Howl}
       */
      off: function(event, fn, id) {
        var self = this;
        var events = self['_on' + event];
        var i = 0;

        // Allow passing just an event and ID.
        if (typeof fn === 'number') {
          id = fn;
          fn = null;
        }

        if (fn || id) {
          // Loop through event store and remove the passed function.
          for (i=0; i<events.length; i++) {
            var isId = (id === events[i].id);
            if (fn === events[i].fn && isId || !fn && isId) {
              events.splice(i, 1);
              break;
            }
          }
        } else if (event) {
          // Clear out all events of this type.
          self['_on' + event] = [];
        } else {
          // Clear out all events of every type.
          var keys = Object.keys(self);
          for (i=0; i<keys.length; i++) {
            if ((keys[i].indexOf('_on') === 0) && Array.isArray(self[keys[i]])) {
              self[keys[i]] = [];
            }
          }
        }

        return self;
      },

      /**
       * Listen to a custom event and remove it once fired.
       * @param  {String}   event Event name.
       * @param  {Function} fn    Listener to call.
       * @param  {Number}   id    (optional) Only listen to events for this sound.
       * @return {Howl}
       */
      once: function(event, fn, id) {
        var self = this;

        // Setup the event listener.
        self.on(event, fn, id, 1);

        return self;
      },

      /**
       * Emit all events of a specific type and pass the sound id.
       * @param  {String} event Event name.
       * @param  {Number} id    Sound ID.
       * @param  {Number} msg   Message to go with event.
       * @return {Howl}
       */
      _emit: function(event, id, msg) {
        var self = this;
        var events = self['_on' + event];

        // Loop through event store and fire all functions.
        for (var i=events.length-1; i>=0; i--) {
          // Only fire the listener if the correct ID is used.
          if (!events[i].id || events[i].id === id || event === 'load') {
            setTimeout(function(fn) {
              fn.call(this, id, msg);
            }.bind(self, events[i].fn), 0);

            // If this event was setup with `once`, remove it.
            if (events[i].once) {
              self.off(event, events[i].fn, events[i].id);
            }
          }
        }

        // Pass the event type into load queue so that it can continue stepping.
        self._loadQueue(event);

        return self;
      },

      /**
       * Queue of actions initiated before the sound has loaded.
       * These will be called in sequence, with the next only firing
       * after the previous has finished executing (even if async like play).
       * @return {Howl}
       */
      _loadQueue: function(event) {
        var self = this;

        if (self._queue.length > 0) {
          var task = self._queue[0];

          // Remove this task if a matching event was passed.
          if (task.event === event) {
            self._queue.shift();
            self._loadQueue();
          }

          // Run the task if no event type is passed.
          if (!event) {
            task.action();
          }
        }

        return self;
      },

      /**
       * Fired when playback ends at the end of the duration.
       * @param  {Sound} sound The sound object to work with.
       * @return {Howl}
       */
      _ended: function(sound) {
        var self = this;
        var sprite = sound._sprite;

        // If we are using IE and there was network latency we may be clipping
        // audio before it completes playing. Lets check the node to make sure it
        // believes it has completed, before ending the playback.
        if (!self._webAudio && sound._node && !sound._node.paused && !sound._node.ended && sound._node.currentTime < sound._stop) {
          setTimeout(self._ended.bind(self, sound), 100);
          return self;
        }

        // Should this sound loop?
        var loop = !!(sound._loop || self._sprite[sprite][2]);

        // Fire the ended event.
        self._emit('end', sound._id);

        // Restart the playback for HTML5 Audio loop.
        if (!self._webAudio && loop) {
          self.stop(sound._id, true).play(sound._id);
        }

        // Restart this timer if on a Web Audio loop.
        if (self._webAudio && loop) {
          self._emit('play', sound._id);
          sound._seek = sound._start || 0;
          sound._rateSeek = 0;
          sound._playStart = Howler.ctx.currentTime;

          var timeout = ((sound._stop - sound._start) * 1000) / Math.abs(sound._rate);
          self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
        }

        // Mark the node as paused.
        if (self._webAudio && !loop) {
          sound._paused = true;
          sound._ended = true;
          sound._seek = sound._start || 0;
          sound._rateSeek = 0;
          self._clearTimer(sound._id);

          // Clean up the buffer source.
          self._cleanBuffer(sound._node);

          // Attempt to auto-suspend AudioContext if no sounds are still playing.
          Howler._autoSuspend();
        }

        // When using a sprite, end the track.
        if (!self._webAudio && !loop) {
          self.stop(sound._id, true);
        }

        return self;
      },

      /**
       * Clear the end timer for a sound playback.
       * @param  {Number} id The sound ID.
       * @return {Howl}
       */
      _clearTimer: function(id) {
        var self = this;

        if (self._endTimers[id]) {
          // Clear the timeout or remove the ended listener.
          if (typeof self._endTimers[id] !== 'function') {
            clearTimeout(self._endTimers[id]);
          } else {
            var sound = self._soundById(id);
            if (sound && sound._node) {
              sound._node.removeEventListener('ended', self._endTimers[id], false);
            }
          }

          delete self._endTimers[id];
        }

        return self;
      },

      /**
       * Return the sound identified by this ID, or return null.
       * @param  {Number} id Sound ID
       * @return {Object}    Sound object or null.
       */
      _soundById: function(id) {
        var self = this;

        // Loop through all sounds and find the one with this ID.
        for (var i=0; i<self._sounds.length; i++) {
          if (id === self._sounds[i]._id) {
            return self._sounds[i];
          }
        }

        return null;
      },

      /**
       * Return an inactive sound from the pool or create a new one.
       * @return {Sound} Sound playback object.
       */
      _inactiveSound: function() {
        var self = this;

        self._drain();

        // Find the first inactive node to recycle.
        for (var i=0; i<self._sounds.length; i++) {
          if (self._sounds[i]._ended) {
            return self._sounds[i].reset();
          }
        }

        // If no inactive node was found, create a new one.
        return new Sound(self);
      },

      /**
       * Drain excess inactive sounds from the pool.
       */
      _drain: function() {
        var self = this;
        var limit = self._pool;
        var cnt = 0;
        var i = 0;

        // If there are less sounds than the max pool size, we are done.
        if (self._sounds.length < limit) {
          return;
        }

        // Count the number of inactive sounds.
        for (i=0; i<self._sounds.length; i++) {
          if (self._sounds[i]._ended) {
            cnt++;
          }
        }

        // Remove excess inactive sounds, going in reverse order.
        for (i=self._sounds.length - 1; i>=0; i--) {
          if (cnt <= limit) {
            return;
          }

          if (self._sounds[i]._ended) {
            // Disconnect the audio source when using Web Audio.
            if (self._webAudio && self._sounds[i]._node) {
              self._sounds[i]._node.disconnect(0);
            }

            // Remove sounds until we have the pool size.
            self._sounds.splice(i, 1);
            cnt--;
          }
        }
      },

      /**
       * Get all ID's from the sounds pool.
       * @param  {Number} id Only return one ID if one is passed.
       * @return {Array}    Array of IDs.
       */
      _getSoundIds: function(id) {
        var self = this;

        if (typeof id === 'undefined') {
          var ids = [];
          for (var i=0; i<self._sounds.length; i++) {
            ids.push(self._sounds[i]._id);
          }

          return ids;
        } else {
          return [id];
        }
      },

      /**
       * Load the sound back into the buffer source.
       * @param  {Sound} sound The sound object to work with.
       * @return {Howl}
       */
      _refreshBuffer: function(sound) {
        var self = this;

        // Setup the buffer source for playback.
        sound._node.bufferSource = Howler.ctx.createBufferSource();
        sound._node.bufferSource.buffer = cache[self._src];

        // Connect to the correct node.
        if (sound._panner) {
          sound._node.bufferSource.connect(sound._panner);
        } else {
          sound._node.bufferSource.connect(sound._node);
        }

        // Setup looping and playback rate.
        sound._node.bufferSource.loop = sound._loop;
        if (sound._loop) {
          sound._node.bufferSource.loopStart = sound._start || 0;
          sound._node.bufferSource.loopEnd = sound._stop || 0;
        }
        sound._node.bufferSource.playbackRate.setValueAtTime(sound._rate, Howler.ctx.currentTime);

        return self;
      },

      /**
       * Prevent memory leaks by cleaning up the buffer source after playback.
       * @param  {Object} node Sound's audio node containing the buffer source.
       * @return {Howl}
       */
      _cleanBuffer: function(node) {
        var self = this;
        var isIOS = Howler._navigator && Howler._navigator.vendor.indexOf('Apple') >= 0;

        if (Howler._scratchBuffer && node.bufferSource) {
          node.bufferSource.onended = null;
          node.bufferSource.disconnect(0);
          if (isIOS) {
            try { node.bufferSource.buffer = Howler._scratchBuffer; } catch(e) {}
          }
        }
        node.bufferSource = null;

        return self;
      },

      /**
       * Set the source to a 0-second silence to stop any downloading (except in IE).
       * @param  {Object} node Audio node to clear.
       */
      _clearSound: function(node) {
        var checkIE = /MSIE |Trident\//.test(Howler._navigator && Howler._navigator.userAgent);
        if (!checkIE) {
          node.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        }
      }
    };

    /** Single Sound Methods **/
    /***************************************************************************/

    /**
     * Setup the sound object, which each node attached to a Howl group is contained in.
     * @param {Object} howl The Howl parent group.
     */
    var Sound = function(howl) {
      this._parent = howl;
      this.init();
    };
    Sound.prototype = {
      /**
       * Initialize a new Sound object.
       * @return {Sound}
       */
      init: function() {
        var self = this;
        var parent = self._parent;

        // Setup the default parameters.
        self._muted = parent._muted;
        self._loop = parent._loop;
        self._volume = parent._volume;
        self._rate = parent._rate;
        self._seek = 0;
        self._paused = true;
        self._ended = true;
        self._sprite = '__default';

        // Generate a unique ID for this sound.
        self._id = ++Howler._counter;

        // Add itself to the parent's pool.
        parent._sounds.push(self);

        // Create the new node.
        self.create();

        return self;
      },

      /**
       * Create and setup a new sound object, whether HTML5 Audio or Web Audio.
       * @return {Sound}
       */
      create: function() {
        var self = this;
        var parent = self._parent;
        var volume = (Howler._muted || self._muted || self._parent._muted) ? 0 : self._volume;

        if (parent._webAudio) {
          // Create the gain node for controlling volume (the source will connect to this).
          self._node = (typeof Howler.ctx.createGain === 'undefined') ? Howler.ctx.createGainNode() : Howler.ctx.createGain();
          self._node.gain.setValueAtTime(volume, Howler.ctx.currentTime);
          self._node.paused = true;
          self._node.connect(Howler.masterGain);
        } else {
          // Get an unlocked Audio object from the pool.
          self._node = Howler._obtainHtml5Audio();

          // Listen for errors (http://dev.w3.org/html5/spec-author-view/spec.html#mediaerror).
          self._errorFn = self._errorListener.bind(self);
          self._node.addEventListener('error', self._errorFn, false);

          // Listen for 'canplaythrough' event to let us know the sound is ready.
          self._loadFn = self._loadListener.bind(self);
          self._node.addEventListener(Howler._canPlayEvent, self._loadFn, false);

          // Setup the new audio node.
          self._node.src = parent._src;
          self._node.preload = 'auto';
          self._node.volume = volume * Howler.volume();

          // Begin loading the source.
          self._node.load();
        }

        return self;
      },

      /**
       * Reset the parameters of this sound to the original state (for recycle).
       * @return {Sound}
       */
      reset: function() {
        var self = this;
        var parent = self._parent;

        // Reset all of the parameters of this sound.
        self._muted = parent._muted;
        self._loop = parent._loop;
        self._volume = parent._volume;
        self._rate = parent._rate;
        self._seek = 0;
        self._rateSeek = 0;
        self._paused = true;
        self._ended = true;
        self._sprite = '__default';

        // Generate a new ID so that it isn't confused with the previous sound.
        self._id = ++Howler._counter;

        return self;
      },

      /**
       * HTML5 Audio error listener callback.
       */
      _errorListener: function() {
        var self = this;

        // Fire an error event and pass back the code.
        self._parent._emit('loaderror', self._id, self._node.error ? self._node.error.code : 0);

        // Clear the event listener.
        self._node.removeEventListener('error', self._errorFn, false);
      },

      /**
       * HTML5 Audio canplaythrough listener callback.
       */
      _loadListener: function() {
        var self = this;
        var parent = self._parent;

        // Round up the duration to account for the lower precision in HTML5 Audio.
        parent._duration = Math.ceil(self._node.duration * 10) / 10;

        // Setup a sprite if none is defined.
        if (Object.keys(parent._sprite).length === 0) {
          parent._sprite = {__default: [0, parent._duration * 1000]};
        }

        if (parent._state !== 'loaded') {
          parent._state = 'loaded';
          parent._emit('load');
          parent._loadQueue();
        }

        // Clear the event listener.
        self._node.removeEventListener(Howler._canPlayEvent, self._loadFn, false);
      }
    };

    /** Helper Methods **/
    /***************************************************************************/

    var cache = {};

    /**
     * Buffer a sound from URL, Data URI or cache and decode to audio source (Web Audio API).
     * @param  {Howl} self
     */
    var loadBuffer = function(self) {
      var url = self._src;

      // Check if the buffer has already been cached and use it instead.
      if (cache[url]) {
        // Set the duration from the cache.
        self._duration = cache[url].duration;

        // Load the sound into this Howl.
        loadSound(self);

        return;
      }

      if (/^data:[^;]+;base64,/.test(url)) {
        // Decode the base64 data URI without XHR, since some browsers don't support it.
        var data = atob(url.split(',')[1]);
        var dataView = new Uint8Array(data.length);
        for (var i=0; i<data.length; ++i) {
          dataView[i] = data.charCodeAt(i);
        }

        decodeAudioData(dataView.buffer, self);
      } else {
        // Load the buffer from the URL.
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.withCredentials = self._xhrWithCredentials;
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
          // Make sure we get a successful response back.
          var code = (xhr.status + '')[0];
          if (code !== '0' && code !== '2' && code !== '3') {
            self._emit('loaderror', null, 'Failed loading audio file with status: ' + xhr.status + '.');
            return;
          }

          decodeAudioData(xhr.response, self);
        };
        xhr.onerror = function() {
          // If there is an error, switch to HTML5 Audio.
          if (self._webAudio) {
            self._html5 = true;
            self._webAudio = false;
            self._sounds = [];
            delete cache[url];
            self.load();
          }
        };
        safeXhrSend(xhr);
      }
    };

    /**
     * Send the XHR request wrapped in a try/catch.
     * @param  {Object} xhr XHR to send.
     */
    var safeXhrSend = function(xhr) {
      try {
        xhr.send();
      } catch (e) {
        xhr.onerror();
      }
    };

    /**
     * Decode audio data from an array buffer.
     * @param  {ArrayBuffer} arraybuffer The audio data.
     * @param  {Howl}        self
     */
    var decodeAudioData = function(arraybuffer, self) {
      // Fire a load error if something broke.
      var error = function() {
        self._emit('loaderror', null, 'Decoding audio data failed.');
      };

      // Load the sound on success.
      var success = function(buffer) {
        if (buffer && self._sounds.length > 0) {
          cache[self._src] = buffer;
          loadSound(self, buffer);
        } else {
          error();
        }
      };

      // Decode the buffer into an audio source.
      if (typeof Promise !== 'undefined' && Howler.ctx.decodeAudioData.length === 1) {
        Howler.ctx.decodeAudioData(arraybuffer).then(success).catch(error);
      } else {
        Howler.ctx.decodeAudioData(arraybuffer, success, error);
      }
    };

    /**
     * Sound is now loaded, so finish setting everything up and fire the loaded event.
     * @param  {Howl} self
     * @param  {Object} buffer The decoded buffer sound source.
     */
    var loadSound = function(self, buffer) {
      // Set the duration.
      if (buffer && !self._duration) {
        self._duration = buffer.duration;
      }

      // Setup a sprite if none is defined.
      if (Object.keys(self._sprite).length === 0) {
        self._sprite = {__default: [0, self._duration * 1000]};
      }

      // Fire the loaded event.
      if (self._state !== 'loaded') {
        self._state = 'loaded';
        self._emit('load');
        self._loadQueue();
      }
    };

    /**
     * Setup the audio context when available, or switch to HTML5 Audio mode.
     */
    var setupAudioContext = function() {
      // If we have already detected that Web Audio isn't supported, don't run this step again.
      if (!Howler.usingWebAudio) {
        return;
      }

      // Check if we are using Web Audio and setup the AudioContext if we are.
      try {
        if (typeof AudioContext !== 'undefined') {
          Howler.ctx = new AudioContext();
        } else if (typeof webkitAudioContext !== 'undefined') {
          Howler.ctx = new webkitAudioContext();
        } else {
          Howler.usingWebAudio = false;
        }
      } catch(e) {
        Howler.usingWebAudio = false;
      }

      // If the audio context creation still failed, set using web audio to false.
      if (!Howler.ctx) {
        Howler.usingWebAudio = false;
      }

      // Check if a webview is being used on iOS8 or earlier (rather than the browser).
      // If it is, disable Web Audio as it causes crashing.
      var iOS = (/iP(hone|od|ad)/.test(Howler._navigator && Howler._navigator.platform));
      var appVersion = Howler._navigator && Howler._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/);
      var version = appVersion ? parseInt(appVersion[1], 10) : null;
      if (iOS && version && version < 9) {
        var safari = /safari/.test(Howler._navigator && Howler._navigator.userAgent.toLowerCase());
        if (Howler._navigator && Howler._navigator.standalone && !safari || Howler._navigator && !Howler._navigator.standalone && !safari) {
          Howler.usingWebAudio = false;
        }
      }

      // Create and expose the master GainNode when using Web Audio (useful for plugins or advanced usage).
      if (Howler.usingWebAudio) {
        Howler.masterGain = (typeof Howler.ctx.createGain === 'undefined') ? Howler.ctx.createGainNode() : Howler.ctx.createGain();
        Howler.masterGain.gain.setValueAtTime(Howler._muted ? 0 : 1, Howler.ctx.currentTime);
        Howler.masterGain.connect(Howler.ctx.destination);
      }

      // Re-run the setup on Howler.
      Howler._setup();
    };

    // Add support for CommonJS libraries such as browserify.
    {
      exports.Howler = Howler;
      exports.Howl = Howl;
    }

    // Define globally in case AMD is not available or unused.
    if (typeof window !== 'undefined') {
      window.HowlerGlobal = HowlerGlobal;
      window.Howler = Howler;
      window.Howl = Howl;
      window.Sound = Sound;
    } else if (typeof commonjsGlobal !== 'undefined') { // Add to global in Node.js (for testing, etc).
      commonjsGlobal.HowlerGlobal = HowlerGlobal;
      commonjsGlobal.Howler = Howler;
      commonjsGlobal.Howl = Howl;
      commonjsGlobal.Sound = Sound;
    }
  })();


  /*!
   *  Spatial Plugin - Adds support for stereo and 3D audio where Web Audio is supported.
   *  
   *  howler.js v2.1.2
   *  howlerjs.com
   *
   *  (c) 2013-2019, James Simpson of GoldFire Studios
   *  goldfirestudios.com
   *
   *  MIT License
   */

  (function() {

    // Setup default properties.
    HowlerGlobal.prototype._pos = [0, 0, 0];
    HowlerGlobal.prototype._orientation = [0, 0, -1, 0, 1, 0];

    /** Global Methods **/
    /***************************************************************************/

    /**
     * Helper method to update the stereo panning position of all current Howls.
     * Future Howls will not use this value unless explicitly set.
     * @param  {Number} pan A value of -1.0 is all the way left and 1.0 is all the way right.
     * @return {Howler/Number}     Self or current stereo panning value.
     */
    HowlerGlobal.prototype.stereo = function(pan) {
      var self = this;

      // Stop right here if not using Web Audio.
      if (!self.ctx || !self.ctx.listener) {
        return self;
      }

      // Loop through all Howls and update their stereo panning.
      for (var i=self._howls.length-1; i>=0; i--) {
        self._howls[i].stereo(pan);
      }

      return self;
    };

    /**
     * Get/set the position of the listener in 3D cartesian space. Sounds using
     * 3D position will be relative to the listener's position.
     * @param  {Number} x The x-position of the listener.
     * @param  {Number} y The y-position of the listener.
     * @param  {Number} z The z-position of the listener.
     * @return {Howler/Array}   Self or current listener position.
     */
    HowlerGlobal.prototype.pos = function(x, y, z) {
      var self = this;

      // Stop right here if not using Web Audio.
      if (!self.ctx || !self.ctx.listener) {
        return self;
      }

      // Set the defaults for optional 'y' & 'z'.
      y = (typeof y !== 'number') ? self._pos[1] : y;
      z = (typeof z !== 'number') ? self._pos[2] : z;

      if (typeof x === 'number') {
        self._pos = [x, y, z];

        if (typeof self.ctx.listener.positionX !== 'undefined') {
          self.ctx.listener.positionX.setTargetAtTime(self._pos[0], Howler.ctx.currentTime, 0.1);
          self.ctx.listener.positionY.setTargetAtTime(self._pos[1], Howler.ctx.currentTime, 0.1);
          self.ctx.listener.positionZ.setTargetAtTime(self._pos[2], Howler.ctx.currentTime, 0.1);
        } else {
          self.ctx.listener.setPosition(self._pos[0], self._pos[1], self._pos[2]);
        }
      } else {
        return self._pos;
      }

      return self;
    };

    /**
     * Get/set the direction the listener is pointing in the 3D cartesian space.
     * A front and up vector must be provided. The front is the direction the
     * face of the listener is pointing, and up is the direction the top of the
     * listener is pointing. Thus, these values are expected to be at right angles
     * from each other.
     * @param  {Number} x   The x-orientation of the listener.
     * @param  {Number} y   The y-orientation of the listener.
     * @param  {Number} z   The z-orientation of the listener.
     * @param  {Number} xUp The x-orientation of the top of the listener.
     * @param  {Number} yUp The y-orientation of the top of the listener.
     * @param  {Number} zUp The z-orientation of the top of the listener.
     * @return {Howler/Array}     Returns self or the current orientation vectors.
     */
    HowlerGlobal.prototype.orientation = function(x, y, z, xUp, yUp, zUp) {
      var self = this;

      // Stop right here if not using Web Audio.
      if (!self.ctx || !self.ctx.listener) {
        return self;
      }

      // Set the defaults for optional 'y' & 'z'.
      var or = self._orientation;
      y = (typeof y !== 'number') ? or[1] : y;
      z = (typeof z !== 'number') ? or[2] : z;
      xUp = (typeof xUp !== 'number') ? or[3] : xUp;
      yUp = (typeof yUp !== 'number') ? or[4] : yUp;
      zUp = (typeof zUp !== 'number') ? or[5] : zUp;

      if (typeof x === 'number') {
        self._orientation = [x, y, z, xUp, yUp, zUp];

        if (typeof self.ctx.listener.forwardX !== 'undefined') {
          self.ctx.listener.forwardX.setTargetAtTime(x, Howler.ctx.currentTime, 0.1);
          self.ctx.listener.forwardY.setTargetAtTime(y, Howler.ctx.currentTime, 0.1);
          self.ctx.listener.forwardZ.setTargetAtTime(z, Howler.ctx.currentTime, 0.1);
          self.ctx.listener.upX.setTargetAtTime(x, Howler.ctx.currentTime, 0.1);
          self.ctx.listener.upY.setTargetAtTime(y, Howler.ctx.currentTime, 0.1);
          self.ctx.listener.upZ.setTargetAtTime(z, Howler.ctx.currentTime, 0.1);
        } else {
          self.ctx.listener.setOrientation(x, y, z, xUp, yUp, zUp);
        }
      } else {
        return or;
      }

      return self;
    };

    /** Group Methods **/
    /***************************************************************************/

    /**
     * Add new properties to the core init.
     * @param  {Function} _super Core init method.
     * @return {Howl}
     */
    Howl.prototype.init = (function(_super) {
      return function(o) {
        var self = this;

        // Setup user-defined default properties.
        self._orientation = o.orientation || [1, 0, 0];
        self._stereo = o.stereo || null;
        self._pos = o.pos || null;
        self._pannerAttr = {
          coneInnerAngle: typeof o.coneInnerAngle !== 'undefined' ? o.coneInnerAngle : 360,
          coneOuterAngle: typeof o.coneOuterAngle !== 'undefined' ? o.coneOuterAngle : 360,
          coneOuterGain: typeof o.coneOuterGain !== 'undefined' ? o.coneOuterGain : 0,
          distanceModel: typeof o.distanceModel !== 'undefined' ? o.distanceModel : 'inverse',
          maxDistance: typeof o.maxDistance !== 'undefined' ? o.maxDistance : 10000,
          panningModel: typeof o.panningModel !== 'undefined' ? o.panningModel : 'HRTF',
          refDistance: typeof o.refDistance !== 'undefined' ? o.refDistance : 1,
          rolloffFactor: typeof o.rolloffFactor !== 'undefined' ? o.rolloffFactor : 1
        };

        // Setup event listeners.
        self._onstereo = o.onstereo ? [{fn: o.onstereo}] : [];
        self._onpos = o.onpos ? [{fn: o.onpos}] : [];
        self._onorientation = o.onorientation ? [{fn: o.onorientation}] : [];

        // Complete initilization with howler.js core's init function.
        return _super.call(this, o);
      };
    })(Howl.prototype.init);

    /**
     * Get/set the stereo panning of the audio source for this sound or all in the group.
     * @param  {Number} pan  A value of -1.0 is all the way left and 1.0 is all the way right.
     * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
     * @return {Howl/Number}    Returns self or the current stereo panning value.
     */
    Howl.prototype.stereo = function(pan, id) {
      var self = this;

      // Stop right here if not using Web Audio.
      if (!self._webAudio) {
        return self;
      }

      // If the sound hasn't loaded, add it to the load queue to change stereo pan when capable.
      if (self._state !== 'loaded') {
        self._queue.push({
          event: 'stereo',
          action: function() {
            self.stereo(pan, id);
          }
        });

        return self;
      }

      // Check for PannerStereoNode support and fallback to PannerNode if it doesn't exist.
      var pannerType = (typeof Howler.ctx.createStereoPanner === 'undefined') ? 'spatial' : 'stereo';

      // Setup the group's stereo panning if no ID is passed.
      if (typeof id === 'undefined') {
        // Return the group's stereo panning if no parameters are passed.
        if (typeof pan === 'number') {
          self._stereo = pan;
          self._pos = [pan, 0, 0];
        } else {
          return self._stereo;
        }
      }

      // Change the streo panning of one or all sounds in group.
      var ids = self._getSoundIds(id);
      for (var i=0; i<ids.length; i++) {
        // Get the sound.
        var sound = self._soundById(ids[i]);

        if (sound) {
          if (typeof pan === 'number') {
            sound._stereo = pan;
            sound._pos = [pan, 0, 0];

            if (sound._node) {
              // If we are falling back, make sure the panningModel is equalpower.
              sound._pannerAttr.panningModel = 'equalpower';

              // Check if there is a panner setup and create a new one if not.
              if (!sound._panner || !sound._panner.pan) {
                setupPanner(sound, pannerType);
              }

              if (pannerType === 'spatial') {
                if (typeof sound._panner.positionX !== 'undefined') {
                  sound._panner.positionX.setValueAtTime(pan, Howler.ctx.currentTime);
                  sound._panner.positionY.setValueAtTime(0, Howler.ctx.currentTime);
                  sound._panner.positionZ.setValueAtTime(0, Howler.ctx.currentTime);
                } else {
                  sound._panner.setPosition(pan, 0, 0);
                }
              } else {
                sound._panner.pan.setValueAtTime(pan, Howler.ctx.currentTime);
              }
            }

            self._emit('stereo', sound._id);
          } else {
            return sound._stereo;
          }
        }
      }

      return self;
    };

    /**
     * Get/set the 3D spatial position of the audio source for this sound or group relative to the global listener.
     * @param  {Number} x  The x-position of the audio source.
     * @param  {Number} y  The y-position of the audio source.
     * @param  {Number} z  The z-position of the audio source.
     * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
     * @return {Howl/Array}    Returns self or the current 3D spatial position: [x, y, z].
     */
    Howl.prototype.pos = function(x, y, z, id) {
      var self = this;

      // Stop right here if not using Web Audio.
      if (!self._webAudio) {
        return self;
      }

      // If the sound hasn't loaded, add it to the load queue to change position when capable.
      if (self._state !== 'loaded') {
        self._queue.push({
          event: 'pos',
          action: function() {
            self.pos(x, y, z, id);
          }
        });

        return self;
      }

      // Set the defaults for optional 'y' & 'z'.
      y = (typeof y !== 'number') ? 0 : y;
      z = (typeof z !== 'number') ? -0.5 : z;

      // Setup the group's spatial position if no ID is passed.
      if (typeof id === 'undefined') {
        // Return the group's spatial position if no parameters are passed.
        if (typeof x === 'number') {
          self._pos = [x, y, z];
        } else {
          return self._pos;
        }
      }

      // Change the spatial position of one or all sounds in group.
      var ids = self._getSoundIds(id);
      for (var i=0; i<ids.length; i++) {
        // Get the sound.
        var sound = self._soundById(ids[i]);

        if (sound) {
          if (typeof x === 'number') {
            sound._pos = [x, y, z];

            if (sound._node) {
              // Check if there is a panner setup and create a new one if not.
              if (!sound._panner || sound._panner.pan) {
                setupPanner(sound, 'spatial');
              }

              if (typeof sound._panner.positionX !== 'undefined') {
                sound._panner.positionX.setValueAtTime(x, Howler.ctx.currentTime);
                sound._panner.positionY.setValueAtTime(y, Howler.ctx.currentTime);
                sound._panner.positionZ.setValueAtTime(z, Howler.ctx.currentTime);
              } else {
                sound._panner.setPosition(x, y, z);
              }
            }

            self._emit('pos', sound._id);
          } else {
            return sound._pos;
          }
        }
      }

      return self;
    };

    /**
     * Get/set the direction the audio source is pointing in the 3D cartesian coordinate
     * space. Depending on how direction the sound is, based on the `cone` attributes,
     * a sound pointing away from the listener can be quiet or silent.
     * @param  {Number} x  The x-orientation of the source.
     * @param  {Number} y  The y-orientation of the source.
     * @param  {Number} z  The z-orientation of the source.
     * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
     * @return {Howl/Array}    Returns self or the current 3D spatial orientation: [x, y, z].
     */
    Howl.prototype.orientation = function(x, y, z, id) {
      var self = this;

      // Stop right here if not using Web Audio.
      if (!self._webAudio) {
        return self;
      }

      // If the sound hasn't loaded, add it to the load queue to change orientation when capable.
      if (self._state !== 'loaded') {
        self._queue.push({
          event: 'orientation',
          action: function() {
            self.orientation(x, y, z, id);
          }
        });

        return self;
      }

      // Set the defaults for optional 'y' & 'z'.
      y = (typeof y !== 'number') ? self._orientation[1] : y;
      z = (typeof z !== 'number') ? self._orientation[2] : z;

      // Setup the group's spatial orientation if no ID is passed.
      if (typeof id === 'undefined') {
        // Return the group's spatial orientation if no parameters are passed.
        if (typeof x === 'number') {
          self._orientation = [x, y, z];
        } else {
          return self._orientation;
        }
      }

      // Change the spatial orientation of one or all sounds in group.
      var ids = self._getSoundIds(id);
      for (var i=0; i<ids.length; i++) {
        // Get the sound.
        var sound = self._soundById(ids[i]);

        if (sound) {
          if (typeof x === 'number') {
            sound._orientation = [x, y, z];

            if (sound._node) {
              // Check if there is a panner setup and create a new one if not.
              if (!sound._panner) {
                // Make sure we have a position to setup the node with.
                if (!sound._pos) {
                  sound._pos = self._pos || [0, 0, -0.5];
                }

                setupPanner(sound, 'spatial');
              }

              if (typeof sound._panner.orientationX !== 'undefined') {
                sound._panner.orientationX.setValueAtTime(x, Howler.ctx.currentTime);
                sound._panner.orientationY.setValueAtTime(y, Howler.ctx.currentTime);
                sound._panner.orientationZ.setValueAtTime(z, Howler.ctx.currentTime);
              } else {
                sound._panner.setOrientation(x, y, z);
              }
            }

            self._emit('orientation', sound._id);
          } else {
            return sound._orientation;
          }
        }
      }

      return self;
    };

    /**
     * Get/set the panner node's attributes for a sound or group of sounds.
     * This method can optionall take 0, 1 or 2 arguments.
     *   pannerAttr() -> Returns the group's values.
     *   pannerAttr(id) -> Returns the sound id's values.
     *   pannerAttr(o) -> Set's the values of all sounds in this Howl group.
     *   pannerAttr(o, id) -> Set's the values of passed sound id.
     *
     *   Attributes:
     *     coneInnerAngle - (360 by default) A parameter for directional audio sources, this is an angle, in degrees,
     *                      inside of which there will be no volume reduction.
     *     coneOuterAngle - (360 by default) A parameter for directional audio sources, this is an angle, in degrees,
     *                      outside of which the volume will be reduced to a constant value of `coneOuterGain`.
     *     coneOuterGain - (0 by default) A parameter for directional audio sources, this is the gain outside of the
     *                     `coneOuterAngle`. It is a linear value in the range `[0, 1]`.
     *     distanceModel - ('inverse' by default) Determines algorithm used to reduce volume as audio moves away from
     *                     listener. Can be `linear`, `inverse` or `exponential.
     *     maxDistance - (10000 by default) The maximum distance between source and listener, after which the volume
     *                   will not be reduced any further.
     *     refDistance - (1 by default) A reference distance for reducing volume as source moves further from the listener.
     *                   This is simply a variable of the distance model and has a different effect depending on which model
     *                   is used and the scale of your coordinates. Generally, volume will be equal to 1 at this distance.
     *     rolloffFactor - (1 by default) How quickly the volume reduces as source moves from listener. This is simply a
     *                     variable of the distance model and can be in the range of `[0, 1]` with `linear` and `[0, ∞]`
     *                     with `inverse` and `exponential`.
     *     panningModel - ('HRTF' by default) Determines which spatialization algorithm is used to position audio.
     *                     Can be `HRTF` or `equalpower`.
     *
     * @return {Howl/Object} Returns self or current panner attributes.
     */
    Howl.prototype.pannerAttr = function() {
      var self = this;
      var args = arguments;
      var o, id, sound;

      // Stop right here if not using Web Audio.
      if (!self._webAudio) {
        return self;
      }

      // Determine the values based on arguments.
      if (args.length === 0) {
        // Return the group's panner attribute values.
        return self._pannerAttr;
      } else if (args.length === 1) {
        if (typeof args[0] === 'object') {
          o = args[0];

          // Set the grou's panner attribute values.
          if (typeof id === 'undefined') {
            if (!o.pannerAttr) {
              o.pannerAttr = {
                coneInnerAngle: o.coneInnerAngle,
                coneOuterAngle: o.coneOuterAngle,
                coneOuterGain: o.coneOuterGain,
                distanceModel: o.distanceModel,
                maxDistance: o.maxDistance,
                refDistance: o.refDistance,
                rolloffFactor: o.rolloffFactor,
                panningModel: o.panningModel
              };
            }

            self._pannerAttr = {
              coneInnerAngle: typeof o.pannerAttr.coneInnerAngle !== 'undefined' ? o.pannerAttr.coneInnerAngle : self._coneInnerAngle,
              coneOuterAngle: typeof o.pannerAttr.coneOuterAngle !== 'undefined' ? o.pannerAttr.coneOuterAngle : self._coneOuterAngle,
              coneOuterGain: typeof o.pannerAttr.coneOuterGain !== 'undefined' ? o.pannerAttr.coneOuterGain : self._coneOuterGain,
              distanceModel: typeof o.pannerAttr.distanceModel !== 'undefined' ? o.pannerAttr.distanceModel : self._distanceModel,
              maxDistance: typeof o.pannerAttr.maxDistance !== 'undefined' ? o.pannerAttr.maxDistance : self._maxDistance,
              refDistance: typeof o.pannerAttr.refDistance !== 'undefined' ? o.pannerAttr.refDistance : self._refDistance,
              rolloffFactor: typeof o.pannerAttr.rolloffFactor !== 'undefined' ? o.pannerAttr.rolloffFactor : self._rolloffFactor,
              panningModel: typeof o.pannerAttr.panningModel !== 'undefined' ? o.pannerAttr.panningModel : self._panningModel
            };
          }
        } else {
          // Return this sound's panner attribute values.
          sound = self._soundById(parseInt(args[0], 10));
          return sound ? sound._pannerAttr : self._pannerAttr;
        }
      } else if (args.length === 2) {
        o = args[0];
        id = parseInt(args[1], 10);
      }

      // Update the values of the specified sounds.
      var ids = self._getSoundIds(id);
      for (var i=0; i<ids.length; i++) {
        sound = self._soundById(ids[i]);

        if (sound) {
          // Merge the new values into the sound.
          var pa = sound._pannerAttr;
          pa = {
            coneInnerAngle: typeof o.coneInnerAngle !== 'undefined' ? o.coneInnerAngle : pa.coneInnerAngle,
            coneOuterAngle: typeof o.coneOuterAngle !== 'undefined' ? o.coneOuterAngle : pa.coneOuterAngle,
            coneOuterGain: typeof o.coneOuterGain !== 'undefined' ? o.coneOuterGain : pa.coneOuterGain,
            distanceModel: typeof o.distanceModel !== 'undefined' ? o.distanceModel : pa.distanceModel,
            maxDistance: typeof o.maxDistance !== 'undefined' ? o.maxDistance : pa.maxDistance,
            refDistance: typeof o.refDistance !== 'undefined' ? o.refDistance : pa.refDistance,
            rolloffFactor: typeof o.rolloffFactor !== 'undefined' ? o.rolloffFactor : pa.rolloffFactor,
            panningModel: typeof o.panningModel !== 'undefined' ? o.panningModel : pa.panningModel
          };

          // Update the panner values or create a new panner if none exists.
          var panner = sound._panner;
          if (panner) {
            panner.coneInnerAngle = pa.coneInnerAngle;
            panner.coneOuterAngle = pa.coneOuterAngle;
            panner.coneOuterGain = pa.coneOuterGain;
            panner.distanceModel = pa.distanceModel;
            panner.maxDistance = pa.maxDistance;
            panner.refDistance = pa.refDistance;
            panner.rolloffFactor = pa.rolloffFactor;
            panner.panningModel = pa.panningModel;
          } else {
            // Make sure we have a position to setup the node with.
            if (!sound._pos) {
              sound._pos = self._pos || [0, 0, -0.5];
            }

            // Create a new panner node.
            setupPanner(sound, 'spatial');
          }
        }
      }

      return self;
    };

    /** Single Sound Methods **/
    /***************************************************************************/

    /**
     * Add new properties to the core Sound init.
     * @param  {Function} _super Core Sound init method.
     * @return {Sound}
     */
    Sound.prototype.init = (function(_super) {
      return function() {
        var self = this;
        var parent = self._parent;

        // Setup user-defined default properties.
        self._orientation = parent._orientation;
        self._stereo = parent._stereo;
        self._pos = parent._pos;
        self._pannerAttr = parent._pannerAttr;

        // Complete initilization with howler.js core Sound's init function.
        _super.call(this);

        // If a stereo or position was specified, set it up.
        if (self._stereo) {
          parent.stereo(self._stereo);
        } else if (self._pos) {
          parent.pos(self._pos[0], self._pos[1], self._pos[2], self._id);
        }
      };
    })(Sound.prototype.init);

    /**
     * Override the Sound.reset method to clean up properties from the spatial plugin.
     * @param  {Function} _super Sound reset method.
     * @return {Sound}
     */
    Sound.prototype.reset = (function(_super) {
      return function() {
        var self = this;
        var parent = self._parent;

        // Reset all spatial plugin properties on this sound.
        self._orientation = parent._orientation;
        self._stereo = parent._stereo;
        self._pos = parent._pos;
        self._pannerAttr = parent._pannerAttr;

        // If a stereo or position was specified, set it up.
        if (self._stereo) {
          parent.stereo(self._stereo);
        } else if (self._pos) {
          parent.pos(self._pos[0], self._pos[1], self._pos[2], self._id);
        } else if (self._panner) {
          // Disconnect the panner.
          self._panner.disconnect(0);
          self._panner = undefined;
          parent._refreshBuffer(self);
        }

        // Complete resetting of the sound.
        return _super.call(this);
      };
    })(Sound.prototype.reset);

    /** Helper Methods **/
    /***************************************************************************/

    /**
     * Create a new panner node and save it on the sound.
     * @param  {Sound} sound Specific sound to setup panning on.
     * @param {String} type Type of panner to create: 'stereo' or 'spatial'.
     */
    var setupPanner = function(sound, type) {
      type = type || 'spatial';

      // Create the new panner node.
      if (type === 'spatial') {
        sound._panner = Howler.ctx.createPanner();
        sound._panner.coneInnerAngle = sound._pannerAttr.coneInnerAngle;
        sound._panner.coneOuterAngle = sound._pannerAttr.coneOuterAngle;
        sound._panner.coneOuterGain = sound._pannerAttr.coneOuterGain;
        sound._panner.distanceModel = sound._pannerAttr.distanceModel;
        sound._panner.maxDistance = sound._pannerAttr.maxDistance;
        sound._panner.refDistance = sound._pannerAttr.refDistance;
        sound._panner.rolloffFactor = sound._pannerAttr.rolloffFactor;
        sound._panner.panningModel = sound._pannerAttr.panningModel;

        if (typeof sound._panner.positionX !== 'undefined') {
          sound._panner.positionX.setValueAtTime(sound._pos[0], Howler.ctx.currentTime);
          sound._panner.positionY.setValueAtTime(sound._pos[1], Howler.ctx.currentTime);
          sound._panner.positionZ.setValueAtTime(sound._pos[2], Howler.ctx.currentTime);
        } else {
          sound._panner.setPosition(sound._pos[0], sound._pos[1], sound._pos[2]);
        }

        if (typeof sound._panner.orientationX !== 'undefined') {
          sound._panner.orientationX.setValueAtTime(sound._orientation[0], Howler.ctx.currentTime);
          sound._panner.orientationY.setValueAtTime(sound._orientation[1], Howler.ctx.currentTime);
          sound._panner.orientationZ.setValueAtTime(sound._orientation[2], Howler.ctx.currentTime);
        } else {
          sound._panner.setOrientation(sound._orientation[0], sound._orientation[1], sound._orientation[2]);
        }
      } else {
        sound._panner = Howler.ctx.createStereoPanner();
        sound._panner.pan.setValueAtTime(sound._stereo, Howler.ctx.currentTime);
      }

      sound._panner.connect(sound._node);

      // Update the connections.
      if (!sound._paused) {
        sound._parent.pause(sound._id, true).play(sound._id, true);
      }
    };
  })();
  });
  var howler_1 = howler.Howler;
  var howler_2 = howler.Howl;

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
  			add_location(use, file, 12, 2, 231);
  			attr(g, "transform", g_transform_value = `translate(100, ${ctx.$posY})`);
  			add_location(g, file, 11, 0, 186);
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

    let cycle = ['#idle', '#running'];
    let current = 0;

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
  			add_location(path0, file$2, 100, 8, 2504);
  			attr(pattern0, "id", "smallGrid");
  			attr(pattern0, "width", "50");
  			attr(pattern0, "height", "50");
  			attr(pattern0, "patternUnits", "userSpaceOnUse");
  			add_location(pattern0, file$2, 99, 6, 2418);
  			attr(rect, "width", "100");
  			attr(rect, "height", "100");
  			attr(rect, "fill", "url(#smallGrid)");
  			add_location(rect, file$2, 103, 8, 2685);
  			attr(path1, "d", "M 100 0 L 0 0 0 100");
  			attr(path1, "fill", "none");
  			attr(path1, "stroke", "gray");
  			attr(path1, "stroke-width", "1");
  			add_location(path1, file$2, 104, 8, 2749);
  			attr(pattern1, "id", "grid");
  			attr(pattern1, "width", "100");
  			attr(pattern1, "height", "100");
  			attr(pattern1, "patternUnits", "userSpaceOnUse");
  			add_location(pattern1, file$2, 102, 6, 2602);
  			add_location(defs, file$2, 98, 4, 2405);
  			attr(g, "transform", g_transform_value = `translate(${-ctx.$posX}, 805), scale(4,4)`);
  			add_location(g, file$2, 110, 4, 2990);
  			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
  			attr(svg, "class", "w-screen h-screen");
  			attr(svg, "viewBox", svg_viewBox_value = `0 0 ${ctx.width || 0} ${ctx.height || 0}`);
  			attr(svg, "shape-rendering", "crispEdges");
  			add_location(svg, file$2, 96, 2, 2259);
  			div.className = "flex items-center justify-center h-screen bg-gray-200";
  			add_location(div, file$2, 95, 0, 2189);

  			dispose = [
  				listen(window, "keydown", ctx.handleKeydown),
  				listen(window, "keyup", ctx.handleKeyup),
  				listen(window, "click", ctx.handleKeydown),
  				listen(window, "touchstart", ctx.handleKeydown),
  				listen(window, "touchend", ctx.handleKeyup),
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

  			if ((!current || changed.width || changed.height) && svg_viewBox_value !== (svg_viewBox_value = `0 0 ${ctx.width || 0} ${ctx.height || 0}`)) {
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

  let jumpsLimit = 2;

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

    let canJump = true;
    let jumpsCount = 0;

    let disableClick = false;

    $posY = floorY; posY.set($posY);

    const soundJump = new howler_2({
        src: ['/assets/footstep05.ogg'],
        volume: 0.2,
    });

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
            $$invalidate('jumpsCount', jumpsCount = 0);
        }
        $$invalidate('prevTime', prevTime = timestamp);
        requestAnimationFrame(render);
    };

    requestAnimationFrame(render);

    const handleKeydown = (e) => {
        if (e.type === 'touchstart') $$invalidate('disableClick', disableClick = true);
        if (e.type === 'click' && disableClick) return;

        if (!canJump) return;
        if (jumpsCount >= jumpsLimit) return;

        if (e.type === 'touchstart' || e.type === 'click' || e.code === 'Space') {
            $$invalidate('speedVector', speedVector = $jumpVector);
            $$invalidate('jumpsCount', jumpsCount = jumpsCount + 1);
            $$invalidate('prevTime', prevTime = 0);
            $$invalidate('canJump', canJump = false);
            soundJump.play();
        }
        if (e.type === 'click') {
            $$invalidate('canJump', canJump = true);
        }
    };
    const handleKeyup = (e) => {
        $$invalidate('canJump', canJump = true);
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
  		handleKeyup,
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
  	var div0, t0, div1, button, small, t1_value = ctx.$frameLength.toFixed(0), t1, t2, svg, path, t3, audio0, source0, t4, audio1, source1, t5, main, t6, t7, current, dispose;

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
  			audio0 = element("audio");
  			source0 = element("source");
  			t4 = space();
  			audio1 = element("audio");
  			source1 = element("source");
  			t5 = space();
  			main = element("main");
  			router.$$.fragment.c();
  			t6 = space();
  			settings.$$.fragment.c();
  			t7 = space();
  			dyno.$$.fragment.c();
  			set_style(div0, "display", "none");
  			add_location(div0, file$4, 37, 0, 1273);
  			add_location(small, file$4, 43, 2, 1453);
  			attr(path, "class", "heroicon-ui");
  			attr(path, "d", "M9 4.58V4c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2v.58a8 8 0 0 1 1.92 1.11l.5-.29a2 2 0 0 1 2.74.73l1 1.74a2 2 0 0 1-.73 2.73l-.5.29a8.06 8.06 0 0 1 0 2.22l.5.3a2 2 0 0 1 .73 2.72l-1 1.74a2 2 0 0 1-2.73.73l-.5-.3A8 8 0 0 1 15 19.43V20a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-.58a8 8 0 0 1-1.92-1.11l-.5.29a2 2 0 0 1-2.74-.73l-1-1.74a2 2 0 0 1 .73-2.73l.5-.29a8.06 8.06 0 0 1 0-2.22l-.5-.3a2 2 0 0 1-.73-2.72l1-1.74a2 2 0 0 1 2.73-.73l.5.3A8 8 0 0 1 9 4.57zM7.88 7.64l-.54.51-1.77-1.02-1 1.74 1.76 1.01-.17.73a6.02 6.02 0 0 0 0 2.78l.17.73-1.76 1.01 1 1.74 1.77-1.02.54.51a6 6 0 0 0 2.4 1.4l.72.2V20h2v-2.04l.71-.2a6 6 0 0 0 2.41-1.4l.54-.51 1.77 1.02 1-1.74-1.76-1.01.17-.73a6.02 6.02 0 0 0 0-2.78l-.17-.73 1.76-1.01-1-1.74-1.77 1.02-.54-.51a6 6 0 0 0-2.4-1.4l-.72-.2V4h-2v2.04l-.71.2a6 6 0 0 0-2.41 1.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z");
  			add_location(path, file$4, 44, 85, 1579);
  			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
  			attr(svg, "viewBox", "0 0 24 24");
  			attr(svg, "width", "24");
  			attr(svg, "height", "24");
  			add_location(svg, file$4, 44, 2, 1496);
  			button.className = "relative bg-transparent border ";
  			add_location(button, file$4, 39, 2, 1348);
  			div1.className = "absolute";
  			add_location(div1, file$4, 38, 0, 1323);
  			source0.src = "/assets/mp3/Jump3.mp3";
  			source0.type = "audio/mpeg";
  			add_location(source0, file$4, 49, 1, 2515);
  			audio0.preload = "auto";
  			add_location(audio0, file$4, 48, 0, 2491);
  			source1.src = "/assets/mp3/Hero_Hurt.mp3";
  			source1.type = "audio/mpeg";
  			add_location(source1, file$4, 52, 1, 2603);
  			audio1.preload = "auto";
  			add_location(audio1, file$4, 51, 0, 2579);
  			main.className = "overflow-hidden";
  			add_location(main, file$4, 54, 0, 2671);
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
  			insert(target, audio0, anchor);
  			append(audio0, source0);
  			insert(target, t4, anchor);
  			insert(target, audio1, anchor);
  			append(audio1, source1);
  			insert(target, t5, anchor);
  			insert(target, main, anchor);
  			mount_component(router, main, null);
  			append(main, t6);
  			mount_component(settings, main, null);
  			append(main, t7);
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
  				detach(audio0);
  				detach(t4);
  				detach(audio1);
  				detach(t5);
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
