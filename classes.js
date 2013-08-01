/*global atom*/
//
// classes.js
// https://github-ca.corp.zynga.com/ccampbell/classes
// Author: Chris Campbell (@quaelin)
//
(function (atom, undef) {

	var
		ObjProto = Object.prototype,
		hasOwn = ObjProto.hasOwnProperty,
		typeUndef = 'undefined'
	;

	// Make a module
	var classes = (function (name) {
		var root = typeof window !== typeUndef ? window : global,
			had = hasOwn.call(root, name),
			prev = root[name], me = root[name] = {};
		if (typeof module !== typeUndef && module.exports) {
			module.exports = me;
		}
		me.noConflict = function () {
			if (root[name] === classes) {
				root[name] = had ? prev : undef;
				if (!had) {
					try {
						delete root[name];
					} catch (ex) {
					}
				}
			}
			return classes;
		};
		return me;
	}('classes'));

	classes.VERSION = '0.3.3';
	classes.atom = atom;


	// Convenience methods
	var isArray = Array.isArray || function (obj) {
		return ObjProto.toString.call(obj) === '[object Array]';
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
			if (hasOwn.call(exposed, p) && hasOwn.call(prot, p)) {
				exposed[p] = prot[p];
			}
		}
		return exposed;
	}
	function shallowCopy(item) {
		var copy = {};
		for (var p in item) {
			if (hasOwn.call(item, p)) {
				copy[p] = item[p];
			}
		}
		return copy;
	}


	// A `namespace` is the taxonomical scope within which classes are defined.
	// This allows us to instantiate different sets of classes from different
	// sources and avoid class-name space collisions.
	classes.namespace = function () {
		var
			a = atom(),
			each = a.each,
			get = a.get,
			need = a.need,
			once = a.once,
			set = a.set
		;
		function ancestors(list) {
			var anc = [], i = -1, len = list.length, item;
			while (++i < len) {
				item = list[i];
				anc = anc.concat(ancestors(get(item).extend));
				anc.push(item);
			}
			return anc;
		}
		var me = {


			// Define a class
			define: function (name, extend, func) {
				need(extend, function () {
					if (get(name)) {
						return;
					}
					var superNames = dedupe(ancestors(extend)), superClass,
						superClasses = get(superNames), i, len, p, exposed = {},
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
					set(name, {
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
				var classes = get(toArray(classOrList)), exposed = [], i = -1,
					len = classes.length;
				while (++i < len) {
					exposed.push(classes[i] && classes[i].exposed || undef);
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
				need(classOrList, function () {
					each(classOrList, function (name, cl) {
						var classNames = dedupe(ancestors(cl.extend)).concat([name]),
							classDef, classDefs = get(classNames),
							i = -1, len = classDefs.length, exposed = {},
							instantiator, thisInstance = {}, expose = exposer(exposed);
						while (++i < len) {
							classDef = classDefs[i];
							instantiator = classDef && classDef.singleton &&
								classDef.singleton.instance;
							if (instantiator) {
								instantiator(thisInstance, shallowCopy(thisInstance),
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
				once(classOrList, function () {
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
