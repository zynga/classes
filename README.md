**Please note:** This project is deprecated at Zynga and is no longer maintained.

---

Overview
========

`classes.js` provides a more traditional object oriented programming pattern
than JavaScript's native prototype chaining.

In many cases, this is overkill and a more procedural or functional approach is
actually more appropriate in JavaScript.  However, in some cases it is really
useful to have traditional OO features.


Features
========

 - Multiple inheritance
 - Namespaces
 - Static (class-level) methods vs. instance methods
 - Public, protected, and private levels of access
 - Works in browser, or in node
 - Only 5.5K (~1.8K minified)


Requires
========

Only dependency is [atom.js][atom], which is itself small and is included as a
submodule.


Install
=======

	npm install classes-js


Unit Tests
==========

To run from command line using node.js:

	npm install atom-js
	node test.js      // brief
	node test.js -v   // verbose

To run in a browser, open `test.html` or go
[here](http://zynga.github.io/classes/test.html).


Basic Example
=============

When defining a class, attach static methods to `thisClass`, and instance
methods to `thisInstance`.  Methods are *protected* by default, meaning they are
available to subclasses.

```js
	classes.define('myclass', ['base'], function (thisClass, protoClass) {

		thisClass.staticMethod = function () {
			// Do something that doesn't require access to instance data.
			// Optionally call protoClass.<method> to access methods of the base
			// class(es).
			return 'My Class is aw3s0m3!!1!';
		};

		thisClass.instance = function (thisInstance, protoInstance, expose) {

			// Private methods and data are just defined inside the instance
			// closure.
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
```


In the above example, 'base' will be used as superclass.  If 'base' is not already defined, then the
definition of 'myclass' will be delayed until 'base' gets defined.

Once a class is defined, instantiate it like this:

```js
	var instance = classes.instantiate('myclass');

	console.log(instance.publicMethod());
```


Output:

	"Here you go: My Class is aw3s0m3!!1! bar baz"


It is also possible to wait for a class to be defined:

```js
	classes.once('myclass', function (myclass) {
		var staticMessage = myclass.staticMethod();

		var instance = classes.instantiate('myclass');
		
		// ...
	});
```


Namespaces
==========

By default, classes are defined in a global namespace.  However, you can easily
create a new namespace if you want to ensure against class name collisions:

```js
	var myClassNamespace = classes.namespace();

	myClassNamespace.define('myclass', [], function (thisClass) {
		// ...
	});
```


Multiple Inheritance
====================

Multiple inheritance works by specifying an array of "superclasses" as the
second argument to `.define()`, like so:

```js
	classes.define(
		'myclass2',
		['superclass1', 'superclass2'],
		function (thisClass, protoClass) {
			// protoClass is now inherits all the protected and public members of
			// both superclass1 and superclass2.  In the case of conflicts, the
			// superclass specified *last* in the array wins.

			// ...
		}
	);
```


Inheriting Properties (Don't use primitives!)
=============================================

It is possible to attach properties (as opposed to functions) to a class or
instance.  However, *primitive* properties (simple string, number or boolean
values) are not recommended, because they will not stay in sync between class
and superclass.  Instead, use accessor functions, or set properties as on object
or array that may have mutable members.


[atom]: https://github.com/zynga/atom
