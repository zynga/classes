/*global atom:true, classes:true, logger:true, process, require*/
atom = typeof atom === 'undefined' ? require('atom-js') : atom;
classes = typeof classes === 'undefined' ? require('./classes') : classes;
logger = (typeof logger !== 'undefined' && logger) || console.log;

var
	a = atom(),
	chain = a.chain,
	inBrowser = typeof document !== 'undefined',
	inNode = !inBrowser,
	argv = inNode && process.argv,
	arg2 = argv && argv.length > 2 && argv[2],
	verbose = inBrowser || arg2 === '-v',
	results = [],
	totals = { success: 0, fail: 0, total: 0 }
;

logger('classes ' + classes.VERSION);

function assert(msg, success) {
	totals.total++;
	if (success) {
		totals.success++;
		if (verbose) {
			logger(msg + '... success.');
		}
	} else {
		totals.fail++;
		logger(msg + '... FAIL!');
	}
}

function asyncTest(description, func) {
	var test = atom();
	chain(function (next) {
		try {
			func(function (result) {
				test.set('done', result);
			});
		} catch (ex) {
			test.set('error', ex);
			logger(ex + '');
		}
		setTimeout(function () {
			if (!test.has('done')) {
				test.set('error', 'timeout');
				logger('timeout');
			}
		}, 10000);
		test.once('error', function () {
			test.set('done');
		});
		test.once('done', function (result) {
			assert(description, result);
			next();
		});
	});
}

asyncTest(
	'Class properties not available unless explicitly exposed',
	function (done) {
		classes.define('a', [], function (thisClass, protoClass, expose) {
			thisClass.secretValue = 'secret';
			thisClass.exposedValue = 'fnord';
			expose('exposedValue');
		});
		var a = classes.get('a');
		done(a.secretValue === undefined && a.exposedValue === 'fnord');
	}
);

asyncTest(
	'Attempts to redefine a class are ignored, and leave the original class ' +
		'unaffected',
	function (done) {
		classes.define('a', [], function (thisClass, protoClass, expose) {
			thisClass.otherExposedValue = true;
			expose('otherExposedValue');
		});
		var a = classes.get('a');
		done(a.secretValue === undefined && a.exposedValue === 'fnord' &&
			!a.hasOwnProperty('otherExposedValue'));
	}
);

asyncTest(
	'If a class is defined with no prereqs, the class is available immediately',
	function (done) {
		classes.define('b', [], function (thisClass, protoClass, expose) {
			thisClass.value = 'B';
			expose('value');
		});
		done(classes.get('b').value === 'B');
	}
);

asyncTest(
	'If a class is defined with already-satisfied prereqs, the class is ' +
		'available immediately',
	function (done) {
		classes.define('c', ['a', 'b'], function (thisClass, protoClass, expose) {
			thisClass.value = 'C';
		});
		done(classes.get('c').value === 'C');
	}
);

asyncTest(
	'If a class is defined with unavailable prereqs, the class is NOT ' +
		'available immediately',
	function (done) {
		classes.define('e', ['d'], function (thisClass, protoClass, expose) {
			thisClass.value = 'E';
			expose('value');
		});
		done(classes.get('e') === undefined);
	}
);

asyncTest(
	'Once the prereqs for a previously defined class are available, the ' +
		'class becomes available',
	function (done) {
		classes.define('d', [], function () {
		});
		done(classes.get('e').value === 'E');
	}
);

asyncTest(
	'The once() method can be used to register a callback for when a class ' +
		'is ready',
	function (done) {
		var results = ['onceD'];
		classes.once('d', function () {
			results.push('gotD');
		});
		results.push('onceF');
		classes.once('f', function () {
			results.push('gotF');
		});
		classes.define('f', [], function (thisClass) {
			results.push('defineF');
			thisClass.getValue = function () {
				return 'F';
			};
		});
		done(results + '' === 'onceD,gotD,onceF,defineF,gotF');
	}
);

asyncTest(
	'Function defined in base class is callable from subclass constructor, ' +
		'both on thisClass and on protoClass',
	function (done) {
		classes.define('g', ['f'], function (thisClass, protoClass) {
			done(thisClass.getValue() === 'F' && protoClass.getValue() === 'F');
		});
	}
);

