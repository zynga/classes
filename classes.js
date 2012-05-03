/*global atom, global, module*/
(function (atom) {

	// Make a module
	var classes = (function (name) {
		var root = typeof window !== 'undefined' ? window : global,
			had = Object.prototype.hasOwnProperty.call(root, name),
			prev = root[name], me = root[name] = {};
		if (typeof module !== 'undefined' && module.exports) {
			module.exports = me;
		}
		me.noConflict = function () {
			root[name] = had ? prev : undefined;
			if (!had) {
				try {
					delete root[name];
				} catch (ex) {
				}
			}
			return this;
		};
		return me;
	}('classes'));

	classes.VERSION = '0.1.3';


	// Convenience methods
	var isArray = Array.isArray || function (obj) {
		return Object.prototype.toString.call(obj) === '[object Array]';
	};
	function inArray(arr, value) {
		for (var i = arr.length; --i >= 0;) {
			if (arr[i] === value) {
				return true;
			}
		}
	}
	function toArray(obj) {
		return isArray(obj) ? obj : [obj];
	}
	function dedupe(list) {
		var uniques = [], i = -1, item, len = list.length;
		while (++i < len) {
			item = list[i];
			if (!inArray(uniques, item)) {
				uniques.push(item);
			}
		}
		return uniques;
	}
	function exposer(exposed) {
		return function expose() {
			for (var i = arguments.length; --i >= 0;) {
				var arr = toArray(arguments[i]);
				for (var j = arr.length; --j >= 0;) {
					exposed[arr[j]] = true;
				}
			}
		};
	}
	function resolve(exposed, prot) {
		for (var p in exposed) {
			if (exposed.hasOwnProperty(p) && prot.hasOwnProperty(p)) {
				exposed[p] = prot[p];
			}
		}
		return exposed;
	}
	function shallowCopy(item) {
		var copy = {};
		for (var p in item) {
			if (item.hasOwnProperty(p)) {
				copy[p] = item[p];
			}
		}
		return copy;
	}


	// A `namespace` is the taxonomical scope within which classes are defined.
	// This allows us to instantiate different sets of classes from different
	// sources and avoid class-name space collisions.
	classes.namespace = function () {
		var a = atom.create();
		function ancestors(list) {
			var anc = [], i = -1, len = list.length, item;
			while (++i < len) {
				item = list[i];
				anc = anc.concat(ancestors(a.get(item).extend));
				anc.push(item);
			}
			return anc;
		}
		var me = {


			// Define a class
			define: function (name, extend, func) {
				a.need(extend, function () {
					if (a.get(name)) {
						return;
					}
					var superNames = dedupe(ancestors(extend)), superClass,
						superClasses = a.get(superNames), i, len, p, exposed = {},
						superExposed, superSingleton, protoClass = {}, thisClass = {},
						expose = exposer(exposed);
					for (i = 0, len = superClasses.length; i < len; i++) {
						superClass = superClasses[i];
						superExposed = superClass.exposed;
						for (p in superExposed) {
							if (superExposed.hasOwnProperty(p)) {
								expose(p);
							}
						}
						superSingleton = superClass.singleton;
						for (p in superSingleton) {
							if (superSingleton.hasOwnProperty(p)) {
								thisClass[p] = protoClass[p] = superSingleton[p];
							}
						}
					}
					func(thisClass, protoClass, expose);
					expose('instance');
					a.set(name, {
						singleton: thisClass,
						exposed: resolve(exposed, thisClass),
						extend: extend
					});
				});
			},


			// Return the specified class objects.  Note that classes are not
			// defined until all of their prerequisites have been defined... So
			// unless you *know* your classes are defined, it is safer to use
			// `once()` intead.
			get: function (classOrList, func) {
				var classes = a.get(toArray(classOrList)), exposed = [], i = -1,
					len = classes.length;
				while (++i < len) {
					exposed.push(classes[i] && classes[i].exposed || undefined);
				}
				return func ? func.apply({}, exposed) :
					typeof classOrList === 'string' ? exposed[0] : exposed;
			},


			// Request instances of a class or classes.  If provided, `func` will
			// be called with the instances as args.  If all the necessary classes
			// have been defined, then the return value will also be the instance
			// (or array of instances) requested.
			instantiate: function (classOrList, func) {
				var instances = [];
				a.need(classOrList, function () {
					a.each(classOrList, function (name, cl) {
						var classNames = dedupe(ancestors(cl.extend)).concat([name]),
							classDef, classDefs = a.get(classNames), p,
							i = -1, len = classDefs.length, exposed = {},
							instanciator, thisInstance = {}, expose = exposer(exposed);
						while (++i < len) {
							classDef = classDefs[i];
							instanciator = classDef && classDef.singleton &&
								classDef.singleton.instance;
							if (instanciator) {
								instanciator(thisInstance, shallowCopy(thisInstance),
									expose);
							}
						}
						instances.push(resolve(exposed, thisInstance));
					});
					if (func) {
						func.apply({}, instances);
					}
				});
				return (instances.length === 1) ? instances[0] : instances;
			},


			// Call `func` as soon as all of the specified classes have been
			// defined.
			once: function (classOrList, func) {
				a.once(classOrList, function () {
					me.get(classOrList, func);
				});
			}

		};
		return me;
	};


	// Set up the default namespace
	var defaultNamespace = classes.namespace();
	classes.define = defaultNamespace.define;
	classes.get = defaultNamespace.get;
	classes.instantiate = defaultNamespace.instantiate;
	classes.once = defaultNamespace.once;

}(atom));
