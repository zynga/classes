OVERVIEW
========

Classes.js provides a more traditional object oriented programming pattern than
JavaScript's native prototype chaining method.


FEATURES
========

 - Multiple inheritance
 - Static (class-level) methods vs. instance methods
 - Public, protected, and private levels of access
 - Only 6.8K (1.8K minified)


REQUIRES
========

atom.js (included as a submodule)


UNIT TESTS
==========

	node classes-test.js      // brief
	node classes-test.js -v   // verbose


EXAMPLE
=======

When defining a class, attach static methods to thisClass, and instance
methods to thisInstance.  Methods are 'protected' by default, meaning they
are available to subclasses.

	classes.define('myclass', ['base'], function (thisClass, protoClass) {

		thisClass.staticMethod = function () {
			// Do something that doesn't require access to instance data.
			// Optionally call protoClass.<method> to access methods of the base
			// class(es).
			return 'My Class is aws0m3!!1!';
		};

		thisClass.instance = function (thisInstance, protoInstance, expose) {

			// Private methods and data are just defined inside the instance closure.
			var foo = 'bar';
			function privateMethod() {
				return foo + ' baz';
			}

			thisInstance.protectedMethod = function () {
				// Instance methods, since they are defined inside both the class
				// closure and the instance closure, have access to all private,
				// protected and public methods of both.
				return thisClass.staticMethod() + ' ' + privateMethod();
			};

			thisInstance.publicMethod = function () {
				// This function won't actually be exposed as part of the instance's
				// public interface until expose() is called.
				return 'Here you go: ' + thisInstance.protectedMethod();
			};

			expose('publicMethod');
		};

	});


Once a class is defined, invoke it like this:

	var instance = classes.instantiate('myclass');

	console.log(instance.publicMethod());

Output:

	"Here you go: My Class is aws0m3!!1! bar baz"