asyncTest(
	'Function defined in base class but overridden in subclass is available ' +
		'in its original form via protoClass',
	function (done) {
		classes.define('h', ['g'], function (thisClass, protoClass, expose) {
			thisClass.getValue = function () {
				return protoClass.getValue() + 'H';
			};
			expose('getValue');
		});
		done(classes.get('h').getValue() === 'FH');
	}
);

asyncTest(
	'Class can be instantiated even if it doesn\'t explicitly expose "instance"',
	function (done) {
		classes.instantiate('d', function (d) {
			done(d !== undefined);
		});
	}
);

asyncTest(
	'Instance properties not available unless explicitly exposed',
	function (done) {
		classes.define('i', [], function (thisClass) {
			thisClass.instance = function (thisInstance, protoInstance, expose) {
				thisInstance.secretValue = 'secret';
				thisInstance.exposedValue = 'fnord';
				expose('exposedValue');
			};
		});
		classes.instantiate('i', function (inst) {
			done(inst.secretValue === undefined && inst.exposedValue === 'fnord');
		});
	}
);

asyncTest(
	'instantiate() returns the requested instance, as long as the class and ' +
		'all prerequisites have been defined',
	function (done) {
		var i1, i2 = classes.instantiate('i', function (i) {
			i1 = i;
		});
		done(i1 === i2);
	}
);

asyncTest(
	'Two different instances of the same class share the class state, but ' +
		'have separate instance state',
	function (done) {
		classes.define('j', [], function (thisClass, protoClass, expose) {
			var classValue;
			thisClass.setValue = function (val) {
				classValue = val;
			};
			thisClass.instance = function (thisInstance, protoInstance, expose) {
				var counter = 0;
				thisInstance.getValue = function () {
					return classValue + (++counter);
				};
				expose('getValue');
			};
			expose('setValue');
		});
		classes.instantiate(['j', 'j'], function (j1, j2) {
			classes.get('j').setValue('foo');
			done(j1.getValue() === 'foo1' && j1.getValue() === 'foo2' &&
				j2.getValue() === 'foo1');
		});
	}
);

asyncTest(
	'When a subclass overrides an instance method, the superclass version ' +
		'of the method is available via protoInstance',
	function (done) {
		classes.define('k', ['j'], function (thisClass) {
			thisClass.instance = function (thisInstance, protoInstance, expose) {
				thisInstance.getValue = function () {
					return protoInstance.getValue() + 'sub';
				};
			};
		});
		classes.instantiate('k', function (k) {
			done(k.getValue() === 'foo1sub');
		});
	}
);

asyncTest(
	'When a class extends two superclasses that both implement a given ' +
		'class method, the rightmost superclass takes precedence',
	function (done) {
		classes.define('l', [], function (thisClass) {
			thisClass.someMethod = function () {
				return 'L';
			};
		});
		classes.define('m', [], function (thisClass) {
			thisClass.someMethod = function () {
				return 'M';
			};
		});
		classes.define('n', ['l', 'm'], function (thisClass) {
			done(thisClass.someMethod() === 'M');
		});
	}
);

asyncTest(
	'When a class extends two superclasses that both implement a given ' +
		'instance method, the rightmost superclass takes precedence',
	function (done) {
		classes.define('o', [], function (thisClass) {
			thisClass.instance = function (thisInstance) {
				thisInstance.someMethod = function () {
					return 'O';
				};
			};
		});
		classes.define('p', [], function (thisClass) {
			thisClass.instance = function (thisInstance) {
				thisInstance.someMethod = function () {
					return 'P';
				};
			};
		});
		classes.define('q', ['o', 'p'], function (thisClass) {
			thisClass.instance = function (thisInstance) {
				done(thisInstance.someMethod() === 'P');
			};
		});
		classes.instantiate('q', function (q) {
		});
	}
);

chain(function () {
	logger(totals);

	if (inNode) {
		process.exit(totals.fail ? 1 : 0);
	}
});
